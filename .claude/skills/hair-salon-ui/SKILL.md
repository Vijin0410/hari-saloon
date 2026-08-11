---
name: hair-salon-ui
description: Hair Salon 美业 SaaS 前端 UI 设计方法论。新增页面或优化现有页面时加载，指导从业务目标出发设计 UI 而非从接口字段生成页面。涵盖设计语言、标杆模式、页面类型选择矩阵、开发流程与反模式。
---

# Hair Salon UI 设计方法论

本 skill 是 Hair Salon 美业 SaaS 前端的**设计思维层**规范。与 `CLAUDE.md` 第 1-11 条硬规范（分层 / HTTP / 鉴权 / 校验 / 时间字段 / 详情风格）互补：硬规范管「怎么写代码」，本 skill 管「为什么这么设计、选什么形态」。

完整分析见 `docs/hair-salon-ui-evolution-guide.md`。日常开发加载本 skill 即可，无需重读全文。

---

## 1. 何时使用

- 新增前端页面 / 路由
- 优化现有页面 UI（消除模板感、补业务表达）
- 评审前端 UI 设计方案
- 新增 `shared/ui` 组件前判断「该不该补组件」

**不用于**：纯后端改动、纯样式微调（颜色 / 间距对齐）、CLAUDE.md 硬规范已覆盖的代码层细节。

---

## 2. 核心理念

### 2.1 业务驱动，不是字段驱动

**禁止**把后端 `PageVO` 字段直接当表格列、把 `Form` 字段直接当表单项。先回答：

1. 页面服务谁？（老板 / 店长 / 收银员 / 发型师 / 财务）
2. 用户为什么用这个页面？（核心任务一句话）
3. 最高频操作是什么？
4. 什么信息最重要？（哪个数字 / 哪个状态用户最关心）
5. 什么展示方式最符合业务？（表格 / 卡片 / 时间线 / 看板）

回答完再选 UI 形态。字段是原料，不是设计。

### 2.2 不推翻已有优秀页面

会员模块（`MemberPage.tsx`）是标杆。新增页面**复用标杆模式**（见第 4 节），不另起设计语言。

### 2.3 不强制卡片化

- 流水 / 日志 / 配置类数据 -> **保留专业表格**
- 会员 / 商品 / 服务等业务实体 -> 优先业务化展示（列表表格 + 详情档案）
- 经营数据汇总 -> Dashboard（Stat Card + 趋势）
- 时间序列（预约 / 排班）-> Timeline

### 2.4 工具型产品，克制的个性

Hair Salon 是 SaaS 工具，不是营销页。借鉴 `frontend-design` 的「spend boldness in one place」：把视觉力花在**业务化组件**（工作台指标卡、会员档案卡、日结看板），其余保持安静纪律。不引入花哨动效 / 装饰性插画。

---

## 3. 设计语言速查

### 3.1 颜色 Token（`frontend/src/index.css` `@theme`）

| Token | Hex | 语义 |
|-------|-----|------|
| `salon-accent` | `#7c6aef` | 主色（紫）-- 按钮 / 强调 / 选中 |
| `salon-ink` | `#2a2438` | 主文字（深紫墨） |
| `salon-line` | `#e4dff0` | 边框 / 分割线 |
| `salon-paper` | `#f8f6fc` | 页面背景 |
| `salon-panel` | `#ffffff` | 面板背景 |

**状态色**（当前缺失，需补 token 后统一使用）：

| 语义 | 色 | 用途 |
|------|----|------|
| success | emerald `#10b981` | 启用 / 正常 / 已支付 / 增加 |
| warning | amber `#f59e0b` | 待确认 / 预警 / 低库存 |
| danger | rose `#f43f5e` | 停用 / 禁用 / 退款 / 扣除 / 不足 |
| info | sky `#0ea5e9` | 信息标签 / 部分退款 |

**禁止**：状态色随手用 emerald / violet / amber 不统一。Badge `success` 当前用 violet，需随状态色 token 落地后改 emerald。

### 3.2 字体

当前 `--font-sans` 声明 Inter 但**未实际加载**，回退系统字体，个性为零。建议引入 Inter 实际加载（`index.html` Google Fonts 或本地字体）。标题字可考虑更有个性的字体（未来规划）。

### 3.3 暗色模式

每处样式都带 `dark:` 变体，zinc 色阶。新增组件 / 页面必须覆盖暗色模式。

---

## 4. 标杆模式速查（复用，勿重造）

以下模式已在 `MemberPage.tsx` 落地，新增页面直接套用。

### 模式 A：档案头部（Profile Header）
圆形头像（无图取姓名首字，`bg-salon-accent text-white`）+ 姓名（`text-lg font-semibold`）+ 等级 / 状态 `Badge` + 手机（灰 `text-sm`）。
**用于**：会员 / 用户 / 租户 / 门店 / 员工等「人 / 主体」详情头部。

