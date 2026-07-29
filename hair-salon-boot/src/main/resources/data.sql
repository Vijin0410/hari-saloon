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

-- 预置角色：店长(本部门及子) / 店员(仅本人)
INSERT INTO sys_role (id, name, code, sort, status, data_scope, tenant_id, create_by, create_time, update_by, update_time, deleted)
SELECT 2, '店长', 'STORE_MANAGER', 2, 1, 2, 1, 0, CURRENT_TIMESTAMP, 0, CURRENT_TIMESTAMP, 0
WHERE NOT EXISTS (SELECT 1 FROM sys_role WHERE code = 'STORE_MANAGER' AND tenant_id = 1);

INSERT INTO sys_role (id, name, code, sort, status, data_scope, tenant_id, create_by, create_time, update_by, update_time, deleted)
SELECT 3, '店员', 'STORE_STAFF', 3, 1, 4, 1, 0, CURRENT_TIMESTAMP, 0, CURRENT_TIMESTAMP, 0
WHERE NOT EXISTS (SELECT 1 FROM sys_role WHERE code = 'STORE_STAFF' AND tenant_id = 1);

INSERT INTO sys_user (id, username, password, nickname, phone, status, dept_id, gender, pwd_reset_required, tenant_id, create_by, create_time, update_by, update_time, deleted)
SELECT 1, 'admin', '{noop}admin123', '管理员', '15061952394', 1, 100, 1, 0, 1, 0, CURRENT_TIMESTAMP, 0, CURRENT_TIMESTAMP, 0
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

-- 业务：门店 / 会员
INSERT INTO sys_menu (id, parent_id, name, type, path, component, redirect, tree_path, meta, perm, tenant_id, create_by, create_time, update_by, update_time, deleted)
SELECT 8, 0, 'biz', 2, '/biz', 'Layout', '/biz/store', '0',
       '{"title":"业务管理","icon":"shop","rank":50,"showLink":true}',
       NULL, 1, 0, CURRENT_TIMESTAMP, 0, CURRENT_TIMESTAMP, 0
WHERE NOT EXISTS (SELECT 1 FROM sys_menu WHERE id = 8);

INSERT INTO sys_menu (id, parent_id, name, type, path, component, tree_path, meta, perm, tenant_id, create_by, create_time, update_by, update_time, deleted)
SELECT 9, 8, 'bizStore', 1, 'store', 'biz/store/index', '0,8',
       '{"title":"门店管理","icon":"office-building","rank":1,"showLink":true}',
       'biz:store:list', 1, 0, CURRENT_TIMESTAMP, 0, CURRENT_TIMESTAMP, 0
WHERE NOT EXISTS (SELECT 1 FROM sys_menu WHERE id = 9);

INSERT INTO sys_menu (id, parent_id, name, type, path, component, tree_path, meta, perm, tenant_id, create_by, create_time, update_by, update_time, deleted)
SELECT 10, 8, 'bizMember', 1, 'member', 'biz/member/index', '0,8',
       '{"title":"会员管理","icon":"peoples","rank":2,"showLink":true}',
       'biz:member:list', 1, 0, CURRENT_TIMESTAMP, 0, CURRENT_TIMESTAMP, 0
WHERE NOT EXISTS (SELECT 1 FROM sys_menu WHERE id = 10);

