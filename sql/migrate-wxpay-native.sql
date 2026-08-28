-- ===== 微信 Native 直连（充值场景） 存量库迁移（幂等可重跑） =====
-- 新表：salon_pay_record（渠道支付流水）
-- 变更：salon_recharge_order 加 status 列（存量置已支付）
-- 方言：PostgreSQL

-- ===== DDL =====
ALTER TABLE salon_recharge_order ADD COLUMN IF NOT EXISTS status int4 NOT NULL DEFAULT 1;
COMMENT ON COLUMN salon_recharge_order.status IS '支付状态（0=待支付（渠道扫码中） 1=已支付；默认1兼容一期手动确认即入账）';

-- 2026-08-28 状态扩展：2=已取消（超时关闭或人工取消，未入账；存量库重跑本文件即生效）
COMMENT ON COLUMN salon_recharge_order.status IS '支付状态（0=待支付（渠道扫码中） 1=已支付 2=已取消（超时关闭或人工取消）；默认1兼容一期手动确认即入账）';

CREATE TABLE IF NOT EXISTS salon_pay_record (
    id                  int8          NOT NULL PRIMARY KEY,
    tenant_id           int8          NOT NULL,
    biz_type            int4          NOT NULL,
    biz_id              int8          NOT NULL,
    order_id            int8,
    refund_id           int8,
    channel             varchar(16)   NOT NULL,
    settle_type         varchar(16)   NOT NULL,
    out_trade_no        varchar(32)   NOT NULL,
    transaction_id      varchar(64),
    amount              numeric(12, 2) NOT NULL,
    status              varchar(16)   NOT NULL DEFAULT 'pending',
    source              varchar(24),
    paid_at             timestamp,
    raw_payload         text,
    remark              varchar(255),
    create_by           int8,
    create_time         timestamp,
    update_by           int8,
    update_time         timestamp,
    deleted             int4          DEFAULT 0
);
CREATE UNIQUE INDEX IF NOT EXISTS uk_salon_pay_record_out_trade_no ON salon_pay_record (tenant_id, out_trade_no) WHERE deleted = 0;
CREATE INDEX IF NOT EXISTS idx_salon_pay_record_biz ON salon_pay_record (tenant_id, biz_type, biz_id) WHERE deleted = 0;
CREATE INDEX IF NOT EXISTS idx_salon_pay_record_pending ON salon_pay_record (tenant_id, status, create_time) WHERE deleted = 0 AND status = 'pending';
CREATE INDEX IF NOT EXISTS idx_salon_pay_record_transaction ON salon_pay_record (transaction_id) WHERE deleted = 0 AND transaction_id IS NOT NULL;
COMMENT ON TABLE salon_pay_record IS '支付流水（渠道下单即落pending，回调/查单确认；P8对账依据）';
COMMENT ON COLUMN salon_pay_record.id IS '支付流水ID';
COMMENT ON COLUMN salon_pay_record.tenant_id IS '租户ID';
COMMENT ON COLUMN salon_pay_record.biz_type IS '业务类型（1=充值订单 2·=收银订单，预留）';
COMMENT ON COLUMN salon_pay_record.biz_id IS '业务单据ID（biz_type 对应表主键）';
COMMENT ON COLUMN salon_pay_record.order_id IS '关联收银订单ID（收银场景）';
COMMENT ON COLUMN salon_pay_record.refund_id IS '关联退款单ID（退款时，预留 P6）';
COMMENT ON COLUMN salon_pay_record.channel IS '支付渠道（字典 pay_channel：wxpay 等）';
COMMENT ON COLUMN salon_pay_record.settle_type IS '结算模式（字典 pay_settle_type：self_merchant 直连）';
COMMENT ON COLUMN salon_pay_record.out_trade_no IS '系统内部交易单号（租户内唯一，下单传渠道；回调反查键）';
COMMENT ON COLUMN salon_pay_record.transaction_id IS '渠道交易单号（微信 transaction_id；回调/查单回填）';
COMMENT ON COLUMN salon_pay_record.amount IS '支付金额（下单金额，元）';
COMMENT ON COLUMN salon_pay_record.status IS '流水状态（pending=已下单待支付 paid=已支付 refunded=已退款 failed=失败/超时关闭）';
COMMENT ON COLUMN salon_pay_record.source IS '确认来源（realtime_callback=实时回调 query_compensate=查单补偿 aggregate_pull=聚合拉单 manual_input=手动录入）';
COMMENT ON COLUMN salon_pay_record.paid_at IS '支付完成时间（渠道口径）';
COMMENT ON COLUMN salon_pay_record.raw_payload IS '回调/查单原始报文（JSON 留痕，可审计）';
COMMENT ON COLUMN salon_pay_record.remark IS '备注';
COMMENT ON COLUMN salon_pay_record.create_by IS '创建人ID（0=系统）';
COMMENT ON COLUMN salon_pay_record.create_time IS '创建时间';
COMMENT ON COLUMN salon_pay_record.update_by IS '更新人ID';
COMMENT ON COLUMN salon_pay_record.update_time IS '更新时间';
COMMENT ON COLUMN salon_pay_record.deleted IS '逻辑删除（0=未删除 1=已删除）';
