# 项目上下文记忆

> 最后更新: 2026-07-30

## 模块与包

- 单体多模块：`hair-salon-boot` / `system` / `auth` / `service`
- 根包 `com.wangjin.salon`；框架 `com.wangjin.*`（wj-framework）
- 统一响应：`com.wangjin.common.result.Result` / `PageResult`
- DB：PostgreSQL `hair_salon`；Redis；JWT 无状态

## 多租户 / 组织 / 门店模型

- **租户** `sys_tenant`：连锁品牌边界；开通事务：TENANT_ADMIN/STORE_MANAGER/STORE_STAFF + 管理员用户（绑 TENANT_ADMIN，不挂部门）+ 可选联合创建初始门店并绑定管理员；ROOT=系统管理员仅默认租户。部门与门店已解耦，开通不再建总部部门
- **部门** `sys_dept`：租户内可选组织树，由租户管理员自行维护；用户 `dept_id` 可空（亦可仅绑门店），非空时为 system 数据权限锚点
- **角色 data_scope**：ALL=1 / DEPT_AND_SUB=2 / DEPT=3 / SELF=4 / CUSTOM=5
- **门店** `salon_store`：业务门店档案，独立于 `sys_dept`；门店数据权限走 `salon_store_user`
- **会员** `salon_member`：`tenant_id` + `store_id`；列表/写操作按授权门店范围过滤
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
- `GET|POST|PUT|DELETE /api/v1/users` - 用户；`deptId` 可选 + 越权校验；`storeIds` 多选绑定门店；`system:user:*`
- `PATCH /api/v1/users/password/{id}` - 管理员重置（仍须改密）
- `PATCH /api/v1/users/me/password` - 自己改密
- `GET|POST|PUT|DELETE /api/v1/roles|menus` - 按钮级 `@PreAuthorize`；菜单列表 `GET /api/v1/menus` 支持 `keywords`/`path`/`perm` 模糊查询；菜单路由 `GET /api/v1/menus/routes` 按当前 JWT 权限过滤非按钮菜单并按 `meta.rank` 排序，返回 `perm/type`
- `GET|POST|PUT|DELETE /api/v1/dept` - `system:dept:*`；options 仅登录
- `GET|POST|PUT|DELETE|PATCH /api/v1/tenants` - 开通编排；`system:tenant:*`
- `POST /api/v1/files/upload|upload/batch`（落库返 `SysFileVO`，入参 biz/bizId/isPublic）/ `DELETE /delete/{id}` · `/delete/batch?ids=`（联动 MinIO，限本人/ALL）/ `GET /url/{id}`（私有桶统一预签名：公开不校验归属，私有校验归属）/ `GET /url?objectKey=`（统一预签名，展示用）/ `GET /page`（`@DataPermission`） - `isAuthenticated()`；业务表存 `object_key` 软关联

### 业务
- `GET|POST|PUT|DELETE /api/v1/stores` / `GET /api/v1/stores/options` - 门店；`biz:store:*`；列表/下拉按 `salon_store_user` 门店范围过滤（options 也允许会员相关权限 + `system:user:list` 调用，供用户表单选门店）
- `GET|POST|PUT|DELETE /api/v1/members` - 会员；`biz:member:*`；分页按 `store_id` 门店范围过滤 + `@QueryDict`

## 可复用的后端方法/组件

- **SysTenantService#saveTenant** - 事务开通租户
- **TenantContextRunner** - 临时切换租户写库/登录查人
- **SysUserService#getUserAuthInfo(username, tenantId)** - 登录鉴权
- **SysUserService#changeOwnPassword** - 写 `last_password_change_time=now`
- **SysUserService#isPasswordResetRequired** - NULL 或超期 → 须改密
- **SalonProperties** - 默认密码 + passwordExpireDays
- **@DataPermission** - Mapper 行级；**SecurityUtils** - 当前用户/租户/ROOT/数据范围
- **SalonStorePermissionService** - salon 业务门店范围：ROOT/ALL 全量；其他用户按 `salon_store_user.store_id` + 本人创建兜底过滤
- **SalonStorePort**（SPI，system 定义 / service 实现 `SalonStorePortImpl`）- 跨模块门店端口：`provisionInitialStore`（开通联合建店）、`syncUserStores`（用户绑多门店，全量覆盖）、`listUserStoreIds`（回显）；解 system↔service 循环依赖
- **RoleCodes**（Enum）- ROOT/TENANT_ADMIN/STORE_MANAGER/STORE_STAFF 预置角色编码 + `isPreset(code)`；编辑预置角色禁改 code、禁新建/改名 ROOT；同租户 code 唯一（DB `uk_sys_role_code_tenant` + TenantLine）
- **MinioService**（wj common-minio）- upload/delete/getPublicUrl/getPresignedUrl
- **SysFileService** - `uploadAndSave`（传 MinIO + 落 sys_file，落库失败补删避免孤儿）/ `delete`（逻辑删 + 删 MinIO，限本人/ALL）/ `getAccessibleUrl`（私有桶统一预签名：公开不校验归属 / 私有校验归属）；sys_file 走 `@DataPermission`

