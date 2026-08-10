-- ===== P2 服务项目与商品主数据迁移（存量库手工执行，幂等）=====
-- 对应 docs/hair-salon-implementation-plan.md P2
-- 执行前请备份；sql.init.mode=never 时 Spring Boot 不自动执行 schema.sql/data.sql，存量库须手工跑本脚本
-- 包含：4 张表 DDL + 菜单/按钮 perm + 角色授权 + 默认分类与示例数据

-- 1) 建表（IF NOT EXISTS 幂等；DDL 同 schema.sql P2 段）

-- 服务项目分类（租户级）
CREATE TABLE IF NOT EXISTS salon_service_category (
    id                  int8          NOT NULL PRIMARY KEY,
    tenant_id           int8          NOT NULL,
    name                varchar(64)   NOT NULL,
    sort                int4          DEFAULT 0,
    status              int4          DEFAULT 1,
    remark              varchar(255),
    create_by           int8,
    create_time         timestamp,
    update_by           int8,
    update_time         timestamp,
    deleted             int4          DEFAULT 0
);
CREATE UNIQUE INDEX IF NOT EXISTS uk_salon_service_category_name ON salon_service_category (tenant_id, name) WHERE deleted = 0;
CREATE INDEX IF NOT EXISTS idx_salon_service_category_sort ON salon_service_category (tenant_id, sort) WHERE deleted = 0;
COMMENT ON TABLE salon_service_category IS '服务项目分类（租户级）';
COMMENT ON COLUMN salon_service_category.id IS '分类ID';
COMMENT ON COLUMN salon_service_category.tenant_id IS '租户ID';
COMMENT ON COLUMN salon_service_category.name IS '分类名称';
COMMENT ON COLUMN salon_service_category.sort IS '排序';
COMMENT ON COLUMN salon_service_category.status IS '状态（1=启用 0=禁用）';
COMMENT ON COLUMN salon_service_category.remark IS '备注';
COMMENT ON COLUMN salon_service_category.create_by IS '创建人ID（0=系统）';
COMMENT ON COLUMN salon_service_category.create_time IS '创建时间';
COMMENT ON COLUMN salon_service_category.update_by IS '更新人ID';
COMMENT ON COLUMN salon_service_category.update_time IS '更新时间';
COMMENT ON COLUMN salon_service_category.deleted IS '逻辑删除（0=未删除 1=已删除）';

