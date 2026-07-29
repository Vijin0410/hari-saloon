# 项目上下文记忆

> 最后更新: 2026-07-29

## 模块与包

- 单体多模块：`hair-salon-boot` / `system` / `auth` / `service`
- 根包 `com.wangjin.salon`；框架 `com.wangjin.*`（wj-framework）
- 统一响应：`com.wangjin.common.result.Result` / `PageResult`
- DB：PostgreSQL `hair_salon`；Redis；JWT 无状态

## 多租户 / 组织 / 门店模型

- **租户** `sys_tenant`：连锁品牌边界；开通事务：总部 dept + ROOT/STORE_MANAGER/STORE_STAFF + 管理员
- **部门** `sys_dept`：店/组织树；用户 `dept_id` 为数据锚点
- **角色 data_scope**：ALL=1 / DEPT_AND_SUB=2 / DEPT=3 / SELF=4 / CUSTOM=5
- **门店** `salon_store`：与 dept 1:1，营业属性（时间/地址等）；数据权限走 `dept_id`
- **会员** `salon_member`：`tenant_id` + `dept_id` + `@DataPermission`
- **菜单** `sys_menu` 全局共享（`wj.mybatis.ignore-tables` 含 `sys_menu`）
- **无公开注册**；登录 `POST /auth/login` 带可选 `tenantCode`（空/`default` → 租户 1）
- 初始密码：`wj.salon.default-password`；强制改密看 `last_password_change_time`（NULL=首次/重置后，始终生效；超 `password-expire-days` 为过期，默认 0=不启用）

## 后端接口清单

### 认证
- `POST /auth/login` - 登录（tenantCode/username/password）【公开】
- `GET /auth/me` - 当前用户（含 pwdResetRequired）`isAuthenticated()`
- `POST /auth/change-password` - 改自己的密码 `isAuthenticated()`

### 系统
- `GET|POST|PUT|DELETE /api/v1/users` - 用户；`deptId` 必填 + 越权校验；`system:user:*`
- `PATCH /api/v1/users/{id}/password` - 管理员重置（仍须改密）
- `PATCH /api/v1/users/me/password` - 自己改密
- `GET|POST|PUT|DELETE /api/v1/roles|menus` - 按钮级 `@PreAuthorize`
- `GET|POST|PUT|DELETE /api/v1/dept` - `system:dept:*`；options 仅登录
- `GET|POST|PUT|DELETE|PATCH /api/v1/tenants` - 开通编排；`system:tenant:*`

### 业务
- `GET|POST|PUT|DELETE /api/v1/stores` - 门店；`biz:store:*`；分页 `@DataPermission`
- `GET|POST|PUT|DELETE /api/v1/members` - 会员；`biz:member:*`；分页 `@DataPermission` + `@QueryDict`

## 可复用的后端方法/组件

- **SysTenantService#saveTenant** - 事务开通租户
- **TenantContextRunner** - 临时切换租户写库/登录查人
- **SysUserService#getUserAuthInfo(username, tenantId)** - 登录鉴权
- **SysUserService#changeOwnPassword** - 写 `last_password_change_time=now`
- **SysUserService#isPasswordResetRequired** - NULL 或超期 → 须改密
- **SalonProperties** - 默认密码 + passwordExpireDays
- **@DataPermission** - Mapper 行级；**SecurityUtils** - 当前用户/租户/ROOT/数据范围
- **RoleCodes** - ROOT / STORE_MANAGER / STORE_STAFF

## 权限与菜单（种子）

- 系统：user/role/menu/dept/tenant 按钮
- 业务：`biz:store:list|add|edit|delete`；`biz:member:list|add|edit|delete`
- 预置角色菜单：ROOT 全量；店长用户+部门+门店+会员；店员会员读写
- 默认 `sql.init.mode=never`：存量库跑 `sql/migrate-tenant-store-member.sql` + 按需补 data.sql 菜单/角色

## 关键配置

- `wj.security.jwt.ignore-urls` - 仅 `/auth/login` 等公开（已去掉 register）
- `wj.mybatis.tenant-enabled` / `data-permission-enabled` / `ignore-tables`（含 sys_menu）
- `wj.salon.default-password` / `wj.salon.password-expire-days`（默认 0 关闭过期；设 90 等即启用）

## 最近更新

- 2026-07-29: 强制改密改为 `last_password_change_time`（NULL 始终强制；过期天数默认 0 不启用）
- 2026-07-29: 租户事务开通；登录 tenantCode；deptId 必填+越权；默认密码可配；salon_store/salon_member + 前端租户/门店/会员页
- 2026-07-28: user/role/menu 按钮种子 + 三 Controller `@PreAuthorize`；perms 走 JWT authorities
