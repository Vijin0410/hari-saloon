-- 角色模型重构迁移：ROOT=系统管理员（仅默认租户，跨租户），租户内管理员=TENANT_ADMIN
-- 适用：按旧模型（每租户一个 ROOT 绑给租户管理员）开通的存量库
-- 新租户开通(SysTenantServiceImpl.bootstrapTenant)已自动创建 TENANT_ADMIN 并挂「除租户管理外」菜单
-- 顺序：先跑本脚本重定义角色，再按需跑 migrate-sys-admin-perms.sql 补 ROOT 全量权限

-- 1) 默认租户 ROOT 改名「系统管理员」（语义对齐；跨租户由 WjTenantLineHandler 对 ROOT 放行）
UPDATE sys_role SET name = '系统管理员'
WHERE code = 'ROOT' AND tenant_id = 1 AND deleted = 0;

-- 2) 非默认租户的原 ROOT 重定义为 TENANT_ADMIN（租户管理员，本租户全部数据）
UPDATE sys_role SET code = 'TENANT_ADMIN', name = '租户管理员'
WHERE code = 'ROOT' AND tenant_id <> 1 AND deleted = 0;

-- 3) TENANT_ADMIN 移除「租户管理」菜单（system:tenant:* 仅系统管理员可见）
DELETE FROM sys_role_menu
WHERE type = 1
  AND menu_id IN (SELECT id FROM sys_menu WHERE perm LIKE 'system:tenant:%')
  AND role_id IN (SELECT id FROM sys_role WHERE code = 'TENANT_ADMIN' AND deleted = 0);

-- 4) TENANT_ADMIN 补挂「除租户管理外」全部菜单（幂等）
INSERT INTO sys_role_menu (role_id, menu_id, type)
SELECT r.id, m.id, 1
FROM sys_role r
CROSS JOIN sys_menu m
WHERE r.code = 'TENANT_ADMIN'
  AND r.deleted = 0
  AND m.deleted = 0
  AND m.id NOT IN (SELECT id FROM sys_menu WHERE perm LIKE 'system:tenant:%')
  AND NOT EXISTS (
      SELECT 1 FROM sys_role_menu rm
      WHERE rm.role_id = r.id AND rm.menu_id = m.id AND rm.type = 1
  );
