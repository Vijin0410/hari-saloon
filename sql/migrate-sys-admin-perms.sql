-- 系统管理员（默认租户 ROOT 角色）按钮权限补全：挂全部菜单（含按钮 perm）
-- 适用：application.yml 中 sql.init.mode=never，data.sql 未自动执行 / 后续新增菜单未同步的存量库
-- 幂等：已存在的 (role_id, menu_id, type=1) 跳过
-- 说明：默认租户(tenant_id=1) 的 ROOT 角色即「系统管理员」(admin/admin123)，
--       前端 hasPermission 对 ROOT 直接放行；后端 @PreAuthorize 走 JWT authorities(perm)，
--       故须保证 ROOT 挂全部菜单(含按钮)，后端鉴权才齐全。

INSERT INTO sys_role_menu (role_id, menu_id, type)
SELECT r.id, m.id, 1
FROM sys_role r
CROSS JOIN sys_menu m
WHERE r.code = 'ROOT'
  AND r.tenant_id = 1
  AND r.deleted = 0
  AND m.deleted = 0
  AND NOT EXISTS (
      SELECT 1 FROM sys_role_menu rm
      WHERE rm.role_id = r.id AND rm.menu_id = m.id AND rm.type = 1
  );