## 权限与菜单（种子）

- 模型：目录/菜单 type=1/2 `perm=NULL`（只存 path/component）；按钮 type=4 挂 perm
- 按钮 perm（每资源）：`:list` 查看列表 / `:view` 查看详情 / `:add` / `:edit` / `:delete` / `:status` 改状态 / `:password` 重置密码 / `:assign` 角色分配菜单
- 公用接口 `isAuthenticated()`（不挂 perm）：各 `options` 下拉、`/me`、`/me/password`、`/menus/routes`
- 按钮 id：用户 21-27、角色 31-37、菜单 41-45、部门 51-55、字典 61-65、租户 71-76、门店 91-95、会员 101-105
- 预置角色菜单：ROOT 全量；店长（data_scope=1）用户全+部门(查/增/改)+门店(查/增/改)+会员(查/增/改/删)；店员会员(查/增/改)
- 默认 `sql.init.mode=never`：重置跑 `sql/truncate-all.sql` 再 `data.sql`

## 关键配置

- `wj.security.jwt.ignore-urls` - 仅 `/auth/login` 等公开（已去掉 register）
- `wj.mybatis.tenant-enabled` / `data-permission-enabled` / `ignore-tables`（含 sys_menu）
- `wj.salon.default-password` / `wj.salon.password-expire-days`（默认 0 关闭过期；设 90 等即启用）
- `wj.minio.*` - common-minio；`public-read=false`（私有桶，全预签名 + `getAccessibleUrl` 归属校验；存量桶须 `mc anonymous set none`）；`default-expiry-seconds=86400`（与 JWT `expire-seconds` 对齐）；`endpoint-enabled=false`（用 SysFileController）；本地 Docker `../wj-framework/docs/minio-deploy.md`
- 文件字段约定：业务表（如 `sys_user.avatar`）存 `object_key`；`UserPageVO` 返回时转预签名 URL；表单回显给 object_key，预览调 `GET /files/url?objectKey=`