### 模式 B：核心资产卡（Asset Stat Card）
`text-[28px] font-bold` 大号数字**独占行**，操作按钮放标题行右上角（主 `primary` / 次 `secondary`），下方接次级信息（最近充值 / 消费）。
**用于**：余额 / 积分 / 营业额 / 充值总额等「老板最关心的核心数字」。
**禁止**：长金额与按钮并排（会重叠）。

### 模式 C：四宫格明细（Stat Grid）
`grid grid-cols-4 gap-3`，每格 `rounded-md bg-stone-50 p-3`，标题灰小字 + 值深色。
**用于**：一个主体的多个并列数值（余额分桶 / 支付方式汇总 / 日结各收入项）。

### 模式 D：标签流 + 偏好两列
标签 `Badge tone="info"` 流式排列；偏好 `grid grid-cols-2` 的 `label / value` 子卡片（标题灰小字 + 值深色）。
**禁止**：`字段：值` 平铺。

### 模式 E：数量调整弹窗（Adjust Dialog）
方向 Tab 单选（选中紫底白字）+ 统一「调整数量」+ 右侧 suffix 带符号实时预览（扣除兼容负号，`Math.abs` 后按方向取负）+「调整后」预览卡（不足显红）+「调整原因」必填 + 按钮文案随方向（`确认增加` / `确认扣除`）。数量输入 `type="text"` + `inputMode` + 正则。
**用于**：余额 / 积分 / 库存 / 手工业绩等所有「带方向的数值变更」。

### 模式 F：流水专业表格
`text-xs` 紧凑表格，变动额按正负 emerald / rose 着色，列含时间 / 类型 / 变动额 / 变动后 / 操作人。
**用于**：余额 / 积分 / 订单 / 退款 / 充值流水。**不要卡片化**。

---

## 5. 页面类型选择矩阵

| 数据性质 | 页面类型 | 示例 |
|----------|----------|------|
| 可枚举业务实体 | 列表表格 + 详情档案 | 会员 / 商品 / 服务 |
| 流水 / 日志 / 记录 | 专业表格（紧凑） | 余额流水 / 订单流水 / 退款记录 |
| 配置类 | 树形表格 / master-detail | 菜单 / 部门 / 字典 |
| 经营数据汇总 | Dashboard（Stat Card + 趋势） | 工作台 / 日结 |
| 时间序列 | Timeline 时间线 | 预约 / 排班 |
| 单据详情 | 单据视图（头部 + 明细 + 流程） | 订单 / 充值 / 退款 |
| 数值变更 | 方向 Tab + 预览弹窗 | 余额 / 积分调整 |

---

## 6. 新增页面流程

```
业务目标分析  ->  信息架构设计  ->  UI 方案设计  ->  代码实现
```

### 步骤 1：业务目标分析
回答第 2.1 节五个问题（写在 PR 描述或页面顶部注释）。

### 步骤 2：信息架构设计
- 列出信息单元，按重要性排序。
- 决定每个单元形态：核心数字（Stat Card）/ 明细网格（四宫格）/ 列表（表格）/ 时间序列（Timeline）/ 关系（Badge 群组）。
- 决定主操作 / 次操作 / 危险操作的层级与位置。

### 步骤 3：UI 方案设计
- 按第 5 节矩阵选页面类型。
- 复用第 4 节标杆模式（能套就套，勿重造）。
- 检查设计语言：颜色 token / 状态色 / 字体层级 / 空状态 / 暗色模式。
- 检查组件缺口：需要的组件 `shared/ui` 是否已有？缺的**先补组件再写页面**（避免手写重复结构）。

### 步骤 4：代码实现
- 遵循 `CLAUDE.md` 第 1-11 条硬规范。
- 复用 `shared/ui`，缺组件先补。
- 跑通：暗色模式 / 空状态 / 权限按钮 / 加载态 / 错误态。
- 风格对齐周边存量代码（最小改动精神，参考 `lazy-senior-dev`）。

---

## 7. 通用优化原则（速查）

