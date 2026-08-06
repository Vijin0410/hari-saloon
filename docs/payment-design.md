# 支付集成设计方案

> 基于 `docs/hair-salon-saas-requirements.md`（第 13/14/19 章）与 `docs/hair-salon-implementation-plan.md` P5/P8。
> 最后更新: 2026-08-04

## 1. 设计目标与约束

| 约束 | 说明 |
|------|------|
| ❌ 不做服务商代理注册 | 平台不申请微信支付服务商 / 支付宝 ISV，不为商户进件 |
| ✅ 普通商户直连 API | 商户自行申请微信/支付宝商户号，提供开发参数，系统直接对接 |
| ✅ 持牌聚合支付 | 对接收钱吧/扫呗/富掌柜等，**通过拉取服务商交易流水做对账**（不做全链路下单） |
| ✅ 手动录入兜底 | 无任何渠道参数时，收银员手输金额确认 |

三类商户落到同一套收银流程，区别仅在该租户的支付配置走哪个渠道实现。

## 2. 三种支付模式总览

| 模式 | settle_type | 触发 | 对账依据 | 自动确认 |
|------|-------------|------|----------|---------|
| 普通商户直连 | `self_merchant` | 系统调渠道下单 API，码带订单号 | 渠道异步回调 + 主动查单 | ✅ 全自动 |
| 聚合支付拉单 | `aggregate_pull` | 商户用服务商固定码收款 | 定时拉服务商流水匹配订单 | 🟡 半自动（金额+时间匹配，歧义时收银员确认） |
| 手动录入 | `manual` | 收银员手输 | 无渠道流水 | ❌ 纯手工 |

支付流水的 `source` 字段统一标注确认来源：`realtime_callback` / `query_compensate` / `aggregate_pull` / `manual_input`，P8 财务对账按此区分口径。

---

## 3. 模式一：普通商户直连（self_merchant）

### 3.1 适用与前提

有营业执照的商户，自己在微信支付商户平台 / 支付宝开放平台申请商户号与应用，把开发参数填入租户支付配置。

### 3.2 需要商户提供的参数

| 渠道 | 参数 |
|------|------|
| 微信支付 V3 | `mch_id`、`api_v3_key`、商户证书序列号 `cert_serial_no`、商户私钥 `apiclient_key.pem`、（小程序/公众号场景）`appid` |
| 支付宝 | `appid`、应用私钥、支付宝公钥（或证书模式：应用证书、支付宝根证书、支付宝公钥证书） |

理发店收银台典型为 PC 扫码（微信 Native / 支付宝当面付预下单）或小程序（JSAPI）。

### 3.3 流程

```
订单创建(待支付) -> PayChannel.unifiedOrder() 预下单
  -> 返回 code_url / prepay_id -> 收银台展示二维码或拉起 JSAPI
  -> 顾客支付
  -> 渠道异步回调 /api/v1/pay/notify/{channel} (verifyNotify 验签)
     + 定时任务 query() 兜底丢失回调
  -> 更新订单已支付 -> 写 salon_pay_record(source=realtime_callback / query_compensate)
退款 -> P6 发起 -> PayChannel.refund() -> 退款回调 -> 更新退款单
```

### 3.4 关键点

- **回调统一路由 + 反查租户**：回调 URL 不带 tenant_id，从 `out_trade_no` 编码的租户标识反查，或微信用 `attach`、支付宝用 `passback_params`。
- **幂等**：按 `transaction_id` 幂等；`out_trade_no` 全局唯一索引。
- **查单兜底**：定时任务扫"已下单未支付且超时"订单调 `query()`，防止回调丢失卡死订单。

---

## 4. 模式二：聚合支付拉单对账（aggregate_pull）

### 4.1 适用与前提

商户已在用收钱吧/扫呗/富掌柜等聚合收款码（或愿意使用），平台对接服务商开放 API **拉取交易流水**做对账，不做下单调起。

> 选择"拉单对账"而非"全链路下单"的原因：对接浅、落地快，商户可继续用现有收款码不用换码。代价是订单匹配存在歧义（见 4.4）。

### 4.2 需要商户提供的参数

| 服务商 | 参数 |
|--------|------|
| 收钱吧 | 开放平台 `client_id` / `client_secret`、商户授权 `authorization_code`（或激活码）、`store_id` |
| 扫呗 / 富掌柜等 | 各自开放平台凭证 + 商户号 / 终端号 / 授权 token |

凭证加密入库（同 6.1）。

### 4.3 流程

```
订单创建(待支付) -> 商户用聚合固定码收款（系统不调起）
  -> 定时任务(每 N 分钟)调 PayAggregator.pullTransactions(from, to)
  -> 拉回流水写入 salon_agg_transaction
  -> 匹配引擎：将待支付订单与未匹配流水按规则匹配
     - 唯一命中 -> 自动确认订单 -> 写 salon_pay_record(source=aggregate_pull)
     - 多候选 / 模糊命中 -> 标记待确认，收银员在收银台选定
     - 无命中 -> 保持待支付，下一轮继续
对账(每日/每班次) -> 拉单流水 vs 系统订单比对 -> 输出漏单/多单差异
```

