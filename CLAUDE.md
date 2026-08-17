# hair-salon

理发店管理系统：**单体多模块**（非微服务），依赖本地 `wj-framework`（`com.wangjin.*`）。

与用户交流使用 **简体中文**。下文为 Claude Code **会话自动加载**的完整稳定规范——**日常改代码无需再 Read `.cursor/rules`**。  
`.cursor/rules/*.mdc` 仅作 Cursor 侧 / 超长细则备份；仅在做深度审计、补字典种子模板、并发专项等需要全文时再打开。

---

## 模块与包

| 模块 | 根包 | 职责 |
|------|------|------|
| `hair-salon-boot` | `com.wangjin.salon` | 唯一启动入口、yml、schema/data |
| `hair-salon-system` | `com.wangjin.salon.system` | 用户/角色/菜单/部门/字典/租户 |
| `hair-salon-auth` | `com.wangjin.salon.auth` | 登录、当前用户 |
| `hair-salon-service` | `com.wangjin.salon.service` | 业务（会员、门店等；**不是**微服务） |

- 扫描：`@SpringBootApplication(scanBasePackages = "com.wangjin")`；`@MapperScan("com.wangjin.salon.**.mapper")`
- 统一响应：`com.wangjin.common.result.Result` / `PageResult`
- 库：PostgreSQL `hair_salon`；缓存：Redis；鉴权：JWT + `@EnableMethodSecurity`
- 启动类：`com.wangjin.salon.HairSalonApplication`；文档：http://localhost:8080/doc.html
- 相关文档：
  - **`README.md`** — 给人看的项目说明（启动、依赖、API 概览、运维）
  - **`AGENTS.md`** — Codex / 通用 Agent 入口（与本文规范意图同步）
  - **`.cursor/project_context.md`** — 动态接口/权限/复用备忘（按需）

---

## 稳定规范（内嵌，默认遵守）

### 1. 分层与包

- 模块根包下按：`controller` / `service` / `service.impl` / `mapper` / `model.{entity,vo,form,query,bo,dto,excel}` / `converter` / `config` / `handler` / `cache` …
- **禁止**功能名 × 分层套娃（反例：`…system.user.controller`）；用类名区分（`SysUserController`）。
- Controller **只调 Service**；禁止 Controller → Mapper。
- Entity/VO/Form 互转用 **MapStruct `converter`**，禁止大段手写 getter/setter。
- Listener / Scheduling 禁止直接 Mapper，须经 Service。
- **模型字段说明（强制）**：`model.entity` 每个字段必须 `/** ... */` Javadoc 注释；`model.form` / `model.query` / `model.vo` 每个字段必须 `@Schema(description = "...")`；均用简体中文，含义与 SQL `COMMENT` 一致。类级 `@Schema` 必备。基类（`BaseEntity` / `BaseTenantEntity`，在 `wj-framework`）字段已标注，继承类不重复。

### 2. HTTP 入参 / 出参（强制）

| 方向 | 类型 |
|------|------|
| 写请求体 | `model.form` + `@Valid` |
| 分页/复杂查询 | `model.query` |
| **HTTP 出参** | **`model.vo`**，经 `Result` / `PageResult` 包装 |

- **禁止**返回 Entity；**禁止**把 `model.form` 当出参（含详情/表单回显）。回显用 `XxxVO` / `XxxDetailVO` / `XxxPageVO`。
- 存量 `GET .../form` → `Result<XxxForm>` **不得作为新代码范本**。
- 路径：业务 `/api/v1/...`，认证 `/auth`；类上 `@Tag`，方法 `@Operation(summary=…)`。
- 路径变量 ID **禁止直接单独挂在资源后**（反例：`PUT /api/v1/users/{id}`、`DELETE /api/v1/files/{id}`）。
- 动作/视图类路径，`{id}` 放在资源与动作之间（`/{id}/动作`），便于 F12 网络面板按资源 ID 区分请求：表单 `/{id}/form`，详情 `/{id}/detail`，修改 `/{id}/update`，状态 `/{id}/status`，重置密码 `/{id}/password`；删除批量 `/delete?ids=`，单条 `/{id}/delete`。
- 新增统一 `POST /add`（不用裸 `POST` 根路径）；列表分页 `GET /page`，下拉 `GET /options`，树/全量列表 `GET` 根。
- 仅当后半段是 `{id}` 所定位资源的子资源/关联资源时，才使用 `/{id}/子资源`（如 `/api/v1/members/{id}/tags` 会员的标签）。
- 多级资源（如字典类型 `/dict/types`）的子动作同样 `{id}` 居中：`/types/{id}/form`、`/types/add`、`/types/{id}/update`。
- 写接口按需 `@PreventDuplicateResubmit`；字典字段 VO 上 `@Dict`，Controller 方法 `@QueryDict`。
- 常用：`Result.success` / `Result.judge` / `PageResult.success(records, total)`。