## 最近更新
- 2026-08-05: 管理员跨租户/门店筛选。ROOT 登录在门店/会员/用户/角色/部门/字典列表显示「租户筛选」（会员/用户另加「门店筛选」，门店下拉跟随所选租户）；租户管理员在会员/用户列表显示「门店筛选」（本租户全量）；店长/店员不显示筛选条件。后端：各列表 query 加 `tenantId`（会员/用户加 `storeId`），**非 ROOT 一律清空 tenantId**（TenantLine 自动限本租户，防越权），ROOT 传时显式 `tenant_id` 过滤（XML `SalonStoreMapper`/`SalonMemberMapper`/`SysUserMapper` + Wrapper `SysRole`/`SysDept`/`SysDict`/`SysDictType`，会员 XML 加 `store_id`）；门店 options `GET /api/v1/stores/options` 加可选 `tenantId`（ROOT 按租户过滤、非 ROOT 忽略，`SalonStoreService.listStoreOptions(Long)`）；租户 options `GET /api/v1/tenants/options`（value=id，`isAuthenticated()`，已存在）供 ROOT 筛选。前端：抽 `useTenantStoreFilter({withStore})` hook（`showTenant=isRoot`、`showStore=withStore&&(isRoot||isTenantAdmin)`，门店下拉 ROOT 跟随租户/TENANT_ADMIN 本租户/其它按授权范围；`changeTenant` 联动重置门店），6 页筛选区按角色显示；`systemTypes`/`dictTypes` 各 query 加 `tenantId`/`storeId`，`tenantApi.options()`、`storeApi.options(tenantId?)`。
- 2026-08-05: 权限模型重构 + 门店数据权限落地。(1) 菜单 type=1/2 不挂 perm（perm=NULL，只存 path/component）；按钮 type=4 挂 `:list/:view/:add/:edit/:delete/:status/:password/:assign`；`listRoutes` 运行时从子按钮 `:list` 推导 perm（`SysMenuMapper.xml` 子查询 `b.perm LIKE '%:list'`），前端 `MainLayout`/`PermissionRoute` 无感。(2) 业务接口每个一个 perm 不重复：form/detail 用 `:view`、改状态 `:status`、重置密码 `:password`（不再复用 `:edit`）；公用 options/me/routes 改 `isAuthenticated()`。(3) 门店数据权限：sys_user 列表加门店过滤（`UserPageQuery.storeScopeAll/permittedStoreIds` + `SysUserMapper.xml` JOIN `salon_store_user`，ROOT/租户管理员全量、店长/店员按 `salon_store_user` 限本门店）；`SalonStorePermissionService` 放行条件 `isAllDataScope()` 改 `isRoot()||isTenantAdmin()`（解耦：店长 data_scope=ALL 不再触发门店全量）。(4) 店长 `data_scope` 2->1（ALL），店员 SELF 不变；`STORE_MANAGER_MENU_IDS/STORE_STAFF_MENU_IDS` 同步新按钮 id。(5) SQL 重生成：`data.sql` 菜单种子重写（按钮 id 21-105 重排）、`schema.sql` 加 sys_menu type/perm 注释、新增 `sql/truncate-all.sql`。前端：用户/角色/租户"启用禁用"按钮 perm 从 `:edit` 拆为 `:status`。
- 2026-08-04: 模型字段说明规范 + update 三态契约落地。(1) Entity 每字段 `/** */` Javadoc；Form/Query/VO 每字段 `@Schema(description=...)`（简体中文）；写入 `CLAUDE.md`/`AGENTS.md` §1「模型字段说明」+ §2.1「字段更新契约」。(2) update 三态（传值更新/传 null 清空/不传保持）：后端可清空字段标 `@TableField(updateStrategy = FieldStrategy.ALWAYS)`（`IGNORED` 已废弃，勿用），`updateById` 时 null 即写 NULL；`password`/`lastPasswordChangeTime` 等保持默认 `NOT_NULL`，service 置 null 跳过。前端 toPayload 可选字段清空传 `null`（非 `undefined`），Payload 类型加 `| null`。ALWAYS 字段清单：`SysUser`(phone/email/avatar/deptId)、`SysDept`(leaderId)、`SysRole`(deptIds)、`SysDict`(remark)、`SysDictType`(remark/groupCode)、`SysTenant`(contact/phone/remark/expireTime)、`SysMenu`(component/redirect/perm/apiPath/remark)、`SalonMember`(phone/birthday/remark/source)、`SalonStore`(phone/address/province/city/district/longitude/latitude/businessHours/restDays/remark/openTime/closeTime)。注：当前 update 为全量表单 PUT，"不传保持"不触发；新增纯 PATCH 部分更新接口前须先引入 `JsonNullable`（POJO 无法区分 absent/null）
- 2026-07-31: dept/store 解耦后续——租户开通不再建总部部门（可选联合创建初始门店并绑定管理员，`TenantForm.store`）；部门改为租户内可选功能（`UserForm.deptId` 可空，`assertDeptAndRolesAssignable` 仅在指定部门时校验）；用户新增/编辑增加 `storeIds` 多选绑定门店（新增 `SalonStorePort` SPI 跨模块同步 `salon_store_user`；门店 options 放行 `system:user:list`）；`RoleCodes` 升级为 Enum + `isPreset()`，角色编辑禁改预置编码、禁新建/改名 ROOT（同租户 code 唯一 = DB 索引 + TenantLine）。前端：租户表单加可选门店块、用户表单门店多选+部门可选、角色 code 预置禁用、新增 DeptPage 部门管理页（路由+菜单映射+deptApi CRUD）
- 2026-07-30: 门店与部门解耦：`salon_store` 去掉 `dept_id`，新增 `salon_store_user` 维护门店-用户数据范围；`salon_member.dept_id` 改为 `store_id`；门店/会员列表和写操作按授权门店过滤；前端门店表单增加授权用户，会员表单改门店下拉；新增 `sql/migrate-store-data-scope.sql`

