-- ===== 支付流水手续费/实收字段 存量库迁移（幂等可重跑） =====
-- 背景：直连（支付宝/微信）回调不带手续费，服务商（收钱吧/富掌柜）回调带 fee/merchant_amount；
--       字段统一可空——回调给多少记多少，直连由 P8 对账单回填，报表实收口径取 merchant_amount。
-- 变更：salon_pay_record 加 5 列（payer_amount/fee_amount/merchant_amount/settle_date/fee_source），
--       并刷新 amount 注释（明确「订单金额=入账锚点」口径，与用户实付/商家实收区分）。
-- 方言：PostgreSQL

-- ===== DDL =====
ALTER TABLE salon_pay_record ADD COLUMN IF NOT EXISTS payer_amount numeric(12, 2);
ALTER TABLE salon_pay_record ADD COLUMN IF NOT EXISTS fee_amount numeric(12, 2);
ALTER TABLE salon_pay_record ADD COLUMN IF NOT EXISTS merchant_amount numeric(12, 2);
ALTER TABLE salon_pay_record ADD COLUMN IF NOT EXISTS settle_date date;
ALTER TABLE salon_pay_record ADD COLUMN IF NOT EXISTS fee_source varchar(16);
ALTER TABLE salon_pay_record ADD COLUMN IF NOT EXISTS biz_form text;

-- ===== 注释 =====
COMMENT ON COLUMN salon_pay_record.amount IS '订单金额（商家应收，元；渠道下单金额，入账与回调校验锚点）';
COMMENT ON COLUMN salon_pay_record.payer_amount IS '用户实付金额（元；微信payer_total/支付宝buyer_pay_amount，平台补贴优惠时小于订单金额，仅留痕解释不参与入账）';
COMMENT ON COLUMN salon_pay_record.fee_amount IS '渠道手续费（元；直连回调无此字段由P8对账单回填，服务商（收钱吧/富掌柜）回调可带）';
COMMENT ON COLUMN salon_pay_record.merchant_amount IS '商家实收金额（元=订单金额-商家侧优惠-手续费；直连对账回填，服务商回调可带，老板到手口径）';
COMMENT ON COLUMN salon_pay_record.settle_date IS '结算到账日期（服务商D+1等；直连对账回填）';
COMMENT ON COLUMN salon_pay_record.fee_source IS '手续费来源（callback=回调实时获取 bill=对账单回填）';
COMMENT ON COLUMN salon_pay_record.biz_form IS '业务支付表单快照（JSON；订单扫码两阶段确认反序列化重放结算，充值等单据自含场景为空）';
