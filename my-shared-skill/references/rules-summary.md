# Rules Summary

## 分层

- Controller 只调 Service，不直连 Mapper
- Service 负责业务和事务
- Mapper 只做数据访问
- Entity 不直接返回给前端

## HTTP 出入参

- 出参必须用 `VO` / `Result` / `PageResult`
- `Form` 只用于写入参，不作为出参
- 新增或编辑时，VO / Form 要分开

## 权限与安全

- Controller 默认加 `@PreAuthorize`
- 公开登录、注册、第三方回调等接口另行放行
- 权限码和菜单 `perm` 保持一致
- 需要登录的接口用 `isAuthenticated()`

## 字典 / 租户 / 数据权限

- 字典展示用 `@Dict` / `@QueryDict`
- 多租户实体继承 `BaseTenantEntity`
- 行级数据权限走 `@DataPermission`

## SQL / Mapper

- Mapper 放在模块自身的 `mapper` 包
- XML 和查询逻辑保持清晰分层
- 不要把业务逻辑写进 SQL 里

## 记忆维护

- 新增可复用接口、权限点、配置约定后，更新 `references/project-context.md`
- 只做纯格式化或临时修复时，可以不改项目记忆
