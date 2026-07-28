-- 默认租户 1 种子数据

INSERT INTO sys_tenant (id, name, code, status, contact, phone, remark, create_by, create_time, update_by, update_time, deleted)
SELECT 1, '默认门店', 'default', 1, '管理员', '15061952394', '系统默认租户', 0, CURRENT_TIMESTAMP, 0, CURRENT_TIMESTAMP, 0
WHERE NOT EXISTS (SELECT 1 FROM sys_tenant WHERE id = 1);

INSERT INTO sys_dept (id, name, parent_id, tree_path, sort, status, tenant_id, create_by, create_time, update_by, update_time, deleted)
SELECT 100, '总店', 0, '0', 1, 1, 1, 0, CURRENT_TIMESTAMP, 0, CURRENT_TIMESTAMP, 0
WHERE NOT EXISTS (SELECT 1 FROM sys_dept WHERE id = 100);

-- ROOT 角色：data_scope=1（全部），管理员本租户全量
INSERT INTO sys_role (id, name, code, sort, status, data_scope, tenant_id, create_by, create_time, update_by, update_time, deleted)
SELECT 1, '超级管理员', 'ROOT', 1, 1, 1, 1, 0, CURRENT_TIMESTAMP, 0, CURRENT_TIMESTAMP, 0
WHERE NOT EXISTS (SELECT 1 FROM sys_role WHERE code = 'ROOT' AND tenant_id = 1);

INSERT INTO sys_user (id, username, password, nickname, phone, status, dept_id, gender, tenant_id, create_by, create_time, update_by, update_time, deleted)
SELECT 1, 'admin', '{noop}admin123', '管理员', '15061952394', 1, 100, 1, 1, 0, CURRENT_TIMESTAMP, 0, CURRENT_TIMESTAMP, 0
WHERE NOT EXISTS (SELECT 1 FROM sys_user WHERE username = 'admin' AND tenant_id = 1);

INSERT INTO sys_user_role (user_id, role_id)
SELECT 1, 1
WHERE NOT EXISTS (SELECT 1 FROM sys_user_role WHERE user_id = 1 AND role_id = 1);

INSERT INTO sys_menu (id, parent_id, name, type, path, component, redirect, tree_path, meta, perm, tenant_id, create_by, create_time, update_by, update_time, deleted)
SELECT 1, 0, 'system', 2, '/system', 'Layout', '/system/user', '0',
       '{"title":"系统管理","icon":"setting","rank":100,"showLink":true}',
       NULL, 1, 0, CURRENT_TIMESTAMP, 0, CURRENT_TIMESTAMP, 0
WHERE NOT EXISTS (SELECT 1 FROM sys_menu WHERE id = 1);

INSERT INTO sys_menu (id, parent_id, name, type, path, component, tree_path, meta, perm, tenant_id, create_by, create_time, update_by, update_time, deleted)
SELECT 2, 1, 'systemUser', 1, 'user', 'system/user/index', '0,1',
       '{"title":"用户管理","icon":"user","rank":1,"showLink":true}',
       'system:user:list', 1, 0, CURRENT_TIMESTAMP, 0, CURRENT_TIMESTAMP, 0
WHERE NOT EXISTS (SELECT 1 FROM sys_menu WHERE id = 2);

INSERT INTO sys_menu (id, parent_id, name, type, path, component, tree_path, meta, perm, tenant_id, create_by, create_time, update_by, update_time, deleted)
SELECT 3, 1, 'systemRole', 1, 'role', 'system/role/index', '0,1',
       '{"title":"角色管理","icon":"peoples","rank":2,"showLink":true}',
       'system:role:list', 1, 0, CURRENT_TIMESTAMP, 0, CURRENT_TIMESTAMP, 0
WHERE NOT EXISTS (SELECT 1 FROM sys_menu WHERE id = 3);

INSERT INTO sys_menu (id, parent_id, name, type, path, component, tree_path, meta, perm, tenant_id, create_by, create_time, update_by, update_time, deleted)
SELECT 4, 1, 'systemMenu', 1, 'menu', 'system/menu/index', '0,1',
       '{"title":"菜单管理","icon":"tree-table","rank":3,"showLink":true}',
       'system:menu:list', 1, 0, CURRENT_TIMESTAMP, 0, CURRENT_TIMESTAMP, 0
WHERE NOT EXISTS (SELECT 1 FROM sys_menu WHERE id = 4);

INSERT INTO sys_menu (id, parent_id, name, type, path, component, tree_path, meta, perm, tenant_id, create_by, create_time, update_by, update_time, deleted)
SELECT 5, 1, 'systemDept', 1, 'dept', 'system/dept/index', '0,1',
       '{"title":"部门管理","icon":"tree","rank":4,"showLink":true}',
       'system:dept:list', 1, 0, CURRENT_TIMESTAMP, 0, CURRENT_TIMESTAMP, 0
WHERE NOT EXISTS (SELECT 1 FROM sys_menu WHERE id = 5);

