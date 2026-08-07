# hair-salon — Agent 指引（Codex / 通用）

本文件供 **OpenAI Codex** 等读取 `AGENTS.md` 的 Agent **会话自动加载**。  
内容与 Claude Code 入口 **`CLAUDE.md` 对齐且自洽**：稳定规范已内嵌，**日常改代码无需再 Read `.cursor/rules`**。

语言：与用户交流使用 **简体中文**；代码标识符保持英文。

---

## 项目一句话

理发店管理系统：**单体多模块**（非微服务），依赖本地 `wj-framework`（`com.wangjin.*`）。

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
  - **`CLAUDE.md`** — Claude Code 入口（与本文规范意图同步）
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

### 9. 前端查询文本框一键清除（强制）

- 列表/查询场景的文本搜索框（关键字、名称、路径等）**必须带一键清除**：统一用 `<Input clearable ... />`，由 `frontend/src/shared/ui/Input` 渲染右侧 `X` 图标。
- **有值才显示** `X`，空值 / `disabled` / `readOnly` 不显示；点击 `X` 触发 `onChange` 置空（等价于置 `''`），由各页面既有 `useDebounce` 或「查询」按钮触发重新查询，**禁止**在清除逻辑里重复发请求。
- 新增查询框直接加 `clearable`，**禁止**手写清除图标或自行包装清除逻辑。

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

## Codex 与 Skills

### 要不要单独搞一套 skill？

| 问题 | 建议                                                                                            |
|------|-----------------------------------------------------------------------------------------------|
| Codex 是否必须有类似 `.claude/skills` 的目录？ | **一般不需要**再造平行 skill 树。Codex 默认靠仓库根 **`AGENTS.md`（本文）** 注入约定。                                  |
| 流程型能力怎么办？ | **复用** `.claude/skills/**/SKILL.md`：任务匹配时 **Read 并按其步骤做**（无 Claude Skill 运行时，Markdown 流程仍可执行）。 |
| 用户级 `~/.claude/skills`？ | 本机有则按需 Read；没有则跳过，勿臆造。                                                                        |
| 稳定规范放哪？ | **内嵌本文 / `CLAUDE.md`**，不要依赖每次打开 6 个 mdc。                                                      |
| `.cursor/rules`？ | **留给 Cursor**；Claude/Codex 仅可选深挖，**非每回合必读**。                                                  |

仅当流程很长、再塞进本文会浪费每会话上下文，且希望与 Claude **共用同一份**流程时，再新增 skill 文件并在下表加一行——**不必**维护 `.codex/skills` 副本。

### Skills 索引（按需 Read，勿全量预载）

| Skill | 路径 | 何时使用 |
|-------|------|----------|
| react-solo-architect | `.claude/skills/react-solo-architect/SKILL.md` | React+Vite+TS+Tailwind v4+Zustand 管理端 |
| controller-api-audit | 用户级 `~/.claude/skills/controller-api-audit/SKILL.md` | 审 Controller 调用与鉴权 |
| lazy-senior-dev | 用户级 `~/.claude/skills/lazy-senior-dev/SKILL.md` | 最小改动 / 根因修复 |
| form-sensitive-mask | 用户级（若存在） | 仅当本仓已接 Mask/SM4；**默认未接则不用** |

与本文硬性约束冲突时：**以本文为准**。

---

## 给 Agent 的工作方式

1. 稳定规范以 **本文为准**；勿默认再打开全部 `.cursor/rules`。
2. 风格对齐周边存量；最小改动。
3. 新接口：出参 VO、`@PreAuthorize`、OpenAPI、需要时种子 `perm`。
4. 有可复用点再更新 `project_context.md`。
5. 任务匹配 skill → 只 Read 那一个 `SKILL.md`。
6. 不提交密钥与凭证。

---

## 文档职责

| 文件 | 谁用 | 放什么 |
|------|------|--------|
| **`AGENTS.md`（本文件）** | Codex 等自动加载 | 稳定规范全文 + skill / Codex 说明 |
| **`CLAUDE.md`** | Claude Code 自动加载 | 与本文对齐的稳定规范 |
| **`README.md`** | 人（开发者/运维） | 启动、环境、API 概览 |
| **`.cursor/rules/*.mdc`** | Cursor 自动 / 可选深挖 | 同规范备份与加长示例 |
| **`.cursor/project_context.md`** | 按需 | 动态接口 / perm / 复用清单 |
| **`.claude/skills/**`** | 按需 | 流程型 skill |