-- 服务项目（租户级，收银开单可选）
CREATE TABLE IF NOT EXISTS salon_service (
    id                  int8          NOT NULL PRIMARY KEY,
    tenant_id           int8          NOT NULL,
    name                varchar(64)   NOT NULL,
    category_id         int8,
    standard_price      numeric(12, 2) NOT NULL,
    member_price        numeric(12, 2),
    duration            int4,
    discountable        int4          DEFAULT 1,
    commissionable      int4          DEFAULT 1,
    sort                int4          DEFAULT 0,
    status              int4          DEFAULT 1,
    remark              varchar(255),
    create_by           int8,
    create_time         timestamp,
    update_by           int8,
    update_time         timestamp,
    deleted             int4          DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_salon_service_category_id ON salon_service (tenant_id, category_id) WHERE deleted = 0;
CREATE INDEX IF NOT EXISTS idx_salon_service_sort ON salon_service (tenant_id, sort) WHERE deleted = 0;
COMMENT ON TABLE salon_service IS '服务项目（租户级，收银开单可选）';
COMMENT ON COLUMN salon_service.id IS '项目ID';
COMMENT ON COLUMN salon_service.tenant_id IS '租户ID';
COMMENT ON COLUMN salon_service.name IS '项目名称';
COMMENT ON COLUMN salon_service.category_id IS '项目分类ID（关联salon_service_category）';
COMMENT ON COLUMN salon_service.standard_price IS '标准价格';
COMMENT ON COLUMN salon_service.member_price IS '会员价格（NULL=无会员价，按标准价）';
COMMENT ON COLUMN salon_service.duration IS '服务时长（分钟）';
COMMENT ON COLUMN salon_service.discountable IS '是否参与折扣（1=是 0=否）';
COMMENT ON COLUMN salon_service.commissionable IS '是否计算提成（1=是 0=否）';
COMMENT ON COLUMN salon_service.sort IS '排序';
COMMENT ON COLUMN salon_service.status IS '状态（1=启用 0=禁用）';
COMMENT ON COLUMN salon_service.remark IS '备注';
COMMENT ON COLUMN salon_service.create_by IS '创建人ID（0=系统）';
COMMENT ON COLUMN salon_service.create_time IS '创建时间';
COMMENT ON COLUMN salon_service.update_by IS '更新人ID';
COMMENT ON COLUMN salon_service.update_time IS '更新时间';
COMMENT ON COLUMN salon_service.deleted IS '逻辑删除（0=未删除 1=已删除）';

-- 商品分类（租户级）
CREATE TABLE IF NOT EXISTS salon_goods_category (
    id                  int8          NOT NULL PRIMARY KEY,
    tenant_id           int8          NOT NULL,
    name                varchar(64)   NOT NULL,
    sort                int4          DEFAULT 0,
    status              int4          DEFAULT 1,
    remark              varchar(255),
    create_by           int8,
    create_time         timestamp,
    update_by           int8,
    update_time         timestamp,
    deleted             int4          DEFAULT 0
);
CREATE UNIQUE INDEX IF NOT EXISTS uk_salon_goods_category_name ON salon_goods_category (tenant_id, name) WHERE deleted = 0;
CREATE INDEX IF NOT EXISTS idx_salon_goods_category_sort ON salon_goods_category (tenant_id, sort) WHERE deleted = 0;
COMMENT ON TABLE salon_goods_category IS '商品分类（租户级）';
COMMENT ON COLUMN salon_goods_category.id IS '分类ID';
COMMENT ON COLUMN salon_goods_category.tenant_id IS '租户ID';
COMMENT ON COLUMN salon_goods_category.name IS '分类名称';
COMMENT ON COLUMN salon_goods_category.sort IS '排序';
COMMENT ON COLUMN salon_goods_category.status IS '状态（1=启用 0=禁用）';
COMMENT ON COLUMN salon_goods_category.remark IS '备注';
COMMENT ON COLUMN salon_goods_category.create_by IS '创建人ID（0=系统）';
COMMENT ON COLUMN salon_goods_category.create_time IS '创建时间';
COMMENT ON COLUMN salon_goods_category.update_by IS '更新人ID';
COMMENT ON COLUMN salon_goods_category.update_time IS '更新时间';
COMMENT ON COLUMN salon_goods_category.deleted IS '逻辑删除（0=未删除 1=已删除）';

-- 商品（租户级，收银开单可选；库存数量为冗余，P5销售扣减，完整进销存见P17）
CREATE TABLE IF NOT EXISTS salon_goods (
    id                  int8          NOT NULL PRIMARY KEY,
    tenant_id           int8          NOT NULL,
    name                varchar(64)   NOT NULL,
    category_id         int8,
    barcode             varchar(64),
    sale_price          numeric(12, 2) NOT NULL,
    cost_price          numeric(12, 2),
    stock_quantity      int4          DEFAULT 0,
    discountable        int4          DEFAULT 1,
    commissionable      int4          DEFAULT 1,
    sort                int4          DEFAULT 0,
    status              int4          DEFAULT 1,
    remark              varchar(255),
    create_by           int8,
    create_time         timestamp,
    update_by           int8,
    update_time         timestamp,
    deleted             int4          DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_salon_goods_category_id ON salon_goods (tenant_id, category_id) WHERE deleted = 0;
CREATE INDEX IF NOT EXISTS idx_salon_goods_sort ON salon_goods (tenant_id, sort) WHERE deleted = 0;
CREATE INDEX IF NOT EXISTS idx_salon_goods_barcode ON salon_goods (tenant_id, barcode) WHERE deleted = 0;
COMMENT ON TABLE salon_goods IS '商品（租户级，收银开单可选）';
COMMENT ON COLUMN salon_goods.id IS '商品ID';
COMMENT ON COLUMN salon_goods.tenant_id IS '租户ID';
COMMENT ON COLUMN salon_goods.name IS '商品名称';
COMMENT ON COLUMN salon_goods.category_id IS '商品分类ID（关联salon_goods_category）';
COMMENT ON COLUMN salon_goods.barcode IS '商品条码';
COMMENT ON COLUMN salon_goods.sale_price IS '销售价格';
COMMENT ON COLUMN salon_goods.cost_price IS '成本价';
COMMENT ON COLUMN salon_goods.stock_quantity IS '库存数量（冗余，P5销售扣减；完整进销存见P17）';
COMMENT ON COLUMN salon_goods.discountable IS '是否参与折扣（1=是 0=否）';
COMMENT ON COLUMN salon_goods.commissionable IS '是否计算提成（1=是 0=否）';
COMMENT ON COLUMN salon_goods.sort IS '排序';
COMMENT ON COLUMN salon_goods.status IS '状态（1=启用 0=禁用）';
COMMENT ON COLUMN salon_goods.remark IS '备注';
COMMENT ON COLUMN salon_goods.create_by IS '创建人ID（0=系统）';
COMMENT ON COLUMN salon_goods.create_time IS '创建时间';
COMMENT ON COLUMN salon_goods.update_by IS '更新人ID';
COMMENT ON COLUMN salon_goods.update_time IS '更新时间';
COMMENT ON COLUMN salon_goods.deleted IS '逻辑删除（0=未删除 1=已删除）';

-- 2) 菜单（type=1，挂业务目录 8 下）
INSERT INTO sys_menu (id, parent_id, name, type, path, component, redirect, tree_path, meta, perm, tenant_id, create_by, create_time, update_by, update_time, deleted)
SELECT v.id, v.parent_id, v.name, v.type, v.path, v.component, NULL, v.tree_path, v.meta, NULL, 1, 0, CURRENT_TIMESTAMP, 0, CURRENT_TIMESTAMP, 0
FROM (VALUES
  (13::int8, 8::int8, 'serviceCategory', 1, 'service-category', 'biz/service-category/index', '0,8', '{"title":"服务分类","icon":"folder-tree","rank":5,"showLink":true}'),
  (14::int8, 8::int8, 'serviceItem',      1, 'service',         'biz/service/index',         '0,8', '{"title":"服务项目","icon":"scissors","rank":6,"showLink":true}'),
  (15::int8, 8::int8, 'goodsCategory',    1, 'goods-category',  'biz/goods-category/index',  '0,8', '{"title":"商品分类","icon":"folder-tree","rank":7,"showLink":true}'),
  (16::int8, 8::int8, 'goods',            1, 'goods',           'biz/goods/index',           '0,8', '{"title":"商品管理","icon":"shopping-bag","rank":8,"showLink":true}')
) AS v(id, parent_id, name, type, path, component, tree_path, meta)
WHERE NOT EXISTS (SELECT 1 FROM sys_menu m WHERE m.id = v.id);

-- 3) 按钮（type=4）
INSERT INTO sys_menu (id, parent_id, name, type, path, component, redirect, tree_path, meta, perm, tenant_id, create_by, create_time, update_by, update_time, deleted)
SELECT v.id, v.parent_id, v.name, 4, NULL, NULL, NULL, v.tree_path, v.meta, v.perm, 1, 0, CURRENT_TIMESTAMP, 0, CURRENT_TIMESTAMP, 0
FROM (VALUES
  (131::int8, 13::int8, 'serviceCategoryList',   '0,8,13', '{"title":"查看列表"}', 'biz:serviceCategory:list'),
  (132::int8, 13::int8, 'serviceCategoryView',   '0,8,13', '{"title":"查看详情"}', 'biz:serviceCategory:view'),
  (133::int8, 13::int8, 'serviceCategoryAdd',    '0,8,13', '{"title":"新增分类"}', 'biz:serviceCategory:add'),
  (134::int8, 13::int8, 'serviceCategoryEdit',   '0,8,13', '{"title":"编辑分类"}', 'biz:serviceCategory:edit'),
  (135::int8, 13::int8, 'serviceCategoryDelete', '0,8,13', '{"title":"删除分类"}', 'biz:serviceCategory:delete'),
  (141::int8, 14::int8, 'serviceItemList',   '0,8,14', '{"title":"查看列表"}', 'biz:serviceItem:list'),
  (142::int8, 14::int8, 'serviceItemView',   '0,8,14', '{"title":"查看详情"}', 'biz:serviceItem:view'),
  (143::int8, 14::int8, 'serviceItemAdd',    '0,8,14', '{"title":"新增项目"}', 'biz:serviceItem:add'),
  (144::int8, 14::int8, 'serviceItemEdit',   '0,8,14', '{"title":"编辑项目"}', 'biz:serviceItem:edit'),
  (145::int8, 14::int8, 'serviceItemDelete', '0,8,14', '{"title":"删除项目"}', 'biz:serviceItem:delete'),
  (151::int8, 15::int8, 'goodsCategoryList',   '0,8,15', '{"title":"查看列表"}', 'biz:goodsCategory:list'),
  (152::int8, 15::int8, 'goodsCategoryView',   '0,8,15', '{"title":"查看详情"}', 'biz:goodsCategory:view'),
  (153::int8, 15::int8, 'goodsCategoryAdd',    '0,8,15', '{"title":"新增分类"}', 'biz:goodsCategory:add'),
  (154::int8, 15::int8, 'goodsCategoryEdit',   '0,8,15', '{"title":"编辑分类"}', 'biz:goodsCategory:edit'),
  (155::int8, 15::int8, 'goodsCategoryDelete', '0,8,15', '{"title":"删除分类"}', 'biz:goodsCategory:delete'),
  (161::int8, 16::int8, 'goodsList',   '0,8,16', '{"title":"查看列表"}', 'biz:goods:list'),
  (162::int8, 16::int8, 'goodsView',   '0,8,16', '{"title":"查看详情"}', 'biz:goods:view'),
  (163::int8, 16::int8, 'goodsAdd',    '0,8,16', '{"title":"新增商品"}', 'biz:goods:add'),
  (164::int8, 16::int8, 'goodsEdit',   '0,8,16', '{"title":"编辑商品"}', 'biz:goods:edit'),
  (165::int8, 16::int8, 'goodsDelete', '0,8,16', '{"title":"删除商品"}', 'biz:goods:delete')
) AS v(id, parent_id, name, tree_path, meta, perm)
WHERE NOT EXISTS (SELECT 1 FROM sys_menu m WHERE m.id = v.id);

