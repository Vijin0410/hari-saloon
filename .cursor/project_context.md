# 项目上下文记忆

> 最后更新: 2026-07-28 15:20:00

## 模块与包

- 单体多模块：`hair-salon-boot` / `system` / `auth` / `service`
- 根包 `com.wangjin.salon`；框架 `com.wangjin.*`（wj-framework）
- 统一响应：`com.wangjin.common.result.Result` / `PageResult`
- DB：PostgreSQL `hair_salon`；Redis；JWT 无状态

## 后端接口清单

- `POST /auth/login` - 登录，JWT 含 roles/perms/tenant/dataScope (AuthController#login)【公开】
- `GET /auth/me` - 当前用户 (AuthController#me)
- `GET /api/v1/users/page` - 用户分页 + @QueryDict (SysUserController#getUserPage)
- `POST /api/v1/users` - 新增用户 (SysUserController#saveUser)
- `GET /api/v1/users/{id}/form` - 用户表单回显（存量 Form，规范要求新代码改 VO）
- `PUT /api/v1/users/{id}` - 修改用户
- `DELETE /api/v1/users` - 删除用户 ids
- `PATCH /api/v1/users/{id}/password|status` - 重置密码 / 改状态
- `GET /api/v1/users/me` - 登录用户信息 VO
- `GET|POST|PUT|DELETE /api/v1/roles|menus|dept|dict|tenants` - 系统管理 CRUD（见 README）

## 可复用的后端方法/组件

- **SysUserService#getUserAuthInfo** - 登录鉴权信息（roles/perms/dataScope）
- **SysUserService#getUserLoginInfo** - 当前用户 UserInfoVO
- **MapStruct converters** - `system.converter.*` Entity↔Form/VO
- **@DataPermission** - Mapper 行级数据权限
- **SecurityUtils** - 当前用户/租户/ROOT/数据范围
- **@Dict + @QueryDict** - 字典/部门名翻译

## 权限与菜单

- 种子已有：`system:user:list|add|edit|delete`，以及 role/menu/dept/dict/tenant 的 `*:list`
- 规范：业务接口 `@PreAuthorize("hasAuthority('…')")`；公开/三方除外
- **待办**：system 完善各资源按钮级菜单与 perm，并给存量 Controller 补注解

## 关键配置

- `wj.security.jwt.ignore-urls` - 匿名白名单
- `wj.mybatis.tenant-enabled` / `data-permission-enabled` / `ignore-tables`

## 最近更新

- 2026-07-28: 从旧 Cursor 规范迁入 `.cursor/rules`（剔除微服务/前端；包名 com.wangjin.salon；强制出参 VO + @PreAuthorize）