### 4.4 订单匹配策略与歧义缓解（核心难点）

聚合固定码不带订单号，流水只有金额、时间、支付方式。理发店同金额订单密集（洗剪吹统一价），"金额+时间"会撞单。

**匹配规则（按优先级）**：

1. **金额精确相等** + **时间窗口内**（如订单创建后 30 分钟）+ **同租户同门店** -> 候选集
2. 候选集唯一 -> 自动确认
3. 候选集多个 -> 标记 `pending_confirm`，收银台推送待确认列表，收银员人工指定
4. 候选集为空 -> 等下一轮拉单

**缓解歧义的运营手段**：

- **收银台"先选订单再收款"**：收银员先选中订单进入"收款中"状态（锁定金额 + 时间起点），缩小匹配窗口，降低撞单概率。
- **金额微调/备注引导**：非整数定价减少同金额概率（运营层面，非系统强制）。
- **升级为下单模式（可选）**：若某聚合服务商支持"订单码"（动态码带订单号，如收钱吧订单 API），对该服务商升级为全链路下单，消除歧义。架构上 `aggregate_pull` 与 `aggregate_order` 预留为两种 settle_type。

### 4.5 关键点

- **拉单幂等**：按服务商交易单号去重，同一笔流水只入库一次。
- **流水留痕**：`salon_agg_transaction` 保留原始流水，匹配过程记 `salon_pay_match_record`，可追溯。
- **时区与时间基准**：以服务商返回的支付完成时间为准，注意时区换算。
- **差异处理**：对账输出三类差异：①系统有订单无流水（漏收/未付）②系统无订单有流水（线下收款未开单）③金额不符。

---

## 5. 模式三：手动录入（manual）

### 5.1 适用

无任何渠道参数的商户兜底，或渠道异常时临时降级。

### 5.2 流程

```
订单创建(待支付) -> 收银员选"现金 / 微信(手动) / 支付宝(手动) / 其他"
  -> 手输实收金额 -> 确认订单已支付
  -> 写 salon_pay_record(source=manual_input, channel=manual_*)
```

### 5.3 关键点

- `channel` 标注 `manual_cash` / `manual_wxpay` / `manual_alipay` / `manual_other`，与渠道支付明确区分。
- 财务对账单列"手动录入支付"，无渠道流水可对，靠日结（P8）收银员对账。
- 可选校验：手输金额与应收金额不符时强提示或要求备注原因。

---

## 6. 渠道抽象设计（SPI）

### 6.1 接口

```java
/** 直连渠道（普通商户、聚合下单模式） */
public interface PayChannel {
    PayOrderResult unifiedOrder(PayRequest req, TenantPayConfig cfg);
    PayQueryResult query(String outTradeNo, TenantPayConfig cfg);
    RefundResult refund(RefundRequest req, TenantPayConfig cfg);
    boolean verifyNotify(Map<String, String> params, TenantPayConfig cfg);
    String parseOutTradeNo(Map<String, String> params);
}
// 实现：WxpaySelfChannel / AlipaySelfChannel（/ 聚合下单渠道）

/** 聚合拉单渠道 */
public interface PayAggregator {
    /** 按时间窗口拉取服务商交易流水 */
    List<AggTransaction> pullTransactions(LocalDateTime from, LocalDateTime to, TenantPayConfig cfg);
}
// 实现：ShouqianbaAggregator / SaibeAggregator / FuZhangGuiAggregator

/** 手动渠道 */
public interface ManualPay {
    void confirm(OrderPaymentManualForm form, Long orderId);
}
```

### 6.2 路由

```java
// 根据 settle_type 选策略
switch (cfg.getSettleType()) {
    case SELF_MERCHANT   -> payChannel.unifiedOrder(...);     // 直连下单
    case AGGREGATE_PULL  -> scheduler.pullAndMatch(tenantId); // 定时拉单匹配
    case MANUAL          -> manualPay.confirm(...);           // 手动
}
```

新增渠道（如再加一家聚合支付）只加 `PayAggregator` 实现，不改业务代码。

---

## 7. 数据模型

### 7.1 租户支付配置 `salon_tenant_pay_config`

| 字段 | 说明 |
|------|------|
| `tenant_id` | 租户 |
| `channel` | `wxpay` / `alipay` / `shouqianba` / `saibe` / `fuzhangui` / `manual` |
| `settle_type` | `self_merchant` / `aggregate_pull` / `manual` |
| `enabled` | 是否启用 |
| `sub_mch_id` 等 | 直连：`appid`/`mch_id`/`api_v3_key`(加密)/`cert_serial_no`；聚合：商户号/门店号/授权 token(加密) |
| `cert_object_key` | 证书文件存 MinIO 私有桶的 object_key（直连模式） |
| `pull_interval_sec` | 拉单间隔（聚合模式，如 120） |
| `status` | `pending` / `active` / `invalid` |