-- 4) 店长(role 2)：P2 全部
INSERT INTO sys_role_menu (role_id, menu_id, type)
SELECT 2, m.id, 1 FROM sys_menu m
WHERE m.id IN (13, 131, 132, 133, 134, 135,
               14, 141, 142, 143, 144, 145,
               15, 151, 152, 153, 154, 155,
               16, 161, 162, 163, 164, 165)
  AND NOT EXISTS (SELECT 1 FROM sys_role_menu rm WHERE rm.role_id = 2 AND rm.menu_id = m.id AND rm.type = 1);

-- 5) 店员(role 3)：仅查看（开单选服务/商品）
INSERT INTO sys_role_menu (role_id, menu_id, type)
SELECT 3, m.id, 1 FROM sys_menu m
WHERE m.id IN (13, 131, 132, 14, 141, 142, 15, 151, 152, 16, 161, 162)
  AND NOT EXISTS (SELECT 1 FROM sys_role_menu rm WHERE rm.role_id = 3 AND rm.menu_id = m.id AND rm.type = 1);

-- 6) 默认服务分类（租户1）
INSERT INTO salon_service_category (id, tenant_id, name, sort, status, create_by, create_time, update_by, update_time, deleted)
SELECT v.id, 1, v.name, v.sort, 1, 0, CURRENT_TIMESTAMP, 0, CURRENT_TIMESTAMP, 0
FROM (VALUES
  (3001::int8, '剪发', 1),
  (3002::int8, '烫发', 2),
  (3003::int8, '染发', 3),
  (3004::int8, '护理', 4),
  (3005::int8, '洗护', 5),
  (3006::int8, '造型', 6)
) AS v(id, name, sort)
WHERE NOT EXISTS (SELECT 1 FROM salon_service_category c WHERE c.id = v.id);

