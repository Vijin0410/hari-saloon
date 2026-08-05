-- 默认租户 1 种子数据
-- 权限模型：目录/菜单(type=1/2) 不挂 perm，只存路由信息；按钮(type=4) 挂 :list/:view/:add/:edit/:delete/:status/:password/:assign
-- 业务接口每个一个 perm 不重复；公用 options/me/routes 走 isAuthenticated，不在此挂 perm

INSERT INTO sys_tenant (id, name, code, status, contact, phone, remark, create_by, create_time, update_by, update_time, deleted)
SELECT 1, '默认门店', 'default', 1, '管理员', '15061952394', '系统默认租户', 0, CURRENT_TIMESTAMP, 0, CURRENT_TIMESTAMP, 0
WHERE NOT EXISTS (SELECT 1 FROM sys_tenant WHERE id = 1);

INSERT INTO sys_dept (id, name, parent_id, tree_path, sort, status, tenant_id, create_by, create_time, update_by, update_time, deleted)
SELECT 100, '总店', 0, '0', 1, 1, 1, 0, CURRENT_TIMESTAMP, 0, CURRENT_TIMESTAMP, 0
WHERE NOT EXISTS (SELECT 1 FROM sys_dept WHERE id = 100);

-- 系统管理员(ROOT)：仅默认租户，data_scope=1（全部），跨租户查看所有数据；挂全部菜单
INSERT INTO sys_role (id, name, code, sort, status, data_scope, tenant_id, create_by, create_time, update_by, update_time, deleted)
SELECT 1, '系统管理员', 'ROOT', 1, 1, 1, 1, 0, CURRENT_TIMESTAMP, 0, CURRENT_TIMESTAMP, 0
WHERE NOT EXISTS (SELECT 1 FROM sys_role WHERE code = 'ROOT' AND tenant_id = 1);

-- 预置角色：店长 data_scope=1（全部，部门维度不过滤；门店维度按 salon_store_user 限本门店）/ 店员 data_scope=4（仅本人）
INSERT INTO sys_role (id, name, code, sort, status, data_scope, tenant_id, create_by, create_time, update_by, update_time, deleted)
SELECT 2, '店长', 'STORE_MANAGER', 2, 1, 1, 1, 0, CURRENT_TIMESTAMP, 0, CURRENT_TIMESTAMP, 0
WHERE NOT EXISTS (SELECT 1 FROM sys_role WHERE code = 'STORE_MANAGER' AND tenant_id = 1);

INSERT INTO sys_role (id, name, code, sort, status, data_scope, tenant_id, create_by, create_time, update_by, update_time, deleted)
SELECT 3, '店员', 'STORE_STAFF', 3, 1, 4, 1, 0, CURRENT_TIMESTAMP, 0, CURRENT_TIMESTAMP, 0
WHERE NOT EXISTS (SELECT 1 FROM sys_role WHERE code = 'STORE_STAFF' AND tenant_id = 1);

INSERT INTO sys_user (id, username, password, nickname, phone, status, dept_id, gender, last_password_change_time, tenant_id, create_by, create_time, update_by, update_time, deleted)
SELECT 1, 'admin', '{noop}admin123', '管理员', '15061952394', 1, 100, 1, CURRENT_TIMESTAMP, 1, 0, CURRENT_TIMESTAMP, 0, CURRENT_TIMESTAMP, 0
WHERE NOT EXISTS (SELECT 1 FROM sys_user WHERE username = 'admin' AND tenant_id = 1);

INSERT INTO sys_user_role (user_id, role_id)
SELECT 1, 1
WHERE NOT EXISTS (SELECT 1 FROM sys_user_role WHERE user_id = 1 AND role_id = 1);

