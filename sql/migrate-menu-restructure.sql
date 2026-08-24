-- ===== 菜单结构重组迁移（存量库手工执行，幂等可重跑）=====
-- 背景：原「业务管理」单根目录拆分为多个根目录，并按「强业务 / 弱配置」分层：
--   会员信息(17)>会员管理 | 服务商品管理(18)>服务项目/商品管理 | 门店管理(8)>门店列表
--   业务配置(19)>会员等级/会员标签/服务分类/商品分类（低频维护的主数据配置）
-- 说明：
--   * sys_menu 全局共享（无租户副本），按钮 perm 全部不变 -> @PreAuthorize / JWT / 前端页面路由均不受影响；
--     前端侧栏由菜单树驱动（叶子按 perm 映射本地路由），执行后刷新页面即生效
--   * 采用截断重建：先备份非预置角色（role_id NOT IN 1,2,3，即其他租户自建角色）的菜单关联，
--     菜单 ID 全部保留（仅新增 17/18/19、调整 parent_id/tree_path），恢复后为持有旧子菜单的角色补挂新目录
--   * 新目录 icon 使用前端 MainLayout iconByMetaName 已有映射名（peoples/shop/office-building/tree）
--   * 顺带修复存量种子的 tree_path 缺陷：11/12 原挂在目录 8 下但 tree_path 误写为 '0,8,10,11'

BEGIN;

-- 1) 备份其他租户自建角色的菜单关联（预置角色 1=ROOT / 2=店长 / 3=店员由本脚本重建）
CREATE TEMP TABLE tmp_role_menu_backup AS
SELECT role_id, menu_id, type FROM sys_role_menu WHERE role_id NOT IN (1, 2, 3);

-- 2) 截断重建
TRUNCATE TABLE sys_role_menu;
TRUNCATE TABLE sys_menu;

-- 3) 目录/菜单（type=1/2）：perm 留空，运行时 listRoutes 从子按钮 :list 推导
INSERT INTO sys_menu (id, parent_id, name, type, path, component, redirect, tree_path, meta, perm, tenant_id, create_by, create_time, update_by, update_time, deleted)
SELECT v.id, v.parent_id, v.name, v.type, v.path, v.component, v.redirect, v.tree_path, v.meta, NULL, 1, 0, CURRENT_TIMESTAMP, 0, CURRENT_TIMESTAMP, 0
FROM (VALUES
  -- ===== 系统管理（原样保留，rank=100 垫底）=====
  (1::int8,  0::int8, 'system',       2, '/system', 'Layout',            '/system/user', '0',   '{"title":"系统管理","icon":"setting","rank":100,"showLink":true}'),
  (2::int8,  1::int8, 'systemUser',   1, 'user',    'system/user/index',  NULL,           '0,1', '{"title":"用户管理","icon":"user","rank":1,"showLink":true}'),
  (3::int8,  1::int8, 'systemRole',   1, 'role',    'system/role/index',  NULL,           '0,1', '{"title":"角色管理","icon":"peoples","rank":2,"showLink":true}'),
  (4::int8,  1::int8, 'systemMenu',   1, 'menu',    'system/menu/index',  NULL,           '0,1', '{"title":"菜单管理","icon":"tree-table","rank":3,"showLink":true}'),
  (5::int8,  1::int8, 'systemDept',   1, 'dept',    'system/dept/index',  NULL,           '0,1', '{"title":"部门管理","icon":"tree","rank":4,"showLink":true}'),
  (6::int8,  1::int8, 'systemDict',   1, 'dict',    'system/dict/index',  NULL,           '0,1', '{"title":"字典管理","icon":"dict","rank":5,"showLink":true}'),
  (7::int8,  1::int8, 'systemTenant', 1, 'tenant',  'system/tenant/index',NULL,           '0,1', '{"title":"租户管理","icon":"office-building","rank":0,"showLink":true}'),
  -- ===== 会员信息（强业务：日常高频）=====
  (17::int8, 0::int8, 'memberInfo',   2, '/member-info', 'Layout',           '/member-info/member', '0',    '{"title":"会员信息","icon":"peoples","rank":10,"showLink":true}'),
  (10::int8, 17::int8,'bizMember',    1, 'member',       'biz/member/index', NULL,                  '0,17', '{"title":"会员管理","icon":"member","rank":1,"showLink":true}'),
  -- ===== 服务商品管理（强业务：开单主数据维护）=====
  (18::int8, 0::int8, 'serviceGoods', 2, '/service-goods', 'Layout', '/service-goods/service', '0',    '{"title":"服务商品管理","icon":"shop","rank":20,"showLink":true}'),
  (14::int8, 18::int8,'serviceItem',  1, 'service',        'biz/service/index', NULL, '0,18', '{"title":"服务项目","icon":"scissors","rank":1,"showLink":true}'),
  (16::int8, 18::int8,'goods',        1, 'goods',          'biz/goods/index',   NULL, '0,18', '{"title":"商品管理","icon":"shopping-bag","rank":2,"showLink":true}'),
  -- ===== 门店管理（原「业务管理」目录 8 改造为门店根目录）=====
  (8::int8,  0::int8, 'storeManage',  2, '/store', 'Layout',          '/store/list', '0',   '{"title":"门店管理","icon":"office-building","rank":30,"showLink":true}'),
  (9::int8,  8::int8, 'storeList',    1, 'list',   'biz/store/index', NULL,          '0,8', '{"title":"门店列表","icon":"shop","rank":1,"showLink":true}'),
  -- ===== 业务配置（弱数据：等级/标签/分类等低频维护的主数据配置）=====
  (19::int8, 0::int8, 'bizConfig',    2, '/biz-config', 'Layout', '/biz-config/level', '0', '{"title":"业务配置","icon":"tree","rank":40,"showLink":true}'),
  (11::int8, 19::int8,'memberLevel',     1, 'level',           'biz/member/level/index',     NULL, '0,19', '{"title":"会员等级","icon":"medal","rank":1,"showLink":true}'),
  (12::int8, 19::int8,'memberTag',       1, 'tag',             'biz/member/tag/index',       NULL, '0,19', '{"title":"会员标签","icon":"tag","rank":2,"showLink":true}'),
  (13::int8, 19::int8,'serviceCategory', 1, 'service-category','biz/service-category/index',NULL, '0,19', '{"title":"服务分类","icon":"folder-tree","rank":3,"showLink":true}'),
  (15::int8, 19::int8,'goodsCategory',   1, 'goods-category',  'biz/goods-category/index',  NULL, '0,19', '{"title":"商品分类","icon":"folder-tree","rank":4,"showLink":true}')
) AS v(id, parent_id, name, type, path, component, redirect, tree_path, meta);