- 2026-07-30: 菜单编辑支持移动到顶级菜单（`parent_id=0`），保存时禁止选择自身/子孙作为父级，并级联刷新子孙 `tree_path`；菜单上级下拉改树形缩进展示；用户新增/编辑表单的所属部门改为部门名称下拉，提交仍用 `deptId`
- 2026-07-30: 统一 Controller 路径 ID 规则：禁止 `PUT|DELETE /{id}` 这类单独 ID 路径；动作/视图前置为 `/form/{id}`、`/detail/{id}`、`/update/{id}`、`/delete/{id}`、`/status/{id}`、`/password/{id}`；同步后端 Controller 与前端 API 封装，并写入 `AGENTS.md` / `CLAUDE.md`
- 2026-07-30: 菜单路由 `GET /api/v1/menus/routes` 改为按当前用户 JWT 权限过滤，ROOT 全量，普通用户仅返回有权限菜单及其可见父级；菜单/路由树统一按 `meta.rank` 升序、id 兜底排序；前端侧栏改读取路由树并用权限码映射到现有页面路由，菜单管理列表新增 Rank 列
- 2026-07-30: 角色模型重构—ROOT=系统管理员（仅默认租户，跨租户：`WjTenantLineHandler.ignoreTable` 对 `SecurityUtils.isRoot()` 放行，查看所有租户数据）；新增 `TENANT_ADMIN`=租户管理员（每租户开通时创建，`data_scope=ALL`，菜单=除 `system:tenant:*` 外全部，管理员用户绑它）；`RoleCodes`/`data.sql`/`bootstrapTenant` 同步；迁移 `sql/migrate-tenant-admin-role.sql`（存量非默认租户 ROOT→TENANT_ADMIN）+ `sql/migrate-sys-admin-perms.sql`（默认租户 ROOT 挂全菜单）；菜单权限分配弹窗 `MenuPermissionDialog` 改可折叠树 + 名称/路径/权限三查询条件；主键确认=雪花（`BaseEntity @TableId(ASSIGN_ID)` + 全局 `id-type=assign_id`，int8 列，无需改）
- 2026-07-30: 菜单管理前端改可展开/折叠树表（`collapsedIds`，默认全展开，有子节点显示箭头）；修复根菜单上级下拉空白（`parentId=0` 归一为"顶级菜单"，id 统一 `String`）；菜单查询加 `path`/`perm`（后端 `MenuQuery`+`listMenus` like，前端三字段查询区+回车查询）；新增前端 `IconPicker` 共享组件（lucide 图标网格+搜索，动态 `import` 独立 chunk）替代菜单图标文本输入；顶栏右上角头像（后端 `UserInfoVO` 加 `avatar`=objectKey，前端 `me()` 转 `fileApi.urlByKey` 预签名 URL，`MainLayout` 显示 img/首字母）；接口调用2次=React `StrictMode` 开发模式双触发 effect，生产构建无
- 2026-07-29: 预签名有效期 `default-expiry-seconds=86400` 与 JWT `expire-seconds` 对齐；注释/文档统一为"私有桶统一预签名"（SysFileController `/url/{id}`、SysFileService javadoc、project_context 接口/复用清单）；前端用户表单头像改为文件选择（`fileApi.upload` biz=avatar 存 objectKey、预览走 `fileApi.urlByKey` 预签名，提交仍为 object_key）
- 2026-07-29: 私有桶（`public-read=false`，全预签名 + `getAccessibleUrl`/`getAccessibleUrlByKey` 归属校验；存量桶须 `mc anonymous set none`）；`avatar` 落 `object_key`，`UserPageVO` 返回预签名 URL
- 2026-07-29: 文件落库 `sys_file` + 权限归属（列表 `@DataPermission` / 私有访问 `assertAccessible` / 删除 `assertManageable` 限本人+ALL）；CLAUDE.md/AGENTS.md 增"建表/字段必写 COMMENT"规范；`sql/migrate-sys-file.sql`
- 2026-07-29: 接入 common-minio + `SysFileController`（`/api/v1/files/**`）；依赖 MinIO Docker 本地
- 2026-07-29: 强制改密改为 `last_password_change_time`（NULL 始终强制；过期天数默认 0 不启用）
- 2026-07-29: 租户事务开通；登录 tenantCode；deptId 必填+越权；默认密码可配；salon_store/salon_member + 前端租户/门店/会员页
- 2026-07-28: user/role/menu 按钮种子 + 三 Controller `@PreAuthorize`；perms 走 JWT authorities
