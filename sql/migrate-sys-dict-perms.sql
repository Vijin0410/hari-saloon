-- 字典管理按钮权限种子（补 data.sql 缺失的 system:dict:add/edit/delete）
-- 适用：已初始化的库（application.yml 中 sql.init.mode=never，data.sql 不会自动执行时手动跑）
-- 字典菜单(id=6, system:dict:list) 已在 data.sql 中存在，本脚本仅补按钮权限并挂到 ROOT。

-- 字典按钮
INSERT INTO sys_menu (id, parent_id, name, type, tree_path, meta, perm, tenant_id, create_by, create_time, update_by, update_time, deleted)
SELECT 61, 6, 'dictAdd', 4, '0,1,6', '{"title":"新增字典"}', 'system:dict:add', 1, 0, CURRENT_TIMESTAMP, 0, CURRENT_TIMESTAMP, 0
WHERE NOT EXISTS (SELECT 1 FROM sys_menu WHERE id = 61);
INSERT INTO sys_menu (id, parent_id, name, type, tree_path, meta, perm, tenant_id, create_by, create_time, update_by, update_time, deleted)
SELECT 62, 6, 'dictEdit', 4, '0,1,6', '{"title":"编辑字典"}', 'system:dict:edit', 1, 0, CURRENT_TIMESTAMP, 0, CURRENT_TIMESTAMP, 0
WHERE NOT EXISTS (SELECT 1 FROM sys_menu WHERE id = 62);
INSERT INTO sys_menu (id, parent_id, name, type, tree_path, meta, perm, tenant_id, create_by, create_time, update_by, update_time, deleted)
SELECT 63, 6, 'dictDelete', 4, '0,1,6', '{"title":"删除字典"}', 'system:dict:delete', 1, 0, CURRENT_TIMESTAMP, 0, CURRENT_TIMESTAMP, 0
WHERE NOT EXISTS (SELECT 1 FROM sys_menu WHERE id = 63);

-- ROOT 挂字典按钮（type=1 Web 端菜单授权）
INSERT INTO sys_role_menu (role_id, menu_id, type)
SELECT 1, m.id, 1 FROM sys_menu m
WHERE m.id IN (61, 62, 63)
  AND NOT EXISTS (SELECT 1 FROM sys_role_menu rm WHERE rm.role_id = 1 AND rm.menu_id = m.id AND rm.type = 1);
