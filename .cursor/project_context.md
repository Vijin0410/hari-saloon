# 项目上下文记忆

> 最后更新: 2026-07-30

## 模块与包

- 单体多模块：`hair-salon-boot` / `system` / `auth` / `service`
- 根包 `com.wangjin.salon`；框架 `com.wangjin.*`（wj-framework）
- 统一响应：`com.wangjin.common.result.Result` / `PageResult`
- DB：PostgreSQL `hair_salon`；Redis；JWT 无状态

## 多租户 / 组织 / 门店模型

- **租户** `sys_tenant`：连锁品牌边界；开通事务：总部 dept + TENANT_ADMIN/STORE_MANAGER/STORE_STAFF + 管理员用户（绑 TENANT_ADMIN）；ROOT=系统管理员仅默认租户
- **部门** `sys_dept`：店/组织树；用户 `dept_id` 为数据锚点
- **角色 data_scope**：ALL=1 / DEPT_AND_SUB=2 / DEPT=3 / SELF=4 / CUSTOM=5
- **门店** `salon_store`：与 dept 1:1，营业属性（时间/地址等）；数据权限走 `dept_id`
- **会员** `salon_member`：`tenant_id` + `dept_id` + `@DataPermission`
- **文件** `sys_file`：MinIO 元数据落库；业务表存 `object_key` 软关联；`is_public` 分公开/私有；权限走 `dept_id`+`create_by` 的 `@DataPermission`
- **菜单** `sys_menu` 全局共享（`wj.mybatis.ignore-tables` 含 `sys_menu`）
- **无公开注册**；登录 `POST /auth/login` 带可选 `tenantCode`（空/`default` → 租户 1）
- 初始密码：`wj.salon.default-password`；强制改密看 `last_password_change_time`（NULL=首次/重置后，始终生效；超 `password-expire-days` 为过期，默认 0=不启用）

## 后端接口清单

### 认证
- `POST /auth/login` - 登录（tenantCode/username/password）【公开】
- `GET /auth/me` - 当前用户（含 pwdResetRequired、avatar=objectKey）`isAuthenticated()`
- `POST /auth/change-password` - 改自己的密码 `isAuthenticated()`

### 系统
- `GET|POST|PUT|DELETE /api/v1/users` - 用户；`deptId` 必填 + 越权校验；`system:user:*`
- `PATCH /api/v1/users/{id}/password` - 管理员重置（仍须改密）
- `PATCH /api/v1/users/me/password` - 自己改密
- `GET|POST|PUT|DELETE /api/v1/roles|menus` - 按钮级 `@PreAuthorize`；菜单列表 `GET /api/v1/menus` 支持 `keywords`/`path`/`perm` 模糊查询
- `GET|POST|PUT|DELETE /api/v1/dept` - `system:dept:*`；options 仅登录
- `GET|POST|PUT|DELETE|PATCH /api/v1/tenants` - 开通编排；`system:tenant:*`
- `POST /api/v1/files/upload|upload/batch`（落库返 `SysFileVO`，入参 biz/bizId/isPublic）/ `DELETE /{id}` · `/batch?ids=`（联动 MinIO，限本人/ALL）/ `GET /{id}/url`（私有桶统一预签名：公开不校验归属，私有校验归属）/ `GET /url?objectKey=`（统一预签名，展示用）/ `GET /page`（`@DataPermission`） - `isAuthenticated()`；业务表存 `object_key` 软关联

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
- **MinioService**（wj common-minio）- upload/delete/getPublicUrl/getPresignedUrl
- **SysFileService** - `uploadAndSave`（传 MinIO + 落 sys_file，落库失败补删避免孤儿）/ `delete`（逻辑删 + 删 MinIO，限本人/ALL）/ `getAccessibleUrl`（私有桶统一预签名：公开不校验归属 / 私有校验归属）；sys_file 走 `@DataPermission`

## 权限与菜单（种子）

- 系统：user/role/menu/dept/tenant 按钮
- 业务：`biz:store:list|add|edit|delete`；`biz:member:list|add|edit|delete`
- 预置角色菜单：ROOT 全量；店长用户+部门+门店+会员；店员会员读写
- 默认 `sql.init.mode=never`：存量库跑按需补 data.sql 菜单/角色

## 关键配置