-- 7) 默认商品分类（租户1）
INSERT INTO salon_goods_category (id, tenant_id, name, sort, status, create_by, create_time, update_by, update_time, deleted)
SELECT v.id, 1, v.name, v.sort, 1, 0, CURRENT_TIMESTAMP, 0, CURRENT_TIMESTAMP, 0
FROM (VALUES
  (4001::int8, '洗护用品', 1),
  (4002::int8, '造型用品', 2),
  (4003::int8, '染护产品', 3),
  (4004::int8, '日用周边', 4)
) AS v(id, name, sort)
WHERE NOT EXISTS (SELECT 1 FROM salon_goods_category c WHERE c.id = v.id);

-- 8) 示例服务项目（租户1）
INSERT INTO salon_service (id, tenant_id, name, category_id, standard_price, member_price, duration, discountable, commissionable, sort, status, create_by, create_time, update_by, update_time, deleted)
SELECT v.id, 1, v.name, v.category_id, v.standard_price, v.member_price, v.duration, 1, 1, v.sort, 1, 0, CURRENT_TIMESTAMP, 0, CURRENT_TIMESTAMP, 0
FROM (VALUES
  (5001::int8, '男士洗剪吹', 3001::int8, 45.00, 40.00, 40, 1),
  (5002::int8, '女士洗剪吹', 3001::int8, 68.00, 60.00, 50, 2),
  (5003::int8, '冷烫',       3002::int8, 188.00, 168.00, 120, 3)
) AS v(id, name, category_id, standard_price, member_price, duration, sort)
WHERE NOT EXISTS (SELECT 1 FROM salon_service s WHERE s.id = v.id);