### 2.1 字段更新契约（PUT/PATCH，强制）

所有 PUT/PATCH 更新接口统一遵循"部分更新"三态语义（同 RFC 7396 JSON Merge Patch）：

| 场景 | 请求体 | 后端处理 |
|------|--------|---------|
| 修改值 | 传具体值 | 更新为传入值 |
| 清空字段 | 传 `null` | 置为 `NULL` |
| 不修改 | 不传该字段（key 不存在） | 保持原值 |

示例（改用户名 + 清空手机号，其余不动）：

```json
{ "username": "新名字", "phone": null }
```

- 前端：有值传值；用户清空可选字段须显式传 `null`（**不是** `undefined` / 省略 key）；不涉及的字段不传 key。`JSON.stringify` 会丢弃 `undefined`、保留 `null`，天然区分"不传"与"清空"。
- 后端：Java POJO + Jackson **默认无法区分**"未传 key"与"传 `null`"（反序列化后均为 `null`）。严格三态须用 `JsonNullable<T>` 包装可空字段并注册 `jackson-databind-nullable`。现状（全量表单 PUT）：MyBatis-Plus 默认 `FieldStrategy.NOT_NULL`（`null` 不更新）满足"不传保持"；"传 `null` 清空"对可清空字段标注 `@TableField(updateStrategy = FieldStrategy.ALWAYS)` 实现。全量表单下前端总会提交全部字段，"不传保持"不触发；**新增纯 PATCH 部分更新接口前须先引入 `JsonNullable`**，否则 IGNORED 字段在"不传"时会被误清空。`password` / `lastPasswordChangeTime` 等不由前端控制的字段保持默认 `NOT_NULL`，service 置 `null` 跳过更新。

### 2.2 字段校验（jakarta validation，强制）

后端 `model.form` 每个字段须按语义标注 jakarta.validation 注解，Controller `@Valid` 已强制；与前端 zod（见第 11 条）**双层保险**，正则保持一致。

- 必填：字符串用 `@NotBlank`、对象/数字用 `@NotNull`（空字符串 `@NotNull` 不拦截，须 `@NotBlank`）。
- 格式 `@Pattern(regexp = "...", message = "...")`，常用（Java 字符串转义反斜杠）：
  - 手机号：`@Pattern(regexp = "^1[3-9]\\d{9}$", message = "手机号格式不正确")`；可空字段不标 `@NotNull`，`@Pattern` 对 `null` 不校验，**空串须在正则放行**（可空手机号用 `^(1[3-9]\\d{9})?$`）或前端空串转 `null`。
  - 身份证：`@Pattern(regexp = "^[1-9]\\d{5}(18|19|20)\\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\\d|3[01])\\d{3}[\\dXx]$", message = "身份证号格式不正确")`。
  - 邮箱：`@Email(message = "邮箱格式不正确")`。
- 长度 `@Size(min, max)`；数字范围 `@Min`/`@Max`（或 hibernate-validator `@Range`）；生日等过去日期 `@Past`；起止时间业务校验放 Service。
- 校验失败由全局异常处理拦截 `MethodArgumentNotValidException` -> 取字段 `message` 返回 `Result.fail`。
- **禁止**只依赖前端校验；`model.form` 必填字段无 `@NotBlank/@NotNull`、格式字段无 `@Pattern` 视为不合规。

### 3. `@PreAuthorize`（强制）

- 框架已 `@EnableMethodSecurity`；JWT 把菜单 `perm` 写成 `GrantedAuthority`。
- **默认每个对外 HTTP 方法都要** `@PreAuthorize`：
  - 有 perm：`@PreAuthorize("hasAuthority('system:user:add')")`
  - 仅登录：`@PreAuthorize("isAuthenticated()")`
  - 多权限：`hasAnyAuthority('a','b')`