INSERT INTO sys_menu (id, parent_id, name, type, path, component, tree_path, meta, perm, tenant_id, create_by, create_time, update_by, update_time, deleted)
SELECT 6, 1, 'systemDict', 1, 'dict', 'system/dict/index', '0,1',
       '{"title":"字典管理","icon":"dict","rank":5,"showLink":true}',
       'system:dict:list', 1, 0, CURRENT_TIMESTAMP, 0, CURRENT_TIMESTAMP, 0
WHERE NOT EXISTS (SELECT 1 FROM sys_menu WHERE id = 6);

INSERT INTO sys_menu (id, parent_id, name, type, path, component, tree_path, meta, perm, tenant_id, create_by, create_time, update_by, update_time, deleted)
SELECT 7, 1, 'systemTenant', 1, 'tenant', 'system/tenant/index', '0,1',
       '{"title":"租户管理","icon":"office-building","rank":0,"showLink":true}',
       'system:tenant:list', 1, 0, CURRENT_TIMESTAMP, 0, CURRENT_TIMESTAMP, 0
WHERE NOT EXISTS (SELECT 1 FROM sys_menu WHERE id = 7);

INSERT INTO sys_menu (id, parent_id, name, type, tree_path, meta, perm, tenant_id, create_by, create_time, update_by, update_time, deleted)
SELECT 21, 2, 'userAdd', 4, '0,1,2', '{"title":"新增用户"}', 'system:user:add', 1, 0, CURRENT_TIMESTAMP, 0, CURRENT_TIMESTAMP, 0
WHERE NOT EXISTS (SELECT 1 FROM sys_menu WHERE id = 21);
INSERT INTO sys_menu (id, parent_id, name, type, tree_path, meta, perm, tenant_id, create_by, create_time, update_by, update_time, deleted)
SELECT 22, 2, 'userEdit', 4, '0,1,2', '{"title":"编辑用户"}', 'system:user:edit', 1, 0, CURRENT_TIMESTAMP, 0, CURRENT_TIMESTAMP, 0
WHERE NOT EXISTS (SELECT 1 FROM sys_menu WHERE id = 22);
INSERT INTO sys_menu (id, parent_id, name, type, tree_path, meta, perm, tenant_id, create_by, create_time, update_by, update_time, deleted)
SELECT 23, 2, 'userDelete', 4, '0,1,2', '{"title":"删除用户"}', 'system:user:delete', 1, 0, CURRENT_TIMESTAMP, 0, CURRENT_TIMESTAMP, 0
WHERE NOT EXISTS (SELECT 1 FROM sys_menu WHERE id = 23);

INSERT INTO sys_role_menu (role_id, menu_id, type)
SELECT 1, m.id, 1 FROM sys_menu m
WHERE NOT EXISTS (SELECT 1 FROM sys_role_menu rm WHERE rm.role_id = 1 AND rm.menu_id = m.id AND rm.type = 1);

INSERT INTO sys_dict_type (id, name, code, status, remark, group_code, tenant_id, create_by, create_time, update_by, update_time, deleted)
SELECT 1, '性别', 'gender', 1, '用户性别', 'system', 1, 0, CURRENT_TIMESTAMP, 0, CURRENT_TIMESTAMP, 0
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_type WHERE code = 'gender' AND tenant_id = 1);
INSERT INTO sys_dict_type (id, name, code, status, remark, group_code, tenant_id, create_by, create_time, update_by, update_time, deleted)
SELECT 2, '通用状态', 'status', 1, '启用/禁用', 'system', 1, 0, CURRENT_TIMESTAMP, 0, CURRENT_TIMESTAMP, 0
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_type WHERE code = 'status' AND tenant_id = 1);

INSERT INTO sys_dict (id, type_code, name, value, sort, status, defaulted, remark, tenant_id)
SELECT 11, 'gender', '男', '1', 1, 1, 1, NULL, 1
WHERE NOT EXISTS (SELECT 1 FROM sys_dict WHERE type_code = 'gender' AND value = '1' AND tenant_id = 1);
INSERT INTO sys_dict (id, type_code, name, value, sort, status, defaulted, remark, tenant_id)
SELECT 12, 'gender', '女', '2', 2, 1, 0, NULL, 1
WHERE NOT EXISTS (SELECT 1 FROM sys_dict WHERE type_code = 'gender' AND value = '2' AND tenant_id = 1);
INSERT INTO sys_dict (id, type_code, name, value, sort, status, defaulted, remark, tenant_id)
SELECT 21, 'status', '启用', '1', 1, 1, 1, NULL, 1
WHERE NOT EXISTS (SELECT 1 FROM sys_dict WHERE type_code = 'status' AND value = '1' AND tenant_id = 1);
INSERT INTO sys_dict (id, type_code, name, value, sort, status, defaulted, remark, tenant_id)
SELECT 22, 'status', '禁用', '0', 2, 1, 0, NULL, 1
WHERE NOT EXISTS (SELECT 1 FROM sys_dict WHERE type_code = 'status' AND value = '0' AND tenant_id = 1);
