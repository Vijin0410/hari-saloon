# P4 会员充值 + P5 收银开单一期 变更记录

> 落地日期：2026-08-24 ｜ 分支：`dev` ｜ 关联计划：`docs/hair-salon-implementation-plan.md` §P4/§P5
>
> 状态：**P4 ✅ 完成；P5 🔄 一期完成**（卡项核销 / 小票打印 / 优惠券未做，见「下一步」）

---

## 1. 提交批次清单

| 提交 | 模块 | 说明 |
|------|------|------|
| `e3ec4e7` | db | P4/P5 表结构与菜单重组种子 + 2 个存量库迁移脚本 |
| `17002c9` | system | 员工下拉 `GET /api/v1/users/options`（前后端） |
| `a7cd198` | biz | P4 会员充值后端（充值活动 / 充值订单 / 赠送解冻 / 等级升级） |
| `7254128` | biz | P5 收银开单后端（订单 / 明细 / 支付 / 结算） |
| `0db4d88` | web | P4 会员充值前端（充值活动页 / 充值记录页 / 会员充值弹窗） |
| `abe6cce` | web | P5 收银开单前端（收银台 / 支付弹窗 / 订单详情与记录 / 路由） |
| `270f442` | config | 字典表租户忽略 + 充值解冻任务配置 |
| 文档批次 | docs | 本变更记录 + 实施计划更新 + project_context 更新 |

**未纳入提交**（本地开发配置，仓库保持 8080）：`application.yml` 的 `server.port: 8081`、`vite.config.ts` 的 proxy 默认目标 `8081`。

---

## 2. 数据库变更

### 2.1 新表（5 张，`schema.sql` + `sql/migrate-p4-p5-recharge-order.sql` 幂等迁移）

| 表 | 说明 |
|----|------|
| `salon_recharge_activity` | 充值活动（租户级充 X 送 Y 档位：门槛/赠送/生效窗口/排序/启停） |
| `salon_recharge_order` | 充值订单（本金/赠送分记；`gift_source` 赠送来源；`gift_frozen`+`unfrozen_time` 次月解冻） |
| `salon_order` | 收银订单（挂单 status=0；金额链：item_amount → discount_amount → payable_amount → point_deduct → received → change） |
| `salon_order_item` | 订单明细（服务/商品快照：原单价/实际单价/行折扣率/小计；`staff_id`+`assistant_id` 服务人员绑定） |
| `salon_order_payment` | 支付明细（组合支付每方式一行；积分抵扣自动补 method=7 行） |

### 2.2 存量表变更

- `salon_member` 补 `total_recharge_amount`（累计充值，本金口径）/ `total_consume_amount`（累计消费，订单实收口径）
- `salon_member_level.upgrade_threshold` 口径注释更新：**max(累计充值, 累计消费) 达标即升，只升不降**

### 2.3 菜单与权限种子（`data.sql`，存量库跑 `sql/migrate-menu-restructure.sql` + `sql/migrate-p4-p5-recharge-order.sql`）

- **菜单重组**（强业务/弱配置分层）：会员信息 17（/member-info）> 会员管理 10；服务商品管理 18（/service-goods）> 服务项目 14 / 商品管理 16；门店管理 8（/store）> 门店列表 9；业务配置 19（/biz-config）> 会员等级 11 / 会员标签 12 / 服务分类 13 / 商品分类 15 / 充值活动 169；perm 全部不变
- **P4/P5 新菜单**：收银中心 20 > 收银开单 166（/biz/cashier）；充值记录 168（挂 17）；充值活动 169（挂 19）；按钮 181-185（`biz:order:list/view/add/pay/cancel`）、186-188（`biz:recharge:list/view/add`）、189-193（`biz:rechargeActivity:*`）
- **预置角色**：店长补收银/充值/充值活动全按钮；店员收银（无 cancel）+ 充值记录（无 add，充值涉资金由店长操作）
- **新字典**：`pay_method`（1现金 2微信 3支付宝 4银行卡 5会员余额 6赠送余额 7积分抵扣 8其他）、`order_status`（0挂单 1已支付 2部分退款 3已退款 4已取消）；均含租户 `2084880957290426370` 副本（id+1000，契约 value 不变）