-- 用户按钮
INSERT INTO sys_menu (id, parent_id, name, type, tree_path, meta, perm, tenant_id, create_by, create_time, update_by, update_time, deleted)
SELECT 21, 2, 'userAdd', 4, '0,1,2', '{"title":"新增用户"}', 'system:user:add', 1, 0, CURRENT_TIMESTAMP, 0, CURRENT_TIMESTAMP, 0
WHERE NOT EXISTS (SELECT 1 FROM sys_menu WHERE id = 21);
INSERT INTO sys_menu (id, parent_id, name, type, tree_path, meta, perm, tenant_id, create_by, create_time, update_by, update_time, deleted)
SELECT 22, 2, 'userEdit', 4, '0,1,2', '{"title":"编辑用户"}', 'system:user:edit', 1, 0, CURRENT_TIMESTAMP, 0, CURRENT_TIMESTAMP, 0
WHERE NOT EXISTS (SELECT 1 FROM sys_menu WHERE id = 22);
INSERT INTO sys_menu (id, parent_id, name, type, tree_path, meta, perm, tenant_id, create_by, create_time, update_by, update_time, deleted)
SELECT 23, 2, 'userDelete', 4, '0,1,2', '{"title":"删除用户"}', 'system:user:delete', 1, 0, CURRENT_TIMESTAMP, 0, CURRENT_TIMESTAMP, 0
WHERE NOT EXISTS (SELECT 1 FROM sys_menu WHERE id = 23);

-- 角色按钮
INSERT INTO sys_menu (id, parent_id, name, type, tree_path, meta, perm, tenant_id, create_by, create_time, update_by, update_time, deleted)
SELECT 31, 3, 'roleAdd', 4, '0,1,3', '{"title":"新增角色"}', 'system:role:add', 1, 0, CURRENT_TIMESTAMP, 0, CURRENT_TIMESTAMP, 0
WHERE NOT EXISTS (SELECT 1 FROM sys_menu WHERE id = 31);
INSERT INTO sys_menu (id, parent_id, name, type, tree_path, meta, perm, tenant_id, create_by, create_time, update_by, update_time, deleted)
SELECT 32, 3, 'roleEdit', 4, '0,1,3', '{"title":"编辑角色"}', 'system:role:edit', 1, 0, CURRENT_TIMESTAMP, 0, CURRENT_TIMESTAMP, 0
WHERE NOT EXISTS (SELECT 1 FROM sys_menu WHERE id = 32);
INSERT INTO sys_menu (id, parent_id, name, type, tree_path, meta, perm, tenant_id, create_by, create_time, update_by, update_time, deleted)
SELECT 33, 3, 'roleDelete', 4, '0,1,3', '{"title":"删除角色"}', 'system:role:delete', 1, 0, CURRENT_TIMESTAMP, 0, CURRENT_TIMESTAMP, 0
WHERE NOT EXISTS (SELECT 1 FROM sys_menu WHERE id = 33);
INSERT INTO sys_menu (id, parent_id, name, type, tree_path, meta, perm, tenant_id, create_by, create_time, update_by, update_time, deleted)
SELECT 34, 3, 'roleAssign', 4, '0,1,3', '{"title":"分配菜单"}', 'system:role:assign', 1, 0, CURRENT_TIMESTAMP, 0, CURRENT_TIMESTAMP, 0
WHERE NOT EXISTS (SELECT 1 FROM sys_menu WHERE id = 34);

-- 菜单按钮
INSERT INTO sys_menu (id, parent_id, name, type, tree_path, meta, perm, tenant_id, create_by, create_time, update_by, update_time, deleted)
SELECT 41, 4, 'menuAdd', 4, '0,1,4', '{"title":"新增菜单"}', 'system:menu:add', 1, 0, CURRENT_TIMESTAMP, 0, CURRENT_TIMESTAMP, 0
WHERE NOT EXISTS (SELECT 1 FROM sys_menu WHERE id = 41);
INSERT INTO sys_menu (id, parent_id, name, type, tree_path, meta, perm, tenant_id, create_by, create_time, update_by, update_time, deleted)
SELECT 42, 4, 'menuEdit', 4, '0,1,4', '{"title":"编辑菜单"}', 'system:menu:edit', 1, 0, CURRENT_TIMESTAMP, 0, CURRENT_TIMESTAMP, 0
WHERE NOT EXISTS (SELECT 1 FROM sys_menu WHERE id = 42);
INSERT INTO sys_menu (id, parent_id, name, type, tree_path, meta, perm, tenant_id, create_by, create_time, update_by, update_time, deleted)
SELECT 43, 4, 'menuDelete', 4, '0,1,4', '{"title":"删除菜单"}', 'system:menu:delete', 1, 0, CURRENT_TIMESTAMP, 0, CURRENT_TIMESTAMP, 0
WHERE NOT EXISTS (SELECT 1 FROM sys_menu WHERE id = 43);