一个租户可配多条（如同时开通直连微信 + 聚合拉单 + 手动兜底，收银员选用）。

### 7.2 支付流水 `salon_pay_record`

| 字段 | 说明 |
|------|------|
| `tenant_id` | 租户 |
| `order_id` | 关联订单 |
| `refund_id` | 关联退款（退款时） |
| `channel` | 支付渠道 |
| `settle_type` | 结算模式 |
| `out_trade_no` | 系统单号（直连模式有，聚合/手动可空） |
| `transaction_id` | 渠道交易单号 |
| `amount` | 金额 |
| `status` | `pending` / `paid` / `refunded` / `failed` |
| `source` | `realtime_callback` / `query_compensate` / `aggregate_pull` / `manual_input` |
| `paid_at` | 支付完成时间 |
| `raw_payload` | 原始报文（留痕，JSON） |

### 7.3 聚合拉单流水 `salon_agg_transaction`

| 字段 | 说明 |
|------|------|
| `tenant_id` | 租户 |
| `agg_channel` | 聚合服务商 |
| `agg_transaction_no` | 服务商交易单号（去重键） |
| `pay_method` | 微信/支付宝/云闪付 |
| `amount` | 金额 |
| `paid_at` | 支付完成时间 |
| `match_status` | `unmatched` / `matched` / `pending_confirm` / `ignored` |
| `matched_pay_record_id` | 匹配上的支付流水 |
| `raw_payload` | 原始流水（留痕） |

### 7.4 匹配记录 `salon_pay_match_record`

| 字段 | 说明 |
|------|------|
| `tenant_id` | 租户 |
| `order_id` | 待支付订单 |
| `agg_transaction_id` | 候选流水 |
| `score` | 匹配置信度 |
| `status` | `auto_confirmed` / `pending_confirm` / `rejected` |
| `confirmed_by` | 人工确认人（pending_confirm 时） |

---

## 8. 关键技术点

| 事项 | 方案 |
|------|------|
| **密钥加密存储** | `api_v3_key`/`private_key`/聚合授权 token 用 AES/SM4 加密入库；证书文件走 MinIO 私有桶存 `object_key`。当前仓未接加密组件，渠道支付落地前先引入。 |
| **回调路由** | 统一 `POST /api/v1/pay/notify/{channel}`，公开免鉴权（加入 `jwt.ignore-urls`），靠 `out_trade_no`/`attach`/`passback_params` 反查租户与订单。 |
| **幂等防重** | 支付下单 `@PreventDuplicateResubmit` + `out_trade_no` 唯一索引；回调按 `transaction_id` 幂等；拉单按 `agg_transaction_no` 去重。 |
| **查单兜底** | 定时任务扫"已下单未支付且超时"订单调 `query()`，防回调丢失。 |
| **拉单定时任务** | Spring 托管线程池（禁 `new Thread`），按租户配置间隔并行拉单；拉单 + 匹配在同一事务内更新流水与订单状态。 |
| **可追溯** | 订单/支付/退款/拉单流水/匹配记录全部留痕（需求 24.4），`raw_payload` 存原始报文。 |
| **租户隔离** | 所有支付相关表继承 `BaseTenantEntity`，回调反查、拉单、对账强制带租户条件。 |
| **权限** | 支付配置管理 `biz:pay:config:*`；手动录入 `biz:pay:manual`；对账查看 `biz:pay:reconcile:view`（财务敏感，单独授权，见需求 23.5）。 |

---

## 9. 落地阶段建议

1. **P5 收银一期**：先做 `manual`（手动录入）+ 会员余额/卡项支付，跑通订单状态机与金额计算；`ManualPay` 占位。
2. **加密组件前置**：引入 AES/SM4 加密组件（与 form-sensitive-mask 对齐），渠道参数才能安全入库。
3. **直连渠道（self_merchant）**：先做微信 Native（PC 扫码）一家，跑通"下单-回调-查单-退款"全链路，再扩支付宝、JSAPI。
4. **聚合拉单（aggregate_pull）**：先对接一家（建议收钱吧，开放平台 API 相对完善），实现 `pullTransactions` + 匹配引擎 + 收银台待确认交互。
5. **对账（P8 联动）**：聚合拉单的对账差异报表纳入 P8 日结/财务导出。
6. **每加一家聚合服务商**：仅新增 `PayAggregator` 实现 + 字典项，不动核心流程。

---

## 10. 待确认问题

- [ ] 直连渠道一期先做微信还是支付宝？是否需要小程序 JSAPI（依赖小程序端进度，P11/暂缓）？
- [ ] 聚合支付首家对接选收钱吧 / 扫呗 / 富掌柜？（取决于目标商户现有用码习惯）
- [ ] 聚合拉单匹配"金额+时间"窗口设多少？撞单时强制人工确认还是允许置信度自动确认？
- [ ] 手动录入金额与应收不符时，强提示还是允许提交（需备注）？
- [ ] 退款对聚合拉单模式：聚合固定码无系统下单，退款是否仅做系统内账务退回（不调渠道）？需与商户退款流程对齐。