---

## 3. 后端变更

### 3.1 system 模块（`17002c9`）

- `SysUserController` 新增 `GET /api/v1/users/options`（`isAuthenticated`），本租户启用用户，昵称空回落用户名——P5 开单选服务人员用

### 3.2 P4 会员充值（`a7cd198`）

- **充值活动** `RechargeActivity` 全套 CRUD（`page/options/{id}/form/add/{id}/update/{id}/status/delete`），MapStruct 转换，生效窗口过滤
- **充值订单** `RechargeOrderService`：
  - `preview(memberId, amount)` 赠送实时预览：活动门槛**最高档优先**命中；无活动走等级 `rechargeGiftRate` 兜底（向下取整到分）
  - `create()` 一事务内：建单 → 本金/赠送**分流水**（复用 `MemberAssetService.changeBalance`）→ 活动赠送冻结至次月（先入赠送桶再冻结，4 行流水可审计）→ 累计充值入账 → 升级检查
- **赠送解冻** `RechargeGiftUnfreezeJob`（默认每天 03:10，`wj.salon.recharge-unfreeze-*` 配置）：跨租户编排；单笔事务在**独立 `RechargeGiftUnfreezeExecutor` bean**——占坑与流水须同事务，同类自调用 `@Transactional` 失效
- **等级升级** `MemberLevelService.checkAndUpgrade(memberId)`：max(累计充值, 累计消费) vs 启用等级 `upgradeThreshold`，只升不降；P4 充值 / P5 支付完成事务内调用
- `SalonStorePermissionService` 补 `RechargeOrderPageQuery` / `OrderPageQuery` 分页门店范围过滤

### 3.3 P5 收银开单（`7254128`）

- **挂单/取单**：`savePending` / `updatePending`（仅挂单可改）/ `cancel`（仅挂单可取消）；挂单 = status 0 订单，非独立表；明细快照（名称/价格/行折扣率）
- **结算** `POST /{id}/pay`（两步结算：`add`/`update` 保存 → `pay` 结算）：
  - 条件更新占坑（`status 0→1`）**防并发重复结算**
  - 积分抵扣 100 分 = 1 元（常量 `POINTS_PER_YUAN`，P10 配置化）
  - 余额支付**先扣赠送再扣本金**（各桶独立流水；扣减顺序常量集中可切换）
  - 组合支付明细每方式一行；现金找零（投入 − 应收，≥0）
  - 商品库存**条件扣减**（`stock >= qty`）防超卖，不足阻断结算
  - 消费送积分（实收 × 等级 `pointRate` 向下取整）→ 累计消费 → 等级升级检查
- **金额全部服务端计算**，不信前端；行小计 = price × qty × 行折扣率（等级折扣按行，`discountable=0` 恒 1.00）
- `ServiceItemOptionVO` / `GoodsOptionVO` 补 `discountable`；`OrderItemVO` 补 `staffId`/`assistantId`（取单回填）；`OrderPageVO` 补 `payableAmount`

---

## 4. 前端变更

### 4.1 P4 充值（`0db4d88`）

- `features/recharge`：`rechargeTypes` + `rechargeSchemas`（react-hook-form + zod 双层校验）
- `RechargeActivityPage` 充值活动配置；`RechargeRecordPage` 充值记录（分页 + 详情）
- `rechargeApi`：活动 CRUD/options + 充值 `page/detail/preview/create`
- `MemberPage` 会员详情挂 `RechargeDialog`：活动档位快捷选择 + `preview` 赠送实时预览，成功后联动刷新余额

### 4.2 P5 收银（`abe6cce`）

- `CashierPage` / `CashierWorkbench` **三栏收银台**：会员搜索/挂单取单（左）+ 明细改价改量/选主服务人员与助理/备注（中）+ 服务/商品选品（右）
- `OrderPayDialog` 组合支付：多支付方式 + 积分抵扣 + 找零实时预览
- `OrderDetailDrawer` 订单详情（明细/支付，字典翻译）；`OrderRecords` 订单记录 tab
- `orderApi`：`page/detail/save/update/pay/cancel`；`goodsTypes`/`serviceTypes` 补 `discountable`
- `router` 新增 `/biz/cashier`、`/biz/recharges`、`/biz/recharge-activities`；`MainLayout` perm→路由 与 icon 映射（receipt/wallet/ticket/shopping-cart）