-- ===== 目录/菜单（type=1/2）：perm 留空，运行时 listRoutes 从子按钮 :list 推导 =====
INSERT INTO sys_menu (id, parent_id, name, type, path, component, redirect, tree_path, meta, perm, tenant_id, create_by, create_time, update_by, update_time, deleted)
SELECT v.id, v.parent_id, v.name, v.type, v.path, v.component, v.redirect, v.tree_path, v.meta, NULL, 1, 0, CURRENT_TIMESTAMP, 0, CURRENT_TIMESTAMP, 0
FROM (VALUES
  (1::int8,  0::int8, 'system',       2, '/system', 'Layout',           '/system/user', '0',   '{"title":"系统管理","icon":"setting","rank":100,"showLink":true}'),
  (2::int8,  1::int8, 'systemUser',   1, 'user',    'system/user/index',  NULL,          '0,1', '{"title":"用户管理","icon":"user","rank":1,"showLink":true}'),
  (3::int8,  1::int8, 'systemRole',   1, 'role',    'system/role/index',  NULL,          '0,1', '{"title":"角色管理","icon":"peoples","rank":2,"showLink":true}'),
  (4::int8,  1::int8, 'systemMenu',   1, 'menu',    'system/menu/index',  NULL,          '0,1', '{"title":"菜单管理","icon":"tree-table","rank":3,"showLink":true}'),
  (5::int8,  1::int8, 'systemDept',   1, 'dept',    'system/dept/index',  NULL,          '0,1', '{"title":"部门管理","icon":"tree","rank":4,"showLink":true}'),
  (6::int8,  1::int8, 'systemDict',   1, 'dict',    'system/dict/index',  NULL,          '0,1', '{"title":"字典管理","icon":"dict","rank":5,"showLink":true}'),
  (7::int8,  1::int8, 'systemTenant', 1, 'tenant',  'system/tenant/index',NULL,          '0,1', '{"title":"租户管理","icon":"office-building","rank":0,"showLink":true}'),
  (8::int8,  0::int8, 'biz',          2, '/biz',    'Layout',             '/biz/store',  '0',   '{"title":"业务管理","icon":"shop","rank":50,"showLink":true}'),
  (9::int8,  8::int8, 'bizStore',     1, 'store',   'biz/store/index',    NULL,          '0,8', '{"title":"门店管理","icon":"office-building","rank":1,"showLink":true}'),
  (10::int8, 8::int8, 'bizMember',    1, 'member',  'biz/member/index',   NULL,          '0,8', '{"title":"会员管理","icon":"peoples","rank":2,"showLink":true}')
) AS v(id, parent_id, name, type, path, component, redirect, tree_path, meta)
WHERE NOT EXISTS (SELECT 1 FROM sys_menu m WHERE m.id = v.id);

