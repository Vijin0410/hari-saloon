-- ===== P6 订单退款 存量库迁移（幂等可重跑） =====
-- 背景：docs/payment-design.md §9 阶段5。退款单表带渠道侧字段（退款手续费/手续费是否返还），
--       PayChannel SPI 增 refund 能力（支付宝 alipay.trade.refund 同步 / 微信 V3 refund + 退款回调），
--       订单状态 2 部分退款 / 3 已退款落地；余额退款与扣款顺序对称（先本后赠）。
-- 变更：① 新表 salon_refund_order（退款单）+ salon_refund_payment（退款分摊明细）；
--       ② 积分变动类型字典加 9=退款退回（id 69，含租户 2084880957290426370 副本）；
--       ③ 菜单按钮 200 biz:order:refund（挂收银开单 166，店长授权、店员不给）；
--       ④ 注释刷新：salon_order.status（2/3 已生效）、salon_pay_record.refund_id。
-- 执行后须重启应用刷新 Redis 字典缓存；已有库 sql.init.mode=never 不会自动执行本脚本。
-- 方言：PostgreSQL

-- ===== ① 新表 =====
CREATE TABLE IF NOT EXISTS salon_refund_order (
    id                   int8          NOT NULL PRIMARY KEY,
    tenant_id            int8          NOT NULL,
    store_id             int8          NOT NULL,
    refund_no            varchar(32)   NOT NULL,
    order_id             int8          NOT NULL,
    order_no             varchar(32),
    member_id            int8,
    refund_amount        numeric(12, 2) NOT NULL,
    point_refund_points  int4          DEFAULT 0,
    point_refund_amount  numeric(12, 2) DEFAULT 0,
    balance_refund_amount numeric(12, 2) DEFAULT 0,
    reason               varchar(255),
    status               int4          NOT NULL DEFAULT 0,
    success_time         timestamp,
    remark               varchar(255),
    create_by            int8,
    create_time          timestamp,
    update_by            int8,
    update_time          timestamp,
    deleted              int4          DEFAULT 0
);
CREATE UNIQUE INDEX IF NOT EXISTS uk_salon_refund_no ON salon_refund_order (tenant_id, refund_no) WHERE deleted = 0;
CREATE INDEX IF NOT EXISTS idx_salon_refund_order ON salon_refund_order (tenant_id, order_id, create_time) WHERE deleted = 0;
CREATE INDEX IF NOT EXISTS idx_salon_refund_processing ON salon_refund_order (tenant_id, create_time) WHERE deleted = 0 AND status = 0;
COMMENT ON TABLE salon_refund_order IS '退款单（一次退款动作一行；0=处理中 1=成功 2=失败，整体生效/失败）';
COMMENT ON COLUMN salon_refund_order.id IS '退款单ID';
COMMENT ON COLUMN salon_refund_order.tenant_id IS '租户ID';
COMMENT ON COLUMN salon_refund_order.store_id IS '原订单开单门店ID（冗余，门店权限校验）';
COMMENT ON COLUMN salon_refund_order.refund_no IS '退款单号（SR+时间+随机；渠道侧商户退款单号 out_refund_no 复用此号）';
COMMENT ON COLUMN salon_refund_order.order_id IS '原订单ID';
COMMENT ON COLUMN salon_refund_order.order_no IS '原订单号（冗余展示）';
COMMENT ON COLUMN salon_refund_order.member_id IS '会员ID（NULL=散客）';
COMMENT ON COLUMN salon_refund_order.refund_amount IS '退款总额（元，资金口径=退回顾客的钱，含退回会员余额部分，不含积分退回折算）';
COMMENT ON COLUMN salon_refund_order.point_refund_points IS '退回积分数（订单资金全额退光时一并退回积分抵扣）';
COMMENT ON COLUMN salon_refund_order.point_refund_amount IS '退回积分折算金额（100积分=1元，留痕）';
COMMENT ON COLUMN salon_refund_order.balance_refund_amount IS '其中退回会员余额的金额（先本后赠，分桶流水见 salon_member_balance_log）';
COMMENT ON COLUMN salon_refund_order.reason IS '退款原因（必填）';
COMMENT ON COLUMN salon_refund_order.status IS '退款单状态（0=处理中 1=成功 2=失败；系统内退回与订单状态流转在置 1 时同事务生效）';
COMMENT ON COLUMN salon_refund_order.success_time IS '退款成功时间';
COMMENT ON COLUMN salon_refund_order.remark IS '备注（失败原因等）';
COMMENT ON COLUMN salon_refund_order.create_by IS '创建人ID（0=系统，退款申请人）';
COMMENT ON COLUMN salon_refund_order.create_time IS '创建时间';
COMMENT ON COLUMN salon_refund_order.update_by IS '更新人ID';
COMMENT ON COLUMN salon_refund_order.update_time IS '更新时间';
COMMENT ON COLUMN salon_refund_order.deleted IS '逻辑删除（0=未删除 1=已删除）';