-- 9) 示例商品（租户1）
INSERT INTO salon_goods (id, tenant_id, name, category_id, barcode, sale_price, cost_price, stock_quantity, discountable, commissionable, sort, status, create_by, create_time, update_by, update_time, deleted)
SELECT v.id, 1, v.name, v.category_id, v.barcode, v.sale_price, v.cost_price, v.stock_quantity, 1, 1, v.sort, 1, 0, CURRENT_TIMESTAMP, 0, CURRENT_TIMESTAMP, 0
FROM (VALUES
  (6001::int8, '丝蓓绮洗发水 500ml', 4001::int8, '6901234567890', 58.00, 32.00, 50, 1),
  (6002::int8, '发蜡 100g',           4002::int8, '6901234567891', 38.00, 18.00, 80, 2)
) AS v(id, name, category_id, barcode, sale_price, cost_price, stock_quantity, sort)
WHERE NOT EXISTS (SELECT 1 FROM salon_goods g WHERE g.id = v.id);

-- 10) 租户2 默认服务分类（与租户1一致，id 段 3007-3012）
INSERT INTO salon_service_category (id, tenant_id, name, sort, status, create_by, create_time, update_by, update_time, deleted)
SELECT v.id, 2084880957290426370, v.name, v.sort, 1, 0, CURRENT_TIMESTAMP, 0, CURRENT_TIMESTAMP, 0
FROM (VALUES
  (3007::int8, '剪发', 1),
  (3008::int8, '烫发', 2),
  (3009::int8, '染发', 3),
  (3010::int8, '护理', 4),
  (3011::int8, '洗护', 5),
  (3012::int8, '造型', 6)
) AS v(id, name, sort)
WHERE NOT EXISTS (SELECT 1 FROM salon_service_category c WHERE c.id = v.id);

-- 11) 租户2 默认商品分类（id 段 4005-4008）
INSERT INTO salon_goods_category (id, tenant_id, name, sort, status, create_by, create_time, update_by, update_time, deleted)
SELECT v.id, 2084880957290426370, v.name, v.sort, 1, 0, CURRENT_TIMESTAMP, 0, CURRENT_TIMESTAMP, 0
FROM (VALUES
  (4005::int8, '洗护用品', 1),
  (4006::int8, '造型用品', 2),
  (4007::int8, '染护产品', 3),
  (4008::int8, '日用周边', 4)
) AS v(id, name, sort)
WHERE NOT EXISTS (SELECT 1 FROM salon_goods_category c WHERE c.id = v.id);