-- ===== 按钮（type=4）：每个接口一个权限标识，命名与路径/方法匹配 =====
INSERT INTO sys_menu (id, parent_id, name, type, tree_path, meta, perm, tenant_id, create_by, create_time, update_by, update_time, deleted)
SELECT v.id, v.parent_id, v.name, 4, v.tree_path, v.meta, v.perm, 1, 0, CURRENT_TIMESTAMP, 0, CURRENT_TIMESTAMP, 0
FROM (VALUES
  -- 用户 system:user:*
  (21::int8, 2::int8,  'userList',     '0,1,2', '{"title":"查看列表"}', 'system:user:list'),
  (22::int8, 2::int8,  'userView',     '0,1,2', '{"title":"查看详情"}', 'system:user:view'),
  (23::int8, 2::int8,  'userAdd',      '0,1,2', '{"title":"新增用户"}', 'system:user:add'),
  (24::int8, 2::int8,  'userEdit',     '0,1,2', '{"title":"编辑用户"}', 'system:user:edit'),
  (25::int8, 2::int8,  'userDelete',   '0,1,2', '{"title":"删除用户"}', 'system:user:delete'),
  (26::int8, 2::int8,  'userPassword', '0,1,2', '{"title":"重置密码"}', 'system:user:password'),
  (27::int8, 2::int8,  'userStatus',   '0,1,2', '{"title":"改状态"}',   'system:user:status'),
  -- 角色 system:role:*
  (31::int8, 3::int8,  'roleList',     '0,1,3', '{"title":"查看列表"}', 'system:role:list'),
  (32::int8, 3::int8,  'roleView',     '0,1,3', '{"title":"查看详情"}', 'system:role:view'),
  (33::int8, 3::int8,  'roleAdd',      '0,1,3', '{"title":"新增角色"}', 'system:role:add'),
  (34::int8, 3::int8,  'roleEdit',     '0,1,3', '{"title":"编辑角色"}', 'system:role:edit'),
  (35::int8, 3::int8,  'roleDelete',   '0,1,3', '{"title":"删除角色"}', 'system:role:delete'),
  (36::int8, 3::int8,  'roleAssign',   '0,1,3', '{"title":"分配菜单"}', 'system:role:assign'),
  (37::int8, 3::int8,  'roleStatus',   '0,1,3', '{"title":"改状态"}',   'system:role:status'),
  -- 菜单 system:menu:*
  (41::int8, 4::int8,  'menuList',     '0,1,4', '{"title":"查看列表"}', 'system:menu:list'),
  (42::int8, 4::int8,  'menuView',     '0,1,4', '{"title":"查看详情"}', 'system:menu:view'),
  (43::int8, 4::int8,  'menuAdd',      '0,1,4', '{"title":"新增菜单"}', 'system:menu:add'),
  (44::int8, 4::int8,  'menuEdit',     '0,1,4', '{"title":"编辑菜单"}', 'system:menu:edit'),
  (45::int8, 4::int8,  'menuDelete',   '0,1,4', '{"title":"删除菜单"}', 'system:menu:delete'),
  -- 部门 system:dept:*
  (51::int8, 5::int8,  'deptList',     '0,1,5', '{"title":"查看列表"}', 'system:dept:list'),
  (52::int8, 5::int8,  'deptView',     '0,1,5', '{"title":"查看详情"}', 'system:dept:view'),
  (53::int8, 5::int8,  'deptAdd',      '0,1,5', '{"title":"新增部门"}', 'system:dept:add'),
  (54::int8, 5::int8,  'deptEdit',     '0,1,5', '{"title":"编辑部门"}', 'system:dept:edit'),
  (55::int8, 5::int8,  'deptDelete',   '0,1,5', '{"title":"删除部门"}', 'system:dept:delete'),
  -- 字典 system:dict:*（字典项与字典类型共用）
  (61::int8, 6::int8,  'dictList',     '0,1,6', '{"title":"查看列表"}', 'system:dict:list'),
  (62::int8, 6::int8,  'dictView',     '0,1,6', '{"title":"查看详情"}', 'system:dict:view'),
  (63::int8, 6::int8,  'dictAdd',      '0,1,6', '{"title":"新增字典"}', 'system:dict:add'),
  (64::int8, 6::int8,  'dictEdit',     '0,1,6', '{"title":"编辑字典"}', 'system:dict:edit'),
  (65::int8, 6::int8,  'dictDelete',   '0,1,6', '{"title":"删除字典"}', 'system:dict:delete'),
  -- 租户 system:tenant:*
  (71::int8, 7::int8,  'tenantList',   '0,1,7', '{"title":"查看列表"}', 'system:tenant:list'),
  (72::int8, 7::int8,  'tenantView',   '0,1,7', '{"title":"查看详情"}', 'system:tenant:view'),
  (73::int8, 7::int8,  'tenantAdd',    '0,1,7', '{"title":"新增租户"}', 'system:tenant:add'),
  (74::int8, 7::int8,  'tenantEdit',   '0,1,7', '{"title":"编辑租户"}', 'system:tenant:edit'),
  (75::int8, 7::int8,  'tenantDelete', '0,1,7', '{"title":"删除租户"}', 'system:tenant:delete'),
  (76::int8, 7::int8,  'tenantStatus', '0,1,7', '{"title":"改状态"}',   'system:tenant:status'),
  -- 门店 biz:store:*
  (91::int8, 9::int8,  'storeList',    '0,8,9',  '{"title":"查看列表"}', 'biz:store:list'),
  (92::int8, 9::int8,  'storeView',    '0,8,9',  '{"title":"查看详情"}', 'biz:store:view'),
  (93::int8, 9::int8,  'storeAdd',     '0,8,9',  '{"title":"新增门店"}', 'biz:store:add'),
  (94::int8, 9::int8,  'storeEdit',    '0,8,9',  '{"title":"编辑门店"}', 'biz:store:edit'),
  (95::int8, 9::int8,  'storeDelete',  '0,8,9',  '{"title":"删除门店"}', 'biz:store:delete'),
  -- 会员 biz:member:*
  (101::int8, 10::int8, 'memberList',   '0,8,10', '{"title":"查看列表"}', 'biz:member:list'),
  (102::int8, 10::int8, 'memberView',   '0,8,10', '{"title":"查看详情"}', 'biz:member:view'),
  (103::int8, 10::int8, 'memberAdd',    '0,8,10', '{"title":"新增会员"}', 'biz:member:add'),
  (104::int8, 10::int8, 'memberEdit',   '0,8,10', '{"title":"编辑会员"}', 'biz:member:edit'),
  (105::int8, 10::int8, 'memberDelete', '0,8,10', '{"title":"删除会员"}', 'biz:member:delete')
) AS v(id, parent_id, name, tree_path, meta, perm)
WHERE NOT EXISTS (SELECT 1 FROM sys_menu m WHERE m.id = v.id);

-- ROOT 挂全部菜单
INSERT INTO sys_role_menu (role_id, menu_id, type)
SELECT 1, m.id, 1 FROM sys_menu m
WHERE NOT EXISTS (SELECT 1 FROM sys_role_menu rm WHERE rm.role_id = 1 AND rm.menu_id = m.id AND rm.type = 1);

-- 店长：用户全按钮 + 部门(查/增/改) + 门店(查/改) + 会员(查/增/改/删)，无租户/菜单/角色/字典管理
INSERT INTO sys_role_menu (role_id, menu_id, type)
SELECT 2, m.id, 1 FROM sys_menu m
WHERE m.id IN (1, 2, 21, 22, 23, 24, 25, 26, 27,
               5, 51, 52, 53, 54,
               8, 9, 91, 92, 94,
               10, 101, 102, 103, 104, 105)
  AND NOT EXISTS (SELECT 1 FROM sys_role_menu rm WHERE rm.role_id = 2 AND rm.menu_id = m.id AND rm.type = 1);

