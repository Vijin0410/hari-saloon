# 项目上下文记忆

> 最后更新: 2026-07-28 18:40:00

## 模块与包

- 单体多模块：`hair-salon-boot` / `system` / `auth` / `service`
- 根包 `com.wangjin.salon`；框架 `com.wangjin.*`（wj-framework）
- 统一响应：`com.wangjin.common.result.Result` / `PageResult`
- DB：PostgreSQL `hair_salon`；Redis；JWT 无状态

## 后端接口清单

- `POST /auth/login` - 登录，JWT 含 roles/perms/tenant/dataScope (AuthController#login)【公开】
- `GET /auth/me` - 当前用户 (AuthController#me)
- `GET /api/v1/users/page` - 用户分页 + @QueryDict + `system:user:list`
- `POST /api/v1/users` - 新增用户 `system:user:add`
- `GET /api/v1/users/{id}/form` - 用户表单回显（存量 Form，规范要求新代码改 VO）`system:user:list`
- `PUT /api/v1/users/{id}` - 修改用户 `system:user:edit`
- `DELETE /api/v1/users` - 删除用户 `system:user:delete`
- `PATCH /api/v1/users/{id}/password|status` - 重置密码 / 改状态 `system:user:edit`
- `GET /api/v1/users/me` - 登录用户信息 VO `isAuthenticated()`
- `GET|POST|PUT|DELETE /api/v1/roles|menus` - 已加按钮级 `@PreAuthorize`；dept/dict/tenant 待补

## 可复用的后端方法/组件

- **SysUserService#getUserAuthInfo** - 登录鉴权信息（roles/perms/dataScope）
- **SysUserService#getUserLoginInfo** - 当前用户 UserInfoVO
- **MapStruct converters** - `system.converter.*` Entity↔Form/VO
- **@DataPermission** - Mapper 行级数据权限
- **SecurityUtils** - 当前用户/租户/ROOT/数据范围
- **@Dict + @QueryDict** - 字典/部门名翻译
- **JwtUtils + JwtAuthenticationFilter** - perms 写入 JWT `authorities` 并还原为 `GrantedAuthority`

## 权限与菜单

- 链路：角色菜单按钮 `perm` → 登录 `listRolePerms` → JWT claim `authorities` → Filter 转 `GrantedAuthority` → `@PreAuthorize("hasAuthority('…')")`
- 分配接口：`PUT /api/v1/roles/{id}/{type}/menus`（角色挂菜单/按钮）；用户 CRUD 的 `roleIds`（用户挂角色）
- 种子菜单页：`system:user|role|menu|dept|dict|tenant:list`
- 种子按钮（type=4）：
  - user：`add|edit|delete`（id 21–23）
  - role：`add|edit|delete|assign`（id 31–34）
  - menu：`add|edit|delete`（id 41–43）
- 已加 `@PreAuthorize`：`SysUserController` / `SysRoleController` / `SysMenuController`
  - 列表/表单读：`*:list`；写：`add|edit|delete`；角色授权：`system:role:assign`
  - 仅登录：`GET /users/me`、`GET /menus/routes` → `isAuthenticated()`
- **待办**：dept/dict/tenant 按钮种子 + Controller 注解；`listRoutes` 按角色过滤

## 关键配置

- `wj.security.jwt.ignore-urls` - 匿名白名单
- `wj.mybatis.tenant-enabled` / `data-permission-enabled` / `ignore-tables`
- 默认 `sql.init.mode=never`：已有库不会自动跑 data.sql，新按钮需手工插入或临时改 mode 灌库后改回

## 最近更新

- 2026-07-28: user/role/menu 按钮种子 + 三 Controller `@PreAuthorize`；perms 走 JWT authorities（非 Redis @ss）
- 2026-07-28: 从旧 Cursor 规范迁入 `.cursor/rules`（剔除微服务/前端；包名 com.wangjin.salon；强制出参 VO + @PreAuthorize）
