# 字典响应与展示核查

核查日期：2026-11-12。范围为 hair-salon 与本地依赖 wj-framework。以种子数据和开发库实际返回的 11 类字典为清单，同时检查 VO、Controller、前端类型和展示代码。

## 响应契约

业务响应保留原始字段，额外增加同名 `_text` 字段。示例：

```json
{
  "status": 1,
  "status_text": "已支付",
  "payments": [
    { "payMethod": 5, "payMethod_text": "会员余额" }
  ]
}
```

VO 字段加 `@Dict(dictCode = "pay_method")`，对外返回该 VO 的 Controller 方法加 `@QueryDict`。框架 `DictAspect` 在 Result/PageResult 内补充翻译字段，支持列表、继承字段、嵌套对象与嵌套列表。用户/部门名称翻译使用 `_name` 后缀。

字典来源是 Redis 中的通用字典与当前租户字典，同 value 时租户覆盖通用；ROOT 按既定规则只读通用字典。字典下拉接口继续返回 `{value,label}`，表单提交原始 value。列表和详情的显示文案读取 `_text`，状态颜色和业务判断仍使用原始值。

框架未匹配的翻译目前为 `-`。前端统一用 `shared/lib/dict.ts` 的 `getDictText` 转为「暂无」，避免显示裸编码或编造字典名称。

## 核查与修复清单

| 字典 | 使用字段与页面 | 发现及修复 |
| --- | --- | --- |
| `gender` | 用户、会员 `gender` | 用户/会员列表原有字段注解；补齐会员详情 `@QueryDict`，前端响应类型补 `gender_text`。当前性别主要用于表单选择。 |
| `status` | 用户、角色、部门、租户、字典维护、门店、会员、等级、标签、服务/商品及分类、充值活动；支付配置 `enabled` | 补齐 VO 注解、分页/详情/部门树入口注解，展示统一读 `status_text` / `enabled_text`。 |
| `member_source` | 会员 `source` | 补会员详情入口翻译与 `source_text` 类型；表单来源沿用字典 options。 |
| `member_balance_type` | 余额流水 `balanceType` | 原有注解与入口正确；当前流水按本金/赠送/冻结分列，原值用于列归属判断，响应保留 `balanceType_text`。 |
| `balance_change_type` | 余额流水 `changeType` | 原有翻译链路正确；移除页面显示裸值的回退，读取 `changeType_text`。 |
| `point_change_type` | 积分流水 `changeType` | 后端已有翻译，前端却写死映射；改读 `changeType_text` 并补类型。 |
| `pay_method` | 收银支付/退款明细、充值记录 `payMethod` | 修框架嵌套列表丢失注解的问题；前端 `payMethodLabel` 改为 `payMethod_text`；补充值分页/详情、发起退款响应的翻译入口。 |
| `order_status` | 订单记录、详情、工作台、支付状态 `status` | 展示改读 `status_text`，补支付状态响应注解；修复工作台原先按错误顺序数组映射订单状态的问题。 |
| `pay_channel` | 支付配置 `channel`、退款渠道 | 补详情、可用渠道、退款渠道的字段注解及相关入口，列表与编辑标题读取 `channel_text`。 |
| `pay_settle_type` | 支付配置 `settleType` | 补详情/可用渠道注解与响应类型，列表读取 `settleType_text`。 |
| `pay_config_status` | 支付配置 `status` | 补详情/验参结果翻译，列表与验参结果弹窗读取 `status_text`。验参本身会调用外部渠道，本次未触发。 |

字典类型分组查询此前返回 `DictTypeForm`，无法承载 VO 字典注解；本次改为 MapStruct 转换的 `DictTypePageVO` 列表，并开启翻译。存量编辑表单接口仍按原始值回填。

充值支付状态、赠送来源、退款状态、退款渠道处理状态、菜单类型、数据范围等目前是业务枚举，未对应上述 11 类系统字典，继续沿用其自身语义。支付方式/渠道的表单选项和过滤条件仍保留受业务约束的可选值；这些选项属于输入侧，不是响应 `_text` 展示。

## 根因

1. 收银详情原本读取 `payMethodLabel`，框架实际约定为 `payMethod_text`。
2. `DictAspect` 先序列化整个 VO，再从序列化后的 List<Map> 递归；Map 无法保留 VO 字段的 `@Dict`，嵌套支付、退款明细未生成 `_text`。改从原始 VO 读取嵌套字段后递归。
3. 部分 VO 已有 `@Dict`，Controller 未加 `@QueryDict`，包括充值记录和会员详情；其他通用状态字段也存在注解缺失。

## 验证

- wj-framework：`mvn -pl wj-common/common-web -am install -DskipTests=false`；9 项回归测试全部通过，覆盖嵌套支付与退款、继承字段、嵌套对象、树、分页、空值/未知值、日期/字符串列表、租户覆盖及 Jackson 忽略字段。
- hair-salon：`mvn package -DskipTests` 构建通过。
- frontend：`npm run build`、`npm run lint` 通过。
- 使用构建产物启动临时 18081 端口实例，关闭支付补偿、积分过期和充值解冻定时任务，登录后只读抽查开发库已有数据。未创建支付、退款或业务测试单。
- 已支付订单实际返回 `payments[].payMethod=5`、`payMethod_text=会员余额`；已退款订单的支付和退款分摊明细均返回对应文本。充值详情实际返回 `payMethod=3`、`payMethod_text=支付宝`。会员详情返回 `gender_text` / `source_text` / `status_text`。
- 用户、角色、部门树、门店、会员、等级、标签、服务/商品及分类、充值活动、支付配置的分页响应均已抽查；开发库字典类型共 22 条，按通用/租户副本去重后为 11 类。
- 最终构建再次验证字典类型分组查询：22 条记录均包含 `status_text`，去重为 11 类；已退款订单的支付/退款明细再次验证通过。临时验证实例已停止。
- 租户覆盖通过单元测试验证；HTTP 抽查使用 ROOT 账号，未逐个切换租户，也未通过浏览器逐页点击验收。

框架修复已安装到本机 Maven 仓库。原有 8080 进程需重启以加载新代码；前端生产环境需使用新构建产物。本次无需数据库迁移。