-- 部门按钮
INSERT INTO sys_menu (id, parent_id, name, type, tree_path, meta, perm, tenant_id, create_by, create_time, update_by, update_time, deleted)
SELECT 51, 5, 'deptAdd', 4, '0,1,5', '{"title":"新增部门"}', 'system:dept:add', 1, 0, CURRENT_TIMESTAMP, 0, CURRENT_TIMESTAMP, 0
WHERE NOT EXISTS (SELECT 1 FROM sys_menu WHERE id = 51);
INSERT INTO sys_menu (id, parent_id, name, type, tree_path, meta, perm, tenant_id, create_by, create_time, update_by, update_time, deleted)
SELECT 52, 5, 'deptEdit', 4, '0,1,5', '{"title":"编辑部门"}', 'system:dept:edit', 1, 0, CURRENT_TIMESTAMP, 0, CURRENT_TIMESTAMP, 0
WHERE NOT EXISTS (SELECT 1 FROM sys_menu WHERE id = 52);
INSERT INTO sys_menu (id, parent_id, name, type, tree_path, meta, perm, tenant_id, create_by, create_time, update_by, update_time, deleted)
SELECT 53, 5, 'deptDelete', 4, '0,1,5', '{"title":"删除部门"}', 'system:dept:delete', 1, 0, CURRENT_TIMESTAMP, 0, CURRENT_TIMESTAMP, 0
WHERE NOT EXISTS (SELECT 1 FROM sys_menu WHERE id = 53);

-- 租户按钮
INSERT INTO sys_menu (id, parent_id, name, type, tree_path, meta, perm, tenant_id, create_by, create_time, update_by, update_time, deleted)
SELECT 71, 7, 'tenantAdd', 4, '0,1,7', '{"title":"新增租户"}', 'system:tenant:add', 1, 0, CURRENT_TIMESTAMP, 0, CURRENT_TIMESTAMP, 0
WHERE NOT EXISTS (SELECT 1 FROM sys_menu WHERE id = 71);
INSERT INTO sys_menu (id, parent_id, name, type, tree_path, meta, perm, tenant_id, create_by, create_time, update_by, update_time, deleted)
SELECT 72, 7, 'tenantEdit', 4, '0,1,7', '{"title":"编辑租户"}', 'system:tenant:edit', 1, 0, CURRENT_TIMESTAMP, 0, CURRENT_TIMESTAMP, 0
WHERE NOT EXISTS (SELECT 1 FROM sys_menu WHERE id = 72);
INSERT INTO sys_menu (id, parent_id, name, type, tree_path, meta, perm, tenant_id, create_by, create_time, update_by, update_time, deleted)
SELECT 73, 7, 'tenantDelete', 4, '0,1,7', '{"title":"删除租户"}', 'system:tenant:delete', 1, 0, CURRENT_TIMESTAMP, 0, CURRENT_TIMESTAMP, 0
WHERE NOT EXISTS (SELECT 1 FROM sys_menu WHERE id = 73);

-- 门店 / 会员按钮
INSERT INTO sys_menu (id, parent_id, name, type, tree_path, meta, perm, tenant_id, create_by, create_time, update_by, update_time, deleted)
SELECT 91, 9, 'storeAdd', 4, '0,8,9', '{"title":"新增门店"}', 'biz:store:add', 1, 0, CURRENT_TIMESTAMP, 0, CURRENT_TIMESTAMP, 0
WHERE NOT EXISTS (SELECT 1 FROM sys_menu WHERE id = 91);
INSERT INTO sys_menu (id, parent_id, name, type, tree_path, meta, perm, tenant_id, create_by, create_time, update_by, update_time, deleted)
SELECT 92, 9, 'storeEdit', 4, '0,8,9', '{"title":"编辑门店"}', 'biz:store:edit', 1, 0, CURRENT_TIMESTAMP, 0, CURRENT_TIMESTAMP, 0
WHERE NOT EXISTS (SELECT 1 FROM sys_menu WHERE id = 92);
INSERT INTO sys_menu (id, parent_id, name, type, tree_path, meta, perm, tenant_id, create_by, create_time, update_by, update_time, deleted)
SELECT 93, 9, 'storeDelete', 4, '0,8,9', '{"title":"删除门店"}', 'biz:store:delete', 1, 0, CURRENT_TIMESTAMP, 0, CURRENT_TIMESTAMP, 0
WHERE NOT EXISTS (SELECT 1 FROM sys_menu WHERE id = 93);

