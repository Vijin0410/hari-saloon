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
- 动作/视图类路径首选放在 `{id}` 前：表单 `/form/{id}`，详情 `/detail/{id}`，修改 `/update/{id}`，删除 `/delete/{id}` 或批量 `/delete?ids=`，状态 `/status/{id}`，重置密码 `/password/{id}`。
- 仅当后半段确实是 `{id}` 所定位资源的子资源/关联资源时，才使用 `/{id}/xxx`，且新代码应优先确认是否能表达为动作前置路径。
- 写接口按需 `@PreventDuplicateResubmit`；字典字段 VO 上 `@Dict`，Controller 方法 `@QueryDict`。
- 常用：`Result.success` / `Result.judge` / `PageResult.success(records, total)`。

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