CREATE TABLE IF NOT EXISTS salon_refund_payment (
    id                  int8          NOT NULL PRIMARY KEY,
    tenant_id           int8          NOT NULL,
    refund_id           int8          NOT NULL,
    pay_method          int4          NOT NULL,
    amount              numeric(12, 2) NOT NULL,
    pay_record_id       int8,
    channel             varchar(16),
    out_refund_no       varchar(32),
    channel_refund_no   varchar(64),
    channel_status      varchar(16)   NOT NULL DEFAULT 'processing',
    fee_amount          numeric(12, 2),
    fee_returned        int4          DEFAULT 0,
    raw_payload         text,
    remark              varchar(255),
    create_by           int8,
    create_time         timestamp,
    update_by           int8,
    update_time         timestamp,
    deleted             int4          DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_salon_refund_payment ON salon_refund_payment (tenant_id, refund_id) WHERE deleted = 0;
CREATE INDEX IF NOT EXISTS idx_salon_refund_payment_record ON salon_refund_payment (tenant_id, pay_record_id) WHERE deleted = 0 AND pay_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_salon_refund_payment_processing ON salon_refund_payment (tenant_id, channel, update_time) WHERE deleted = 0 AND channel_status = 'processing';
COMMENT ON TABLE salon_refund_payment IS '退款分摊明细（每支付方式一行；外部渠道行绑定原支付流水调渠道退款，系统内退回行渠道为空）';
COMMENT ON COLUMN salon_refund_payment.id IS '退款分摊行ID';
COMMENT ON COLUMN salon_refund_payment.tenant_id IS '租户ID';
COMMENT ON COLUMN salon_refund_payment.refund_id IS '退款单ID';
COMMENT ON COLUMN salon_refund_payment.pay_method IS '退回支付方式（字典 pay_method；7积分退回记退款单头不落行）';
COMMENT ON COLUMN salon_refund_payment.amount IS '本行退款金额';
COMMENT ON COLUMN salon_refund_payment.pay_record_id IS '绑定的原支付流水ID（渠道退款的调用依据；系统内退回/线下退款为空）';
COMMENT ON COLUMN salon_refund_payment.channel IS '退款渠道（wxpay/alipay 调渠道原路退回；系统内退回为空）';
COMMENT ON COLUMN salon_refund_payment.out_refund_no IS '商户退款单号（渠道幂等键，=退款单号；微信 out_refund_no / 支付宝 out_request_no）';
COMMENT ON COLUMN salon_refund_payment.channel_refund_no IS '渠道退款单号（微信 refund_id / 支付宝 trade_no；回调/查单回填）';
COMMENT ON COLUMN salon_refund_payment.channel_status IS '退款处理状态（processing=处理中 success=已生效 failed=失败；系统内退回在退款单确认时置 success）';
COMMENT ON COLUMN salon_refund_payment.fee_amount IS '渠道退款手续费（元；直连退款响应无此数据由 P8 对账单回填）';
COMMENT ON COLUMN salon_refund_payment.fee_returned IS '手续费是否返还（0=否 1=是；直连退款手续费不返还属常态，商家承担，默认 0）';
COMMENT ON COLUMN salon_refund_payment.raw_payload IS '渠道退款响应原始报文（JSON 留痕）';
COMMENT ON COLUMN salon_refund_payment.remark IS '备注（如：线下退款-无系统支付流水）';
COMMENT ON COLUMN salon_refund_payment.create_by IS '创建人ID（0=系统）';
COMMENT ON COLUMN salon_refund_payment.create_time IS '创建时间';
COMMENT ON COLUMN salon_refund_payment.update_by IS '更新人ID';
COMMENT ON COLUMN salon_refund_payment.update_time IS '更新时间';
COMMENT ON COLUMN salon_refund_payment.deleted IS '逻辑删除（0=未删除 1=已删除）';

-- ===== ② 字典：point_change_type 加 9=退款退回（id 69） =====
INSERT INTO sys_dict (id, type_code, name, value, sort, status, defaulted, remark, tenant_id)
SELECT 69, 'point_change_type', '退款退回', '9', 9, 1, 0, NULL, 1
WHERE NOT EXISTS (SELECT 1 FROM sys_dict d WHERE d.type_code = 'point_change_type' AND d.value = '9' AND d.tenant_id = 1);

-- 字典租户副本（2084880957290426370，id = 租户1 + 1000）
INSERT INTO sys_dict (id, type_code, name, value, sort, status, defaulted, remark, tenant_id)
SELECT d.id + 1000, d.type_code, d.name, d.value, d.sort, d.status, d.defaulted, d.remark, 2084880957290426370
FROM sys_dict d
WHERE d.tenant_id = 1 AND d.type_code = 'point_change_type'
  AND NOT EXISTS (SELECT 1 FROM sys_dict t WHERE t.type_code = d.type_code AND t.value = d.value AND t.tenant_id = 2084880957290426370);

-- ===== ③ 菜单按钮：订单退款 biz:order:refund（挂收银开单 166） =====
INSERT INTO sys_menu (id, parent_id, name, type, path, component, redirect, tree_path, meta, perm, tenant_id, create_by, create_time, update_by, update_time, deleted)
SELECT 200, 166, 'orderRefund', 4, NULL, NULL, NULL, '0,20,166', '{"title":"订单退款"}', 'biz:order:refund', 1, 0, CURRENT_TIMESTAMP, 0, CURRENT_TIMESTAMP, 0
WHERE NOT EXISTS (SELECT 1 FROM sys_menu m WHERE m.id = 200);

-- 店长(role 2)授权（资金敏感：店员不给）
INSERT INTO sys_role_menu (role_id, menu_id, type)
SELECT 2, 200, 1
WHERE NOT EXISTS (SELECT 1 FROM sys_role_menu rm WHERE rm.role_id = 2 AND rm.menu_id = 200 AND rm.type = 1);

-- ===== ④ 注释刷新 =====
COMMENT ON COLUMN salon_order.status IS '状态（0=挂单 1=已支付 2=部分退款 3=已退款 4=已取消）';
COMMENT ON COLUMN salon_pay_record.refund_id IS '关联退款单ID（渠道流水被退款全额退光置 refunded 时记录首次触发的退款单；精确分摊见 salon_refund_payment.pay_record_id）';
