# hair-salon

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
- 详细说明见 `README.md`

## 开发规范（强制）

细则在 **`.cursor/rules/`**（Cursor 与 Claude Code 共用正文）。  
**写/改业务后端代码前**：先读 `.cursor/project_context.md`（项目记忆），再按任务 **Read** 对应规则文件并遵守。

| 文件 | 何时必读 |
|------|----------|
| `.cursor/rules/core-java-standards-rules.mdc` | 分层、包结构、注释、模块边界、字典注解 |
| `.cursor/rules/controller-layer-rules.mdc` | 任何 Controller / HTTP API |
| `.cursor/rules/service-layer-rules.mdc` | Service / 事务 / 字典种子 |
| `.cursor/rules/database-sql-rules.mdc` | Mapper、XML、SQL、DDL |
| `.cursor/rules/concurrency-performance-rules.mdc` | 线程池、异步、缓存、热点路径 |
| `.cursor/rules/project-memory-rules.mdc` | 记忆文件读写流程 |

可交付改动若新增可复用接口/方法，按记忆规则更新 **`.cursor/project_context.md`**。

## 硬性约束（摘要）

1. **HTTP 出参必须是 `model.vo`**（经 `Result` / `PageResult` 包装）。  
   - **禁止**返回 Entity。  
   - **禁止**把 `model.form` 作为返回给前端的类型（含详情/表单回显）；回显用 `XxxVO` / `XxxDetailVO`，Form 仅作写请求入参。  
   - 存量 `GET .../form` → `Result<XxxForm>` 不得作为新代码范本，改造时改为 VO。
2. **`@PreAuthorize` 默认必加**（框架已启用方法级安全；JWT 的 perm 为 `GrantedAuthority`）。  
   - 有菜单权限：`@PreAuthorize("hasAuthority('system:user:add')")`  
   - 仅需登录：`@PreAuthorize("isAuthenticated()")`  
   - **豁免**：公开匿名（登录/注册等，且在 `wj.security.jwt.ignore-urls`）与三方回调。  
   - 权限串与 `sys_menu.perm` 一致（`模块:资源:动作`）；system 需持续完善按钮级菜单与 perm。
3. **分层**：Controller 只调 Service；禁止 Controller → Mapper；Entity/VO/Form 互转用 MapStruct `converter`。
4. **禁止**套用微服务约定：无 Nacos/网关服务名前缀、无 Feign 契约模块；业务路径形如 `/api/v1/...`，认证 `/auth`。
5. **多租户 / 数据权限**：业务表继承 `BaseTenantEntity`；列表需行级过滤时 Mapper 加 `@DataPermission`。
6. **字典**：表 `sys_dict` / `sys_dict_type`；VO 上 `@Dict`，Controller 上 `@QueryDict`；勿手写拼装。
7. **配置**：不提交生产密钥；白名单与租户忽略表见 `hair-salon-boot` 的 `application.yml`。

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

## 给 AI 的工作方式

1. 改代码前：读 `.cursor/project_context.md` + 相关 `.cursor/rules/*.mdc`。
2. 风格与周边存量一致；最小改动；不引入未要求的抽象或依赖。
3. 新接口：出参 VO、补 `@PreAuthorize`、OpenAPI 注解、需要时种子菜单 `perm`。
4. 改完：有可复用点则更新 `project_context.md`「最近更新」。
5. 与用户交流使用 **简体中文**。