-- 店员：会员查看/新增/编辑
INSERT INTO sys_role_menu (role_id, menu_id, type)
SELECT 3, m.id, 1 FROM sys_menu m
WHERE m.id IN (8, 10, 101, 102, 103, 104)
  AND NOT EXISTS (SELECT 1 FROM sys_role_menu rm WHERE rm.role_id = 3 AND rm.menu_id = m.id AND rm.type = 1);

-- 默认总店营业档案
INSERT INTO salon_store (id, name, code, phone, address, business_hours, open_time, close_time, status, sort, tenant_id, create_by, create_time, update_by, update_time, deleted)
SELECT 1000, '总店', 'HQ', '15061952394', NULL, '09:00-21:00', '09:00', '21:00', 1, 1, 1, 0, CURRENT_TIMESTAMP, 0, CURRENT_TIMESTAMP, 0
WHERE NOT EXISTS (SELECT 1 FROM salon_store WHERE id = 1000);

INSERT INTO salon_store_user (id, store_id, user_id, tenant_id, create_by, create_time, update_by, update_time, deleted)
SELECT 1000, 1000, 1, 1, 0, CURRENT_TIMESTAMP, 0, CURRENT_TIMESTAMP, 0
WHERE NOT EXISTS (SELECT 1 FROM salon_store_user WHERE store_id = 1000 AND user_id = 1 AND tenant_id = 1 AND deleted = 0);

INSERT INTO sys_dict_type (id, name, code, status, remark, group_code, tenant_id, create_by, create_time, update_by, update_time, deleted)
SELECT 1, '性别', 'gender', 1, '用户性别', 'system', 1, 0, CURRENT_TIMESTAMP, 0, CURRENT_TIMESTAMP, 0
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_type WHERE code = 'gender' AND tenant_id = 1);
INSERT INTO sys_dict_type (id, name, code, status, remark, group_code, tenant_id, create_by, create_time, update_by, update_time, deleted)
SELECT 2, '通用状态', 'status', 1, '启用/禁用', 'system', 1, 0, CURRENT_TIMESTAMP, 0, CURRENT_TIMESTAMP, 0
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_type WHERE code = 'status' AND tenant_id = 1);

INSERT INTO sys_dict (id, type_code, name, value, sort, status, defaulted, remark, tenant_cle
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


INSERT INTO sys_dict_type (id, name, code, status, remark, group_code, tenant_id, create_by, create_time, update_by, update_time, deleted)
SELECT 101, '性别', 'gender', 1, '用户性别', 'system', 2084880957290426370, 0, CURRENT_TIMESTAMP, 0, CURRENT_TIMESTAMP, 0
    WHERE NOT EXISTS (SELECT 1 FROM sys_dict_type WHERE code = 'gender' AND tenant_id = 2084880957290426370);
INSERT INTO sys_dict_type (id, name, code, status, remark, group_code, tenant_id, create_by, create_time, update_by, update_time, deleted)
SELECT 102, '通用状态', 'status', 1, '启用/禁用', 'system', 2084880957290426370, 0, CURRENT_TIMESTAMP, 0, CURRENT_TIMESTAMP, 0
    WHERE NOT EXISTS (SELECT 1 FROM sys_dict_type WHERE code = 'status' AND tenant_id = 2084880957290426370);


INSERT INTO sys_dict (id, type_code, name, value, sort, status, defaulted, remark, tenant_id)
SELECT 101, 'gender', '男', '1', 1, 1, 1, NULL, 2084880957290426370
    WHERE NOT EXISTS (SELECT 1 FROM sys_dict WHERE type_code = 'gender' AND value = '1' AND tenant_id = 2084880957290426370);
INSERT INTO sys_dict (id, type_code, name, value, sort, status, defaulted, remark, tenant_id)
SELECT 102, 'gender', '女', '2', 2, 1, 0, NULL, 2084880957290426370
    WHERE NOT EXISTS (SELECT 1 FROM sys_dict WHERE type_code = 'gender' AND value = '2' AND tenant_id = 2084880957290426370);
INSERT INTO sys_dict (id, type_code, name, value, sort, status, defaulted, remark, tenant_id)
SELECT 103, 'status', '启用', '1', 1, 1, 1, NULL, 2084880957290426370
    WHERE NOT EXISTS (SELECT 1 FROM sys_dict WHERE type_code = 'status' AND value = '1' AND tenant_id = 2084880957290426370);
INSERT INTO sys_dict (id, type_code, name, value, sort, status, defaulted, remark, tenant_id)
SELECT 104, 'status', '禁用', '0', 2, 1, 0, NULL, 2084880957290426370
    WHERE NOT EXISTS (SELECT 1 FROM sys_dict WHERE type_code = 'status' AND value = '0' AND tenant_id = 2084880957290426370);