- **豁免**（且须在 `wj.security.jwt.ignore-urls`）：登录/注册等公开匿名、三方回调。
- 权限串 = `sys_menu.perm`，形如 `模块:资源:动作`。
- 链路：角色菜单 `perm` → 登录写入 JWT `authorities` → Filter → `hasAuthority`（**不是** Redis `@ss.hasPerm`）。
- 新接口若缺按钮菜单：同步种子 / 管理端配置（注意默认 `sql.init.mode=never`，已有库可能要手工跑 SQL）。
- 现状备忘（细节以 `project_context.md` 为准）：user/role/menu 已加按钮级注解；dept/dict/tenant 等待补。

### 4. Service / 事务 / 字典

- `XxxService` + `XxxServiceImpl`；优先 `@RequiredArgsConstructor`。
- 多表写：`@Transactional(rollbackFor = Exception.class)`；只读不加事务；注意自调用不走代理。
- 业务失败抛 `BizException`；列表勿返回 null（空列表/空分页）。
- 字典表 `sys_dict` / `sys_dict_type`；业务只存 value；新建字典先 type 再项；VO `@Dict`，勿手写拼装。
- **字典租户模式（强制）**：字典为「通用（默认租户 1 = 模板）+ 租户覆盖」--缓存键通用 `system:core:dict:{typeCode}`、租户 `system:core:dict:{typeCode}:{tenantId}`，同 value 租户覆盖通用（与 wj-framework `DictAspect` 对齐；表走 `ignore-tables`，由代码手动分键：写入 `SystemCacheServiceImpl`、读取 `listDictOptions` / 翻译切面）。**每次新增字典种子 SQL（`data.sql` / `migrate-*.sql`）必须同步加一份租户 `2084880957290426370` 的副本**（INSERT..SELECT 自租户 1，`id + 1000`，NOT EXISTS 守卫）。契约型字典（余额桶/变动类型等）value 不得偏离通用，租户副本只能改名称/排序；字典维护权限仍仅 ROOT。
- 缓存更新路径须失效/刷新，与既有 cache 策略一致。

### 5. 数据访问 / SQL

- MyBatis-Plus + `resources/mapper/**/*.xml`；复杂 SQL 放 XML；`#{}` 防注入。
- 避免 `SELECT *`、循环内逐条 SQL；分页有 pageSize 上限。
- 运行库 **PostgreSQL**；方言须注释。
- 租户业务表继承 `BaseTenantEntity`；行级过滤 Mapper 加 `@DataPermission`。
- DDL/种子：`sql/` 与/或 boot 的 `schema.sql` / `data.sql`。
- **建表/字段必须写注释**：PG 用 `COMMENT ON TABLE` / `COMMENT ON COLUMN`（不支持 `CREATE TABLE` 内联注释）；新表与新字段无 comment 视为不合规。`schema.sql` 建表即带注释，存量库用 `sql/migrate-*.sql` 补。

### 6. 并发与性能（摘要）

- 禁止业务 `new Thread()` / 无参 `CompletableFuture.runAsync` 跑重活；用 Spring 托管线程池。
- 禁止循环远程调用；大导出分页/异步。
- 多实例互斥用分布式锁，不靠单机锁。

### 7. 禁止事项

- 微服务约定：Nacos / 网关服务名前缀 / Feign 契约模块。
- 提交生产密钥、本机 token、把凭证写入仓库。
- 未要求的抽象层、多余依赖、大范围无关重构。

### 8. 前端时间字段表单（强制）

- 前端表单中日期/时间字段（生日、过期时间、起止时间等）**生成时必须配时间选择组件**，禁止裸 `<Input>` + `placeholder` 让用户手敲字符串。
- 统一用原生 `<Input type="...">`（`frontend/src/shared/ui/Input` 透传 `type`，零依赖，符合不引第三方 UI 库）：
  - **优先按天**：能按天（仅年月日）的字段一律 `type="date"`（后端 `LocalDate` / `YYYY-MM-DD`，value 与后端格式一致，无需转换）。如积分过期时间按天选择，**选当天则在当天 24:00 后过期**（后端按 `expireDate < today` 判定，定时任务次日扫到即清零）。
  - **禁用 `type="datetime-local"`**：其空值占位 `--:--` 不美观。确需"日期+时分秒"的字段，用 `type="date"` + `type="time"` 组合提交（后端 `LocalDateTime` / `YYYY-MM-DD HH:mm:ss`），不得用单个 `datetime-local`。
  - 仅时间：`type="time"`。