- `wj.security.jwt.ignore-urls` - 仅 `/auth/login` 等公开（已去掉 register）
- `wj.mybatis.tenant-enabled` / `data-permission-enabled` / `ignore-tables`（含 sys_menu）
- `wj.salon.default-password` / `wj.salon.password-expire-days`（默认 0 关闭过期；设 90 等即启用）
- `wj.minio.*` - common-minio；`public-read=false`（私有桶，全预签名 + `getAccessibleUrl` 归属校验；存量桶须 `mc anonymous set none`）；`default-expiry-seconds=86400`（与 JWT `expire-seconds` 对齐）；`endpoint-enabled=false`（用 SysFileController）；本地 Docker `../wj-framework/docs/minio-deploy.md`
- 文件字段约定：业务表（如 `sys_user.avatar`）存 `object_key`；`UserPageVO` 返回时转预签名 URL；表单回显给 object_key，预览调 `GET /files/url?objectKey=`

## 最近更新

- 2026-07-30: 角色模型重构—ROOT=系统管理员（仅默认租户，跨租户：`WjTenantLineHandler.ignoreTable` 对 `SecurityUtils.isRoot()` 放行，查看所有租户数据）；新增 `TENANT_ADMIN`=租户管理员（每租户开通时创建，`data_scope=ALL`，菜单=除 `system:tenant:*` 外全部，管理员用户绑它）；`RoleCodes`/`data.sql`/`bootstrapTenant` 同步；迁移 `sql/migrate-tenant-admin-role.sql`（存量非默认租户 ROOT→TENANT_ADMIN）+ `sql/migrate-sys-admin-perms.sql`（默认租户 ROOT 挂全菜单）；菜单权限分配弹窗 `MenuPermissionDialog` 改可折叠树 + 名称/路径/权限三查询条件；主键确认=雪花（`BaseEntity @TableId(ASSIGN_ID)` + 全局 `id-type=assign_id`，int8 列，无需改）
- 2026-07-30: 菜单管理前端改可展开/折叠树表（`collapsedIds`，默认全展开，有子节点显示箭头）；修复根菜单上级下拉空白（`parentId=0` 归一为"顶级菜单"，id 统一 `String`）；菜单查询加 `path`/`perm`（后端 `MenuQuery`+`listMenus` like，前端三字段查询区+回车查询）；新增前端 `IconPicker` 共享组件（lucide 图标网格+搜索，动态 `import` 独立 chunk）替代菜单图标文本输入；顶栏右上角头像（后端 `UserInfoVO` 加 `avatar`=objectKey，前端 `me()` 转 `fileApi.urlByKey` 预签名 URL，`MainLayout` 显示 img/首字母）；接口调用2次=React `StrictMode` 开发模式双触发 effect，生产构建无
- 2026-07-29: 预签名有效期 `default-expiry-seconds=86400` 与 JWT `expire-seconds` 对齐；注释/文档统一为"私有桶统一预签名"（SysFileController `/{id}/url`、SysFileService javadoc、project_context 接口/复用清单）；前端用户表单头像改为文件选择（`fileApi.upload` biz=avatar 存 objectKey、预览走 `fileApi.urlByKey` 预签名，提交仍为 object_key）
- 2026-07-29: 私有桶（`public-read=false`，全预签名 + `getAccessibleUrl`/`getAccessibleUrlByKey` 归属校验；存量桶须 `mc anonymous set none`）；`avatar` 落 `object_key`，`UserPageVO` 返回预签名 URL
- 2026-07-29: 文件落库 `sys_file` + 权限归属（列表 `@DataPermission` / 私有访问 `assertAccessible` / 删除 `assertManageable` 限本人+ALL）；CLAUDE.md/AGENTS.md 增"建表/字段必写 COMMENT"规范；`sql/migrate-sys-file.sql`
- 2026-07-29: 接入 common-minio + `SysFileController`（`/api/v1/files/**`）；依赖 MinIO Docker 本地
- 2026-07-29: 强制改密改为 `last_password_change_time`（NULL 始终强制；过期天数默认 0 不启用）
- 2026-07-29: 租户事务开通；登录 tenantCode；deptId 必填+越权；默认密码可配；salon_store/salon_member + 前端租户/门店/会员页
- 2026-07-28: user/role/menu 按钮种子 + 三 Controller `@PreAuthorize`；perms 走 JWT authorities