INSERT INTO sys_menu (id, parent_id, name, type, tree_path, meta, perm, tenant_id, create_by, create_time, update_by, update_time, deleted)
SELECT 101, 10, 'memberAdd', 4, '0,8,10', '{"title":"新增会员"}', 'biz:member:add', 1, 0, CURRENT_TIMESTAMP, 0, CURRENT_TIMESTAMP, 0
WHERE NOT EXISTS (SELECT 1 FROM sys_menu WHERE id = 101);
INSERT INTO sys_menu (id, parent_id, name, type, tree_path, meta, perm, tenant_id, create_by, create_time, update_by, update_time, deleted)
SELECT 102, 10, 'memberEdit', 4, '0,8,10', '{"title":"编辑会员"}', 'biz:member:edit', 1, 0, CURRENT_TIMESTAMP, 0, CURRENT_TIMESTAMP, 0
WHERE NOT EXISTS (SELECT 1 FROM sys_menu WHERE id = 102);
INSERT INTO sys_menu (id, parent_id, name, type, tree_path, meta, perm, tenant_id, create_by, create_time, update_by, update_time, deleted)
SELECT 103, 10, 'memberDelete', 4, '0,8,10', '{"title":"删除会员"}', 'biz:member:delete', 1, 0, CURRENT_TIMESTAMP, 0, CURRENT_TIMESTAMP, 0
WHERE NOT EXISTS (SELECT 1 FROM sys_menu WHERE id = 103);

-- ROOT 挂全部菜单
INSERT INTO sys_role_menu (role_id, menu_id, type)
SELECT 1, m.id, 1 FROM sys_menu m
WHERE NOT EXISTS (SELECT 1 FROM sys_role_menu rm WHERE rm.role_id = 1 AND rm.menu_id = m.id AND rm.type = 1);

-- 店长：用户/部门 + 门店/会员（无租户/菜单/角色管理）
INSERT INTO sys_role_menu (role_id, menu_id, type)
SELECT 2, m.id, 1 FROM sys_menu m
WHERE m.id IN (1, 2, 21, 22, 23, 5, 51, 52, 8, 9, 91, 92, 10, 101, 102, 103)
  AND NOT EXISTS (SELECT 1 FROM sys_role_menu rm WHERE rm.role_id = 2 AND rm.menu_id = m.id AND rm.type = 1);

-- 店员：会员读写
INSERT INTO sys_role_menu (role_id, menu_id, type)
SELECT 3, m.id, 1 FROM sys_menu m
WHERE m.id IN (8, 10, 101, 102)
  AND NOT EXISTS (SELECT 1 FROM sys_role_menu rm WHERE rm.role_id = 3 AND rm.menu_id = m.id AND rm.type = 1);

-- 默认总店营业档案
INSERT INTO salon_store (id, name, code, dept_id, phone, address, business_hours, open_time, close_time, status, sort, tenant_id, create_by, create_time, update_by, update_time, deleted)
SELECT 1000, '总店', 'HQ', 100, '15061952394', NULL, '09:00-21:00', '09:00', '21:00', 1, 1, 1, 0, CURRENT_TIMESTAMP, 0, CURRENT_TIMESTAMP, 0
WHERE NOT EXISTS (SELECT 1 FROM salon_store WHERE id = 1000);

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