- 禁止为时间字段引入 `dayjs`/`moment`/`react-datepicker` 等；落地细则见 `react-solo-architect` skill。
- `type="date"` 空值（未选择）时原生占位 `yyyy/mm/dd` 不美观，由 `Input` 组件统一覆盖为灰色「选择时间」：业务侧正常用 `<Input type="date" value={x ?? ''} />` 即可，**不要**再手写占位；有值或 `disabled` 时回归原生展示。

### 9. 前端查询文本框一键清除（强制）

- 列表/查询场景的文本搜索框（关键字、名称、路径等）**必须带一键清除**：统一用 `<Input clearable ... />`，由 `frontend/src/shared/ui/Input` 渲染右侧 `X` 图标。
- **有值才显示** `X`，空值 / `disabled` / `readOnly` 不显示；点击 `X` 触发 `onChange` 置空（等价于置 `''`），由各页面既有 `useDebounce` 或「查询」按钮触发重新查询，**禁止**在清除逻辑里重复发请求。
- 新增查询框直接加 `clearable`，**禁止**手写清除图标或自行包装清除逻辑。

---

### 10. 前端详情/表单风格规范（强制）

详情页与数量调整弹窗统一「SaaS CRM 档案」风格，复用 `frontend/src/shared/ui`，禁止平铺堆叠；细则见 `react-solo-architect` skill。

- **详情页分区**用 `Card`（`shared/ui/Card`：`rounded-lg`/`p-4`/`hover:shadow-sm`，`title`+`extra` 右上角操作），区域 `space-y-4`。
- **档案头部**：圆形头像（无 avatar 取姓名首字，紫底白字）+ 姓名（`text-lg font-semibold`）+ 手机（灰 `text-sm`）+ 等级/状态 `Badge`；状态正常绿（`emerald`）、停用红（`danger`）。
- **核心资产数字**（余额/积分）`text-[28px] font-bold` **独占行**，禁止与按钮并排（长金额会重叠）；操作按钮放标题行右上角，主操作 `primary` / 次操作 `secondary`。
- **明细多字段**用四宫格/两列子卡片（标题灰小字 + 值深色），禁止「字段：值」平铺。
- **空数据统一「暂无 / 暂无记录」，禁止显示「-」**。
- **数量调整弹窗**（余额/积分等）：方向 Tab 单选（选中紫底白字，不动态改字段名）+ 统一「调整数量」+ 右侧 suffix 带符号实时预览（扣除兼容负号，`Math.abs` 后按方向取负）+「调整后」预览卡（不足显红）+「调整原因」必填 + 按钮文案随方向（`确认增加`/`确认扣除`）+ 前端校验就近显示 `Field error`；数量输入用 `type="text"` + `inputMode="numeric"` + 正则承载中间态（受控 `type="number"` 无法输入负号），失焦兜底回 `0`。

---

### 11. 前端表单校验规范（强制）

表单统一用 `react-hook-form` + `zod`（`@hookform/resolvers/zod`），schema 放 `frontend/src/features/<name>/model/xxxSchemas.ts`，组件 `useForm({ resolver: zodResolver(schema) })` + `register` + `<Field error={errors.x?.message}>` + `invalid`。与后端 jakarta validation（见 2.2）**双层保险**，正则保持一致。

- **格式校验用正则**（`z.string().regex(regexp, '消息')`），常用：
  - 手机号：`/^1[3-9]\d{9}$/`（"手机号格式不正确"）。
  - 身份证：`/^[1-9]\d{5}(18|19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dXx]$/`。
  - 纯数字：`/^\d+$/`；整数限位：`/^\d{1,9}$/`。
  - 金额：`/^\d{1,9}(\.\d{1,2})?$/`。
  - 邮箱：`z.string().email('邮箱格式不正确')`。