-- 4) 按钮（type=4）：perm 与原值完全一致，仅会员/等级/标签/服务/商品按钮的 tree_path 随父级迁移调整
INSERT INTO sys_menu (id, parent_id, name, type, path, component, redirect, tree_path, meta, perm, tenant_id, create_by, create_time, update_by, update_time, deleted)
SELECT v.id, v.parent_id, v.name, 4, NULL, NULL, NULL, v.tree_path, v.meta, v.perm, 1, 0, CURRENT_TIMESTAMP, 0, CURRENT_TIMESTAMP, 0
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
  -- 门店 biz:store:*（9 仍在目录 8 下，tree_path 不变）
  (91::int8, 9::int8,  'storeList',    '0,8,9',  '{"title":"查看列表"}', 'biz:store:list'),
  (92::int8, 9::int8,  'storeView',    '0,8,9',  '{"title":"查看详情"}', 'biz:store:view'),
  (93::int8, 9::int8,  'storeAdd',     '0,8,9',  '{"title":"新增门店"}', 'biz:store:add'),
  (94::int8, 9::int8,  'storeEdit',    '0,8,9',  '{"title":"编辑门店"}', 'biz:store:edit'),
  (95::int8, 9::int8,  'storeDelete',  '0,8,9',  '{"title":"删除门店"}', 'biz:store:delete'),
  -- 会员 biz:member:*（挂会员管理 10 下，tree_path 0,8,10 -> 0,17,10）
  (101::int8, 10::int8, 'memberList',   '0,17,10', '{"title":"查看列表"}', 'biz:member:list'),
  (102::int8, 10::int8, 'memberView',   '0,17,10', '{"title":"查看详情"}', 'biz:member:view'),
  (103::int8, 10::int8, 'memberAdd',    '0,17,10', '{"title":"新增会员"}', 'biz:member:add'),
  (104::int8, 10::int8, 'memberEdit',   '0,17,10', '{"title":"编辑会员"}', 'biz:member:edit'),
  (105::int8, 10::int8, 'memberDelete', '0,17,10', '{"title":"删除会员"}', 'biz:member:delete'),
  -- 会员等级 biz:memberLevel:*（挂业务配置 11 下，修正原误写的 0,8,10,11）
  (111::int8, 11::int8, 'memberLevelList',   '0,19,11', '{"title":"查看列表"}', 'biz:memberLevel:list'),
  (112::int8, 11::int8, 'memberLevelView',   '0,19,11', '{"title":"查看详情"}', 'biz:memberLevel:view'),
  (113::int8, 11::int8, 'memberLevelAdd',    '0,19,11', '{"title":"新增等级"}', 'biz:memberLevel:add'),
  (114::int8, 11::int8, 'memberLevelEdit',   '0,19,11', '{"title":"编辑等级"}', 'biz:memberLevel:edit'),
  (115::int8, 11::int8, 'memberLevelDelete', '0,19,11', '{"title":"删除等级"}', 'biz:memberLevel:delete'),
  -- 会员标签 biz:memberTag:*
  (121::int8, 12::int8, 'memberTagList',   '0,19,12', '{"title":"查看列表"}', 'biz:memberTag:list'),
  (122::int8, 12::int8, 'memberTagView',   '0,19,12', '{"title":"查看详情"}', 'biz:memberTag:view'),
  (123::int8, 12::int8, 'memberTagAdd',    '0,19,12', '{"title":"新增标签"}', 'biz:memberTag:add'),
  (124::int8, 12::int8, 'memberTagEdit',   '0,19,12', '{"title":"编辑标签"}', 'biz:memberTag:edit'),
  (125::int8, 12::int8, 'memberTagDelete', '0,19,12', '{"title":"删除标签"}', 'biz:memberTag:delete'),
  -- 会员资产按钮（挂会员管理 10 下）
  (106::int8, 10::int8, 'memberBalanceAdjust', '0,17,10', '{"title":"余额调整"}', 'biz:memberBalance:adjust'),
  (107::int8, 10::int8, 'memberBalanceLog',    '0,17,10', '{"title":"余额流水"}', 'biz:memberBalance:log'),
  (108::int8, 10::int8, 'memberPointAdjust',   '0,17,10', '{"title":"积分调整"}', 'biz:memberPoint:adjust'),
  (109::int8, 10::int8, 'memberPointLog',      '0,17,10', '{"title":"积分流水"}', 'biz:memberPoint:log'),
  (110::int8, 10::int8, 'memberTagRel',        '0,17,10', '{"title":"会员打标签"}', 'biz:member:tag'),
  -- 服务分类 biz:serviceCategory:*（挂业务配置 13 下）
  (131::int8, 13::int8, 'serviceCategoryList',   '0,19,13', '{"title":"查看列表"}', 'biz:serviceCategory:list'),
  (132::int8, 13::int8, 'serviceCategoryView',   '0,19,13', '{"title":"查看详情"}', 'biz:serviceCategory:view'),
  (133::int8, 13::int8, 'serviceCategoryAdd',    '0,19,13', '{"title":"新增分类"}', 'biz:serviceCategory:add'),
  (134::int8, 13::int8, 'serviceCategoryEdit',   '0,19,13', '{"title":"编辑分类"}', 'biz:serviceCategory:edit'),
  (135::int8, 13::int8, 'serviceCategoryDelete', '0,19,13', '{"title":"删除分类"}', 'biz:serviceCategory:delete'),
  -- 服务项目 biz:serviceItem:*
  (141::int8, 14::int8, 'serviceItemList',   '0,18,14', '{"title":"查看列表"}', 'biz:serviceItem:list'),
  (142::int8, 14::int8, 'serviceItemView',   '0,18,14', '{"title":"查看详情"}', 'biz:serviceItem:view'),
  (143::int8, 14::int8, 'serviceItemAdd',    '0,18,14', '{"title":"新增项目"}', 'biz:serviceItem:add'),
  (144::int8, 14::int8, 'serviceItemEdit',   '0,18,14', '{"title":"编辑项目"}', 'biz:serviceItem:edit'),
  (145::int8, 14::int8, 'serviceItemDelete', '0,18,14', '{"title":"删除项目"}', 'biz:serviceItem:delete'),
  -- 商品分类 biz:goodsCategory:*（挂业务配置 15 下）
  (151::int8, 15::int8, 'goodsCategoryList',   '0,19,15', '{"title":"查看列表"}', 'biz:goodsCategory:list'),
  (152::int8, 15::int8, 'goodsCategoryView',   '0,19,15', '{"title":"查看详情"}', 'biz:goodsCategory:view'),
  (153::int8, 15::int8, 'goodsCategoryAdd',    '0,19,15', '{"title":"新增分类"}', 'biz:goodsCategory:add'),
  (154::int8, 15::int8, 'goodsCategoryEdit',   '0,19,15', '{"title":"编辑分类"}', 'biz:goodsCategory:edit'),
  (155::int8, 15::int8, 'goodsCategoryDelete', '0,19,15', '{"title":"删除分类"}', 'biz:goodsCategory:delete'),
  -- 商品 biz:goods:*
  (161::int8, 16::int8, 'goodsList',   '0,18,16', '{"title":"查看列表"}', 'biz:goods:list'),
  (162::int8, 16::int8, 'goodsView',   '0,18,16', '{"title":"查看详情"}', 'biz:goods:view'),
  (163::int8, 16::int8, 'goodsAdd',    '0,18,16', '{"title":"新增商品"}', 'biz:goods:add'),
  (164::int8, 16::int8, 'goodsEdit',   '0,18,16', '{"title":"编辑商品"}', 'biz:goods:edit'),
  (165::int8, 16::int8, 'goodsDelete', '0,18,16', '{"title":"删除商品"}', 'biz:goods:delete')
) AS v(id, parent_id, name, tree_path, meta, perm);

