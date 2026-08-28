-- ===== P4 会员充值 + P5 收银开单 存量库迁移（幂等可重跑） =====
-- 新表：salon_recharge_activity / salon_recharge_order / salon_order / salon_order_item / salon_order_payment
-- 变更：salon_member 加累计字段；菜单/按钮/字典/角色种子；示例充值活动
-- 方言：PostgreSQL

-- ===== DDL =====
ALTER TABLE salon_member ADD COLUMN IF NOT EXISTS total_recharge_amount numeric(12, 2) DEFAULT 0;
ALTER TABLE salon_member ADD COLUMN IF NOT EXISTS total_consume_amount numeric(12, 2) DEFAULT 0;
COMMENT ON COLUMN salon_member.total_recharge_amount IS '累计充值金额（本金，不含赠送；升级口径=与累计消费取大）';
COMMENT ON COLUMN salon_member.total_consume_amount IS '累计消费金额（订单实收，含余额支付；升级口径=与累计充值取大）';
COMMENT ON COLUMN salon_member_level.upgrade_threshold IS '升级门槛（累计充值与累计消费取大者达到即升级，只升不降），NULL=不自动升级';

CREATE TABLE IF NOT EXISTS salon_recharge_activity (
    id                  int8          NOT NULL PRIMARY KEY,
    tenant_id           int8          NOT NULL,
    name                varchar(64)   NOT NULL,
    threshold_amount    numeric(12, 2) NOT NULL,
    gift_amount         numeric(12, 2) NOT NULL,
    start_time          timestamp,
    end_time            timestamp,
    sort                int4          DEFAULT 0,
    status              int4          DEFAULT 1,
    remark              varchar(255),
    create_by           int8,
    create_time         timestamp,
    update_by           int8,
    update_time         timestamp,
    deleted             int4          DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_salon_recharge_activity_tenant ON salon_recharge_activity (tenant_id, status) WHERE deleted = 0;
COMMENT ON TABLE salon_recharge_activity IS '充值活动（租户级，充X送Y档位）';
COMMENT ON COLUMN salon_recharge_activity.id IS '活动ID';
COMMENT ON COLUMN salon_recharge_activity.tenant_id IS '租户ID';
COMMENT ON COLUMN salon_recharge_activity.name IS '活动名称（如充500送50）';
COMMENT ON COLUMN salon_recharge_activity.threshold_amount IS '充值门槛（单笔充值金额>=该值可享）';
COMMENT ON COLUMN salon_recharge_activity.gift_amount IS '赠送金额';
COMMENT ON COLUMN salon_recharge_activity.start_time IS '生效时间（NULL=立即生效）';
COMMENT ON COLUMN salon_recharge_activity.end_time IS '失效时间（NULL=长期有效）';
COMMENT ON COLUMN salon_recharge_activity.sort IS '排序';
COMMENT ON COLUMN salon_recharge_activity.status IS '状态（1=启用 0=禁用）';
COMMENT ON COLUMN salon_recharge_activity.remark IS '备注';
COMMENT ON COLUMN salon_recharge_activity.create_by IS '创建人ID（0=系统）';
COMMENT ON COLUMN salon_recharge_activity.create_time IS '创建时间';
COMMENT ON COLUMN salon_recharge_activity.update_by IS '更新人ID';
COMMENT ON COLUMN salon_recharge_activity.update_time IS '更新时间';
COMMENT ON COLUMN salon_recharge_activity.deleted IS '逻辑删除（0=未删除 1=已删除）';

CREATE TABLE IF NOT EXISTS salon_recharge_order (
    id                  int8          NOT NULL PRIMARY KEY,
    tenant_id           int8          NOT NULL,
    store_id            int8          NOT NULL,
    recharge_no         varchar(32)   NOT NULL,
    member_id           int8          NOT NULL,
    activity_id         int8,
    principal_amount    numeric(12, 2) NOT NULL,
    gift_amount         numeric(12, 2) DEFAULT 0,
    gift_source         int4          NOT NULL DEFAULT 3,
    gift_frozen         int4          DEFAULT 0,
    unfrozen_time       timestamp,
    pay_method          int4          NOT NULL,
    pay_time            timestamp,
    operator_id         int8,
    remark              varchar(255),
    create_by           int8,
    create_time         timestamp,
    update_by           int8,
    update_time         timestamp,
    deleted             int4          DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_salon_recharge_order_member ON salon_recharge_order (tenant_id, member_id, create_time) WHERE deleted = 0;
CREATE INDEX IF NOT EXISTS idx_salon_recharge_order_store ON salon_recharge_order (tenant_id, store_id, create_time) WHERE deleted = 0;
CREATE INDEX IF NOT EXISTS idx_salon_recharge_order_unfreeze ON salon_recharge_order (tenant_id, gift_frozen, unfrozen_time) WHERE deleted = 0 AND gift_frozen = 1;
COMMENT ON TABLE salon_recharge_order IS '充值订单（本金计预收款不计营业收入；赠送单独记录）';
COMMENT ON COLUMN salon_recharge_order.id IS '充值单ID';
COMMENT ON COLUMN salon_recharge_order.tenant_id IS '租户ID';
COMMENT ON COLUMN salon_recharge_order.store_id IS '充值门店ID';
COMMENT ON COLUMN salon_recharge_order.recharge_no IS '充值单号';
COMMENT ON COLUMN salon_recharge_order.member_id IS '会员ID';
COMMENT ON COLUMN salon_recharge_order.activity_id IS '命中的充值活动ID（NULL=未命中活动，走等级兜底或无赠送）';
COMMENT ON COLUMN salon_recharge_order.principal_amount IS '本金金额（实收，计入预收款）';
COMMENT ON COLUMN salon_recharge_order.gift_amount IS '赠送金额（不计营业收入，与本金分流水）';
COMMENT ON COLUMN salon_recharge_order.gift_source IS '赠送来源（1=充值活动 2=等级赠送率兜底 3=无赠送）';
COMMENT ON COLUMN salon_recharge_order.gift_frozen IS '赠送是否冻结至次月（1=活动赠送冻结，次月1日后解冻；0=不冻结）';
COMMENT ON COLUMN salon_recharge_order.unfrozen_time IS '赠送解冻时间（NULL=未解冻或无需解冻）';
COMMENT ON COLUMN salon_recharge_order.pay_method IS '支付方式（字典 pay_method：1现金 2微信 3支付宝 4银行卡 8其他）';
COMMENT ON COLUMN salon_recharge_order.pay_time IS '支付确认时间';
COMMENT ON COLUMN salon_recharge_order.operator_id IS '操作人ID';
COMMENT ON COLUMN salon_recharge_order.remark IS '备注';
COMMENT ON COLUMN salon_recharge_order.create_by IS '创建人ID（0=系统）';
COMMENT ON COLUMN salon_recharge_order.create_time IS '创建时间';
COMMENT ON COLUMN salon_recharge_order.update_by IS '更新人ID';
COMMENT ON COLUMN salon_recharge_order.update_time IS '更新时间';
COMMENT ON COLUMN salon_recharge_order.deleted IS '逻辑删除（0=未删除 1=已删除）';

CREATE TABLE IF NOT EXISTS salon_order (
    id                  int8          NOT NULL PRIMARY KEY,
    tenant_id           int8          NOT NULL,
    store_id            int8          NOT NULL,
    order_no            varchar(32)   NOT NULL,
    member_id           int8,
    item_amount         numeric(12, 2) NOT NULL DEFAULT 0,
    discount_amount     numeric(12, 2) DEFAULT 0,
    payable_amount      numeric(12, 2) NOT NULL DEFAULT 0,
    point_deduct_points int4          DEFAULT 0,
    point_deduct_amount numeric(12, 2) DEFAULT 0,
    received_amount     numeric(12, 2) DEFAULT 0,
    change_amount       numeric(12, 2) DEFAULT 0,
    status              int4          NOT NULL DEFAULT 0,
    paid_time           timestamp,
    remark              varchar(255),
    create_by           int8,
    create_time         timestamp,
    update_by           int8,
    update_time         timestamp,
    deleted             int4          DEFAULT 0
);
CREATE UNIQUE INDEX IF NOT EXISTS uk_salon_order_no ON salon_order (order_no) WHERE deleted = 0;
CREATE INDEX IF NOT EXISTS idx_salon_order_member ON salon_order (tenant_id, member_id, create_time) WHERE deleted = 0;
CREATE INDEX IF NOT EXISTS idx_salon_order_store ON salon_order (tenant_id, store_id, create_time) WHERE deleted = 0;
CREATE INDEX IF NOT EXISTS idx_salon_order_status ON salon_order (tenant_id, status, create_time) WHERE deleted = 0;
COMMENT ON TABLE salon_order IS '收银订单（挂单=status 0）';
COMMENT ON COLUMN salon_order.id IS '订单ID';
COMMENT ON COLUMN salon_order.tenant_id IS '租户ID';
COMMENT ON COLUMN salon_order.store_id IS '开单门店ID';
COMMENT ON COLUMN salon_order.order_no IS '订单号';
COMMENT ON COLUMN salon_order.member_id IS '会员ID（NULL=散客）';
COMMENT ON COLUMN salon_order.item_amount IS '原价合计（明细原单价×数量，未折）';
COMMENT ON COLUMN salon_order.discount_amount IS '优惠总额（会员等级折扣减免=原价合计-折后合计）';
COMMENT ON COLUMN salon_order.payable_amount IS '应收金额（折后-积分抵扣前）';
COMMENT ON COLUMN salon_order.point_deduct_points IS '积分抵扣使用的积分数';
COMMENT ON COLUMN salon_order.point_deduct_amount IS '积分抵扣金额';
COMMENT ON COLUMN salon_order.received_amount IS '实收金额（应收-积分抵扣；含会员余额支付部分）';
COMMENT ON COLUMN salon_order.change_amount IS '找零金额（现金投入-现金应收，>=0）';
COMMENT ON COLUMN salon_order.status IS '状态（0=挂单 1=已支付 2=部分退款 3=已退款 4=已取消；2/3预留P6）';
COMMENT ON COLUMN salon_order.paid_time IS '支付完成时间';
COMMENT ON COLUMN salon_order.remark IS '备注';
COMMENT ON COLUMN salon_order.create_by IS '创建人ID（0=系统）';
COMMENT ON COLUMN salon_order.create_time IS '创建时间';
COMMENT ON COLUMN salon_order.update_by IS '更新人ID';
COMMENT ON COLUMN salon_order.update_time IS '更新时间';
COMMENT ON COLUMN salon_order.deleted IS '逻辑删除（0=未删除 1=已删除）';

CREATE TABLE IF NOT EXISTS salon_order_item (
    id                  int8          NOT NULL PRIMARY KEY,
    tenant_id           int8          NOT NULL,
    order_id            int8          NOT NULL,
    item_type           int4          NOT NULL,
    item_id             int8          NOT NULL,
    item_name           varchar(64)   NOT NULL,
    unit_price          numeric(12, 2) NOT NULL,
    price               numeric(12, 2) NOT NULL,
    quantity            int4          NOT NULL DEFAULT 1,
    discount_rate       numeric(4, 2) DEFAULT 1.00,
    subtotal            numeric(12, 2) NOT NULL,
    staff_id            int8,
    assistant_id        int8,
    remark              varchar(255),
    create_by           int8,
    create_time         timestamp,
    update_by           int8,
    update_time         timestamp,
    deleted             int4          DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_salon_order_item_order ON salon_order_item (tenant_id, order_id) WHERE deleted = 0;
COMMENT ON TABLE salon_order_item IS '订单明细（服务/商品行 + 服务人员绑定）';
COMMENT ON COLUMN salon_order_item.id IS '明细ID';
COMMENT ON COLUMN salon_order_item.tenant_id IS '租户ID';
COMMENT ON COLUMN salon_order_item.order_id IS '订单ID';
COMMENT ON COLUMN salon_order_item.item_type IS '明细类型（1=服务项目 2=商品）';
COMMENT ON COLUMN salon_order_item.item_id IS '项目/商品ID';
COMMENT ON COLUMN salon_order_item.item_name IS '名称快照（下单时）';
COMMENT ON COLUMN salon_order_item.unit_price IS '原单价（服务=会员价或标准价，商品=销售价）';
COMMENT ON COLUMN salon_order_item.price IS '实际单价（收银可改价）';
COMMENT ON COLUMN salon_order_item.quantity IS '数量';
COMMENT ON COLUMN salon_order_item.discount_rate IS '行折扣率快照（会员等级折扣，1.00=未折；discountable=0 的行恒为1）';
COMMENT ON COLUMN salon_order_item.subtotal IS '行小计（price×quantity×discount_rate）';
COMMENT ON COLUMN salon_order_item.staff_id IS '主服务人员ID（关联sys_user）';
COMMENT ON COLUMN salon_order_item.assistant_id IS '助理ID（关联sys_user）';
COMMENT ON COLUMN salon_order_item.remark IS '备注';
COMMENT ON COLUMN salon_order_item.create_by IS '创建人ID（0=系统）';
COMMENT ON COLUMN salon_order_item.create_time IS '创建时间';
COMMENT ON COLUMN salon_order_item.update_by IS '更新人ID';
COMMENT ON COLUMN salon_order_item.update_time IS '更新时间';
COMMENT ON COLUMN salon_order_item.deleted IS '逻辑删除（0=未删除 1=已删除）';

CREATE TABLE IF NOT EXISTS salon_order_payment (
    id                  int8          NOT NULL PRIMARY KEY,
    tenant_id           int8          NOT NULL,
    order_id            int8          NOT NULL,
    pay_method          int4          NOT NULL,
    amount              numeric(12, 2) NOT NULL,
    remark              varchar(255),
    create_by           int8,
    create_time         timestamp,
    update_by           int8,
    update_time         timestamp,
    deleted             int4          DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_salon_order_payment_order ON salon_order_payment (tenant_id, order_id) WHERE deleted = 0;
COMMENT ON TABLE salon_order_payment IS '订单支付明细（组合支付，每方式一行）';
COMMENT ON COLUMN salon_order_payment.id IS '支付明细ID';
COMMENT ON COLUMN salon_order_payment.tenant_id IS '租户ID';
COMMENT ON COLUMN salon_order_payment.order_id IS '订单ID';
COMMENT ON COLUMN salon_order_payment.pay_method IS '支付方式（字典 pay_method：1现金 2微信 3支付宝 4银行卡 5会员余额 6赠送余额 7积分抵扣 8其他）';
COMMENT ON COLUMN salon_order_payment.amount IS '支付金额';
COMMENT ON COLUMN salon_order_payment.remark IS '备注';
COMMENT ON COLUMN salon_order_payment.create_by IS '创建人ID（0=系统）';
COMMENT ON COLUMN salon_order_payment.create_time IS '创建时间';
COMMENT ON COLUMN salon_order_payment.update_by IS '更新人ID';
COMMENT ON COLUMN salon_order_payment.update_time IS '更新时间';
COMMENT ON COLUMN salon_order_payment.deleted IS '逻辑删除（0=未删除 1=已删除）';

-- ===== 字典种子（租户1 + 租户2 副本） =====
INSERT INTO sys_dict_type (id, name, code, status, remark, group_code, tenant_id, create_by, create_time, update_by, update_time, deleted)
SELECT 7, '支付方式', 'pay_method', 1, '收银/充值支付方式', 'system', 1, 0, CURRENT_TIMESTAMP, 0, CURRENT_TIMESTAMP, 0
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_type WHERE code = 'pay_method' AND tenant_id = 1);
INSERT INTO sys_dict (id, type_code, name, value, sort, status, defaulted, remark, tenant_id)
SELECT v.id, 'pay_method', v.name, v.value, v.sort, 1, 0, NULL, 1
FROM (VALUES
  (81::int8, '现金',       '1', 1),
  (82::int8, '微信',       '2', 2),
  (83::int8, '支付宝',     '3', 3),
  (84::int8, '银行卡',     '4', 4),
  (85::int8, '会员余额',   '5', 5),
  (86::int8, '赠送余额',   '6', 6),
  (87::int8, '积分抵扣',   '7', 7),
  (88::int8, '其他',       '8', 8)
) AS v(id, name, value, sort)
WHERE NOT EXISTS (SELECT 1 FROM sys_dict d WHERE d.type_code = 'pay_method' AND d.value = v.value AND d.tenant_id = 1);

INSERT INTO sys_dict_type (id, name, code, status, remark, group_code, tenant_id, create_by, create_time, update_by, update_time, deleted)
SELECT 8, '订单状态', 'order_status', 1, '收银订单状态', 'system', 1, 0, CURRENT_TIMESTAMP, 0, CURRENT_TIMESTAMP, 0
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_type WHERE code = 'order_status' AND tenant_id = 1);
INSERT INTO sys_dict (id, type_code, name, value, sort, status, defaulted, remark, tenant_id)
SELECT v.id, 'order_status', v.name, v.value, v.sort, 1, 0, NULL, 1
FROM (VALUES
  (91::int8, '挂单',       '0', 1),
  (92::int8, '已支付',     '1', 2),
  (93::int8, '部分退款',   '2', 3),
  (94::int8, '已退款',     '3', 4),
  (95::int8, '已取消',     '4', 5)
) AS v(id, name, value, sort)
WHERE NOT EXISTS (SELECT 1 FROM sys_dict d WHERE d.type_code = 'order_status' AND d.value = v.value AND d.tenant_id = 1);

INSERT INTO sys_dict_type (id, name, code, status, remark, group_code, tenant_id, create_by, create_time, update_by, update_time, deleted)
SELECT d.id + 1000, d.name, d.code, d.status, d.remark, d.group_code, 2084880957290426370, 0, CURRENT_TIMESTAMP, 0, CURRENT_TIMESTAMP, 0
FROM sys_dict_type d
WHERE d.tenant_id = 1 AND d.deleted = 0 AND d.code IN ('pay_method', 'order_status')
  AND NOT EXISTS (SELECT 1 FROM sys_dict_type t WHERE t.code = d.code AND t.tenant_id = 2084880957290426370);
INSERT INTO sys_dict (id, type_code, name, value, sort, status, defaulted, remark, tenant_id)
SELECT d.id + 1000, d.type_code, d.name, d.value, d.sort, d.status, d.defaulted, d.remark, 2084880957290426370
FROM sys_dict d
WHERE d.tenant_id = 1 AND d.type_code IN ('pay_method', 'order_status')
  AND NOT EXISTS (SELECT 1 FROM sys_dict t WHERE t.type_code = d.type_code AND t.value = d.value AND t.tenant_id = 2084880957290426370);

-- ===== 菜单/按钮/角色种子（与 data.sql 一致） =====
INSERT INTO sys_menu (id, parent_id, name, type, path, component, redirect, tree_path, meta, perm, tenant_id, create_by, create_time, update_by, update_time, deleted)
SELECT v.id, v.parent_id, v.name, v.type, v.path, v.component, NULL, v.tree_path, v.meta, NULL, 1, 0, CURRENT_TIMESTAMP, 0, CURRENT_TIMESTAMP, 0
FROM (VALUES
  (20::int8, 0::int8,  'tradeCenter',     2, '/trade',           'Layout',                 '0',    '{"title":"收银中心","icon":"shopping-cart","rank":5,"showLink":true}'),
  (166::int8, 20::int8,'cashier',         1, 'cashier',           'biz/cashier/index',      '0,20', '{"title":"收银开单","icon":"receipt","rank":1,"showLink":true}'),
  (168::int8, 17::int8,'rechargeRecord',  1, 'recharge',          'biz/recharge/index',     '0,17', '{"title":"充值记录","icon":"wallet","rank":2,"showLink":true}'),
  (169::int8, 19::int8,'rechargeActivity',1, 'recharge-activity', 'biz/recharge-activity/index', '0,19', '{"title":"充值活动","icon":"ticket","rank":5,"showLink":true}')
) AS v(id, parent_id, name, type, path, component, tree_path, meta)
WHERE NOT EXISTS (SELECT 1 FROM sys_menu m WHERE m.id = v.id);

INSERT INTO sys_menu (id, parent_id, name, type, path, component, redirect, tree_path, meta, perm, tenant_id, create_by, create_time, update_by, update_time, deleted)
SELECT v.id, v.parent_id, v.name, 4, NULL, NULL, NULL, v.tree_path, v.meta, v.perm, 1, 0, CURRENT_TIMESTAMP, 0, CURRENT_TIMESTAMP, 0
FROM (VALUES
  (181::int8, 166::int8, 'orderList',   '0,20,166', '{"title":"查看订单"}', 'biz:order:list'),
  (182::int8, 166::int8, 'orderView',   '0,20,166', '{"title":"查看详情"}', 'biz:order:view'),
  (183::int8, 166::int8, 'orderAdd',    '0,20,166', '{"title":"开单挂单"}', 'biz:order:add'),
  (184::int8, 166::int8, 'orderPay',    '0,20,166', '{"title":"订单结算"}', 'biz:order:pay'),
  (185::int8, 166::int8, 'orderCancel', '0,20,166', '{"title":"取消订单"}', 'biz:order:cancel'),
  (186::int8, 168::int8, 'rechargeList', '0,17,168', '{"title":"查看记录"}', 'biz:recharge:list'),
  (187::int8, 168::int8, 'rechargeView', '0,17,168', '{"title":"查看详情"}', 'biz:recharge:view'),
  (188::int8, 168::int8, 'rechargeAdd',  '0,17,168', '{"title":"会员充值"}', 'biz:recharge:add'),
  (189::int8, 169::int8, 'rechargeActivityList',   '0,19,169', '{"title":"查看列表"}', 'biz:rechargeActivity:list'),
  (190::int8, 169::int8, 'rechargeActivityView',   '0,19,169', '{"title":"查看详情"}', 'biz:rechargeActivity:view'),
  (191::int8, 169::int8, 'rechargeActivityAdd',    '0,19,169', '{"title":"新增活动"}', 'biz:rechargeActivity:add'),
  (192::int8, 169::int8, 'rechargeActivityEdit',   '0,19,169', '{"title":"编辑活动"}', 'biz:rechargeActivity:edit'),
  (193::int8, 169::int8, 'rechargeActivityDelete', '0,19,169', '{"title":"删除活动"}', 'biz:rechargeActivity:delete')
) AS v(id, parent_id, name, tree_path, meta, perm)
WHERE NOT EXISTS (SELECT 1 FROM sys_menu m WHERE m.id = v.id);

-- ROOT 若为存量库需补挂新菜单
INSERT INTO sys_role_menu (role_id, menu_id, type)
SELECT 1, m.id, 1 FROM sys_menu m
WHERE (m.id IN (20, 166, 168, 169) OR m.id BETWEEN 181 AND 193)
  AND NOT EXISTS (SELECT 1 FROM sys_role_menu rm WHERE rm.role_id = 1 AND rm.menu_id = m.id AND rm.type = 1);

INSERT INTO sys_role_menu (role_id, menu_id, type)
SELECT 2, m.id, 1 FROM sys_menu m
WHERE m.id IN (20, 166, 181, 182, 183, 184, 185,
               17, 168, 186, 187, 188,
               19, 169, 189, 190, 191, 192, 193)
  AND NOT EXISTS (SELECT 1 FROM sys_role_menu rm WHERE rm.role_id = 2 AND rm.menu_id = m.id AND rm.type = 1);

INSERT INTO sys_role_menu (role_id, menu_id, type)
SELECT 3, m.id, 1 FROM sys_menu m
WHERE m.id IN (20, 166, 181, 182, 183, 184,
               168, 186, 187)
  AND NOT EXISTS (SELECT 1 FROM sys_role_menu rm WHERE rm.role_id = 3 AND rm.menu_id = m.id AND rm.type = 1);

-- ===== 示例充值活动（租户1 id 7001-7002；租户2 id 7003-7004） =====
INSERT INTO salon_recharge_activity (id, tenant_id, name, threshold_amount, gift_amount, sort, status, create_by, create_time, update_by, update_time, deleted)
SELECT v.id, 1, v.name, v.threshold_amount, v.gift_amount, v.sort, 1, 0, CURRENT_TIMESTAMP, 0, CURRENT_TIMESTAMP, 0
FROM (VALUES
  (7001::int8, '充500送50',   500.00,  50.00, 1),
  (7002::int8, '充1000送120', 1000.00, 120.00, 2)
) AS v(id, name, threshold_amount, gift_amount, sort)
WHERE NOT EXISTS (SELECT 1 FROM salon_recharge_activity a WHERE a.id = v.id);

INSERT INTO salon_recharge_activity (id, tenant_id, name, threshold_amount, gift_amount, sort, status, create_by, create_time, update_by, update_time, deleted)
SELECT v.id, 2084880957290426370, v.name, v.threshold_amount, v.gift_amount, v.sort, 1, 0, CURRENT_TIMESTAMP, 0, CURRENT_TIMESTAMP, 0
FROM (VALUES
  (7003::int8, '充500送50',   500.00,  50.00, 1),
  (7004::int8, '充1000送120', 1000.00, 120.00, 2)
) AS v(id, name, threshold_amount, gift_amount, sort)
WHERE NOT EXISTS (SELECT 1 FROM salon_recharge_activity a WHERE a.id = v.id);

-- ===== 2026-08-25 冻结口径修正（幂等，按流水重放） =====
-- 历史充值冻结曾按「赠送桶扣减 + 冻结桶增加」挪桶记账：赠送余额被清零、可用余额双重扣减。
-- 新口径：赠送桶保留原值，冻结桶仅作占用标记，可用 = 本金 + 赠送 - 冻结。
-- 修正方式：按流水重放三桶（赠送桶上 change_type 8冻结/9解冻 的挪桶流水视为未发生），重跑收敛。
UPDATE salon_member_balance b
SET principal_balance = COALESCE(agg.principal_sum, 0),
    gift_balance = COALESCE(agg.gift_sum, 0),
    frozen_balance = COALESCE(agg.frozen_sum, 0)
FROM (
    SELECT member_id,
           SUM(CASE WHEN balance_type = 1 THEN change_amount ELSE 0 END) AS principal_sum,
           SUM(CASE WHEN balance_type = 2 AND change_type NOT IN (8, 9) THEN change_amount ELSE 0 END) AS gift_sum,
           SUM(CASE WHEN balance_type = 3 THEN change_amount ELSE 0 END) AS frozen_sum
    FROM salon_member_balance_log
    WHERE deleted = 0
    GROUP BY member_id
) agg
WHERE b.member_id = agg.member_id AND b.deleted = 0;

-- 可用余额（本金+赠送-冻结）全量重算同步到 salon_member.balance
UPDATE salon_member m
SET balance = COALESCE(b.principal_balance, 0) + COALESCE(b.gift_balance, 0) - COALESCE(b.frozen_balance, 0)
FROM salon_member_balance b
WHERE b.member_id = m.id AND b.deleted = 0;