- **可空字段**：空串不触发格式校验，用 `z.string().trim().optional().refine((v) => !v || REG.test(v), '消息')`，或 `z.union([z.literal(''), z.string().regex(REG)])`。
- **必填** `.min(1, 'xx不能为空')`；枚举 `z.union([z.literal(0), z.literal(1)])` / `z.enum([...])`；跨字段 `.refine(..., { path: ['field'], message })`。
- **纯数字输入框**：受控输入用 `type="text"` + `inputMode="numeric"` + 正则过滤承载中间态（见第 10 条），提交前 zod 兜底；**禁止**裸 `type="number"`（无法输入负号、`e`/`+` 混入、空值 NaN）。
- 校验消息用简体中文，与后端 `message` 一致；错误就近显示在 `Field` 的 `error`，提交按钮 `loading={isSubmitting}`。
- **禁止**只靠后端校验；新增表单字段必须同步加 zod 规则。

---

## 技术栈速查

- Java 17、Spring Boot 3.2、MyBatis-Plus、MapStruct、Lombok、Hutool
- OpenAPI：`@Tag` / `@Operation`；校验：`jakarta.validation`
- 横切（wj-framework）：`@Log`、`@PreventDuplicateResubmit`、`@Dict`/`@QueryDict`、`SecurityUtils`、`BizException`

## 常用命令

```bash
# 依赖：先在 ../wj-framework 执行 mvn clean install -DskipTests
mvn clean package -DskipTests
java -jar hair-salon-boot/target/hair-salon-boot-1.0.0-SNAPSHOT.jar
```

默认账号：`admin` / `admin123`。

---

## 项目记忆（动态，按需）

- 路径：`.cursor/project_context.md`（接口清单、perm 进度、可复用方法——**会变**）。
- **不必**每个小改动都先读；在以下情况再 Read：
  - 新增/改 HTTP API、权限串、跨模块复用方法；
  - 不确定是否已有同类能力。
- 可交付且新增可复用点时：更新该文件「最近更新」与对应清单。

---

## Skills

| Skill | 路径 | 何时使用 |
|-------|------|----------|
| react-solo-architect | `.claude/skills/react-solo-architect/SKILL.md` | React+Vite+TS+Tailwind v4+Zustand 管理端 |
| hair-salon-ui | `.claude/skills/hair-salon-ui/SKILL.md` | 美业 SaaS 业务化 UI 设计方法论（业务驱动 / 页面类型选择 / 标杆模式复用 / 反模式） |
| controller-api-audit | 用户级 `~/.claude/skills/controller-api-audit/SKILL.md` | 审 Controller 调用与鉴权 |
| lazy-senior-dev | 用户级 `~/.claude/skills/lazy-senior-dev/SKILL.md` | 最小改动 / 根因修复（实现类任务可参考） |
| form-sensitive-mask | 用户级（若存在） | 仅当本仓已接 Mask/SM4；**默认未接则不用** |

- 任务匹配时再加载；**不要**为普通 CRUD 全读所有 skill。
- 与本文冲突时：**以本文件硬性约束为准**。
- Codex 侧 skill 策略见 `AGENTS.md`（共用同一套 Markdown，不必平行维护 `.codex/skills`）。

---

## 给 AI 的工作方式

1. 稳定规范以 **本文为准**（已内嵌）；勿默认再打开全部 `.cursor/rules`。
2. 风格对齐周边存量；最小改动（可参考 lazy-senior-dev 精神）。
3. 新接口：出参 VO、`@PreAuthorize`、OpenAPI、需要时种子 `perm`。
4. 有可复用点再更新 `project_context.md`。
5. 深度细则备份（可选）：`.cursor/rules/*.mdc`。

---

## 文档职责

| 文件 | 谁用 | 放什么 |
|------|------|--------|
| **`CLAUDE.md`（本文件）** | Claude Code 自动加载 | 稳定规范全文 + skill 索引 |
| **`AGENTS.md`** | Codex 等自动加载 | 与本文对齐的稳定规范 + skill/Codex 说明 |
| **`README.md`** | 人（开发者/运维） | 启动、环境、API 概览 |
| **`.cursor/rules/*.mdc`** | Cursor 自动 / 可选深挖 | 同规范备份与加长示例 |
| **`.cursor/project_context.md`** | 按需 | 动态接口 / perm / 复用清单 |
| **`.claude/skills/**`** | 按需 | 流程型 skill |