-- 5) ROOT(role 1)：全部菜单
INSERT INTO sys_role_menu (role_id, menu_id, type)
SELECT 1, m.id, 1 FROM sys_menu m;

-- 6) 店长(role 2)：用户全按钮 + 部门(查/增/改) + 门店(查/改) + 会员管理全按钮 + 资产调整/流水 + 服务/商品维护 + 业务配置全按钮
INSERT INTO sys_role_menu (role_id, menu_id, type)
SELECT 2, m.id, 1 FROM sys_menu m
WHERE m.id IN (1, 2, 21, 22, 23, 24, 25, 26, 27,              -- 系统：用户
               5, 51, 52, 53, 54,                             -- 部门(查/增/改)
               17, 10, 101, 102, 103, 104, 105,               -- 会员信息：会员管理
               106, 107, 108, 109, 110,                       -- 余额/积分调整与流水、打标签
               18, 14, 141, 142, 143, 144, 145,               -- 服务商品：服务项目
               16, 161, 162, 163, 164, 165,                   -- 商品管理
               19, 11, 111, 112, 113, 114, 115,               -- 业务配置：会员等级
               12, 121, 122, 123, 124, 125,                   -- 会员标签
               13, 131, 132, 133, 134, 135,                   -- 服务分类
               15, 151, 152, 153, 154, 155,                   -- 商品分类
               8, 9, 91, 92, 94);                             -- 门店(查/改)