---

## 5. 已拍板业务决策（实现口径）

| 决策 | 口径 |
|------|------|
| 余额支付扣减顺序 | **先扣赠送再扣本金**（`OrderServiceImpl` 常量集中，可切换） |
| 等级升级口径 | max(累计充值, 累计消费) 取大，**只升不降** |
| 积分抵扣 | 100 分 = 1 元；消费送积分 = 实收 × 等级 pointRate 向下取整 |
| 活动赠送冻结 | 先入赠送桶再冻结至次月，每天 03:10 定时解冻，条件占坑幂等 |
| 充值支付方式 | 限现金/微信/支付宝/银行卡/其他（**不允许**余额/积分）；不叠加优惠券（P21 前无券） |
| 财务口径 | 充值本金计**预收款**不计营业收入；赠送单独记录不与本金混淆 |
| 支付确认 | 一期 manual 手动确认（payment-design.md 模式三）；渠道直连二期引官方 SDK |

---

## 6. 已知边界与遗留项

- **充值活动为租户级**，未做门店维度（需求中「适用门店」暂缓）
- 积分抵扣汇率、余额扣减顺序为代码常量，待 P10 门店设置配置化
- 订单状态 2/3（部分退款/已退款）仅预留，退款流程见 P6
- 卡项核销支付（依赖 P3）、小票打印（依赖 P10）、优惠券（P21）未做
- `dept`/`dict`/`tenant` 等模块按钮级 `@PreAuthorize` 仍待补齐（存量备忘）

---

## 7. 下一步开发建议（按优先级）

### ① P6 退款（🔴 高，依赖 P5 已就绪，建议主线）

订单状态 2/3 已预留、支付明细与流水桶结构可反向冲销，是当前最高优先级：

- 退款单模型（整单/部分退款，关联原单与原支付明细）
- 各支付方式退款路径：现金退、扫码渠道人工退（一期）、**余额支付退回余额**（反向流水回本金/赠送桶）
- 伴生回退：已送积分扣回（不足则扣成负/阻断需拍板）、已扣库存回补、累计消费冲减、等级不回降
- 防重与审计：条件更新占坑（同 pay 模式）、退款原因必填、操作留痕
- **需先拍板**：赠送余额部分是否退回现金、多行折扣订单的部分退款分摊口径（按行原价占比 vs 实收占比）

### ② P3 卡项管理（🟡 中，可与 P6 并行）

- 次卡/套餐卡（次数卡：绑定服务项目按次核销；金额卡：折扣价储值）
- 卡项销售走收银（新增支付方式或复用余额结构）+ 核销记录表
- 落地后补齐 P5 遗留的**卡项核销支付**（`salon_order_card_consume` 预留位）

### ③ P8 财务与日结（🔴 高，依赖 P6）

- 数据口径已就绪（本金=预收款、赠送独立流水、订单实收），P8 主要是报表呈现：
  - 日结单（门店 × 日期：营业收入 / 预收款充值 / 各支付方式汇总 / 退款冲减）
  - 会员预收款负债表、赠送发放与解冻统计
- 对账要点：支付明细合计 = 实收；余额流水与订单金额勾稽

### ④ P7 员工业绩与提成（🟡 中，依赖 P6）

- `salon_order_item.staff_id`/`assistant_id` 数据已落，做业绩分摊（单人/多人比例）与提成计算
- **需先拍板**：赠送余额消费是否计提成；提成基数按原价/折后/实收

### ⑤ 横向完善（穿插进行）

- `dept`/`dict`/`tenant` 等模块按钮级 `@PreAuthorize` 补齐 + 种子 perm
- 积分抵扣汇率 / 余额扣减顺序 / 赠送冻结策略配置化（P10 门店设置）
- 支付渠道直连二期：`wechatpay-java` + `alipay-sdk-java` 官方 SDK 按 PayChannel SPI 接入（**前置**：AES/SM4 加密组件存渠道密钥）
- 小票打印（P10 打印设置，订单详情数据已备齐）
- 充值活动门店维度（若多门店差异化运营出现需求）