| 维度 | 原则 |
|------|------|
| 页头 | 标题 `text-xl font-semibold` + 副标题 `text-sm text-zinc-500` + 右主操作；统一不分化 |
| 查询区 | 独立 `Card`，搜索框必带 `clearable` |
| 表格 | `divide-y divide-salon-line` + `thead bg-slate-50` + 表头中文不 `uppercase` |
| 分页 | 带页码 + 总数（用 `Pagination` 组件，勿手写） |
| 信息层级 | 老板最关心的数字最大（`text-[28px] font-bold` 独占行）；`字段：值` 禁止平铺，用子卡片 |
| 操作 | 动词命名（「保存」非「提交」）；同流程名不变；危险操作二次确认；行操作 ≤3 个，超过用「更多」下拉 |
| 空状态 | **禁止 `-`**，统一「暂无 / 暂无记录」；空列表用 `EmptyState`（title + description + 可选 action） |
| 状态展示 | Badge tone 映射状态色 token；业务状态用色（待支付 warning / 已支付 success / 已退款 neutral / 低库存 warning） |
| 表单 | 必用 react-hook-form + zod；数字字段 `type="text"` + `inputMode` + 正则；时间字段必配 `type="date"/`type="time"`；字段多用 `FormSection` 分组 |

---

## 8. 反模式清单（禁止）

1. ❌ 接口字段直接当表格列 / 表单项，不做业务化重组
2. ❌ 业务实体只有编辑弹窗，没有只读详情
3. ❌ 核心数字与按钮并排
4. ❌ `字段：值` 平铺
5. ❌ 空值显示 `-`
6. ❌ 流水 / 日志硬卡片化
7. ❌ 表单裸 `setForm` 无 zod
8. ❌ 数字字段裸 `type="number"`
9. ❌ 时间字段裸 Input + placeholder
10. ❌ 状态色随手用色不统一
11. ❌ 每个列表页手写 `<table>` + 手写分页（封装 Table / Pagination）
12. ❌ 操作按钮超过 3 个不收敛
13. ❌ 折扣 / 提成 / 会员价等「业务语义字段」藏在表单里，列表不展示
14. ❌ 金额用内联 `¥{x.toFixed(2)}`（用 `formatCurrency` 工具函数）

---

## 9. 组件使用规范（强制）

`shared/ui` 已建核心组件：Card / Button / Badge / Input / Select / Textarea / Modal / **Table** / **Pagination** / **StatCard** / **Drawer** / EmptyState / Field / ConfirmDialog / IconPicker / PageLoading / Spinner。

**强制规则**：

- **新模块**必须使用 `Table` / `Pagination` / `StatCard` / `Drawer`，**禁止**手写 `<table>` 结构、手写「上一页/下一页」分页、手写 `text-[28px]` 资产卡、把长内容塞进居中 Modal。
- **已开发模块顺手重构**：改到某页面时，把手写 `<table>` 换 `Table`、手写分页换 `Pagination`、详情资产卡换 `StatCard`、内容过多的 Modal 换 `Drawer`。**不必专项重构**，随业务改动顺带，避免大范围无关 diff。

**组件选用**：

| 场景 | 组件 |
|------|------|
| 列表数据 | `Table`（声明式 columns，内置 loading/empty） |
| 分页 | `Pagination`（页码 + 总数 + 省略号） |
| 核心数字 / 资产卡 | `StatCard`（28px 数字独占行 + 右上角操作） |
| 详情 / 流水 / 长表单 | `Drawer`（右侧滑出，内容多时优于 Modal） |
| 短表单 / 确认 | `Modal` / `ConfirmDialog` |
| 分区容器 | `Card` |

**仍缺**（按需补）：Descriptions / Tabs / Switch / Toast / Skeleton / Avatar / Dropdown / RadioGroup / CheckboxGroup / FormSection / ColorPicker / TagInput / Tooltip。

**金额展示**：统一用 `formatCurrency`（`shared/lib/format.ts`），禁止内联 `¥${x.toFixed(2)}`。

---

## 10. 模块演进优先级

1. **补基础**：`formatCurrency` + 状态色 token + Inter 字体 + Table/Pagination/StatCard/Drawer
2. **修规范洼地**：Tenant / Store（zod + 时间 + 空值）、服务商品（业务语义列 + 价格格式化 + 分类合并）
3. **统一基础**：表格 / 页头 / 分页 / 状态色 统一；MemberLevel/Tag 复用标杆
4. **重构工作台**：经营视角指标卡 + 快捷操作 + 待办（P9 前置骨架）
5. **建新模块**：随 P4-P8 后端推进，收银（P5）/ 退款（P6）/ 日结（P8）/ 看板（P9）

每步遵循第 6 节流程，不回退到「接口字段直出」。

---

## 11. 参考与边界

- **标杆页面**：`frontend/src/pages/MemberPage.tsx`
- **完整分析**：`docs/hair-salon-ui-evolution-guide.md`
- **硬规范**：`CLAUDE.md` 第 1-11 条（分层 / HTTP / 鉴权 / 校验 / 时间 / 详情风格）
- **技术栈 skill**：`react-solo-architect`（React+Vite+TS+Tailwind v4+Zustand 架构细则）
- **视觉理念**：`frontend-design`（通用反模板 / 字体个性理念，工具型产品克制使用）

**冲突时**：以 `CLAUDE.md` 硬规范为准；本 skill 提供设计思维层指导，不覆盖代码层硬约束。