-- 7) 店员(role 3)：会员查看/新增/编辑 + 打标签 + 流水查看；服务/商品仅查看（开单选用）；业务配置分类仅查看；无门店
INSERT INTO sys_role_menu (role_id, menu_id, type)
SELECT 3, m.id, 1 FROM sys_menu m
WHERE m.id IN (17, 10, 101, 102, 103, 104, 110, 107, 109,
               18, 14, 141, 142, 16, 161, 162,
               19, 13, 131, 132, 15, 151, 152);

-- 8) 恢复其他租户自建角色的关联（菜单 ID 未变，直接还原）
INSERT INTO sys_role_menu (role_id, menu_id, type)
SELECT b.role_id, b.menu_id, b.type FROM tmp_role_menu_backup b;

-- 9) 为持有迁移子菜单的角色补挂新目录（无目录则子菜单不进路由树）：
--    持有会员管理(10)补 17；持有服务项目(14)/商品(16)补 18；持有等级/标签/服务分类/商品分类(11/12/13/15)补 19
INSERT INTO sys_role_menu (role_id, menu_id, type)
SELECT DISTINCT rm.role_id, v.dir_id, rm.type
FROM sys_role_menu rm
JOIN (VALUES (10::int8, 17::int8),
             (14::int8, 18::int8), (16::int8, 18::int8),
             (11::int8, 19::int8), (12::int8, 19::int8), (13::int8, 19::int8), (15::int8, 19::int8)) AS v(child_id, dir_id)
  ON rm.menu_id = v.child_id
WHERE rm.role_id NOT IN (1, 2, 3)
  AND NOT EXISTS (SELECT 1 FROM sys_role_menu x WHERE x.role_id = rm.role_id AND x.menu_id = v.dir_id AND x.type = rm.type);

DROP TABLE tmp_role_menu_backup;

COMMIT;
-- 执行后验证：
-- SELECT id, parent_id, name, tree_path FROM sys_menu WHERE type IN (1,2) ORDER BY tree_path, id;
-- 预期根目录：17 会员信息(rank10) / 18 服务商品管理(rank20) / 8 门店管理(rank30) / 19 业务配置(rank40) / 1 系统管理(rank100)

