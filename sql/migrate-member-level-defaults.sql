-- PostgreSQL：内置卡面、常规/活动等级与默认权益。
-- 保留原有等级 ID 和会员归属，仅重配标准默认等级，为现有租户新增两种等级。
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
LOCK TABLE salon_member_level IN SHARE ROW EXCLUSIVE MODE;
ALTER TABLE salon_member_level ADD COLUMN IF NOT EXISTS card_image varchar(255);
ALTER TABLE salon_member_level ADD COLUMN IF NOT EXISTS card_template varchar(32) NOT NULL DEFAULT 'auto'
    CHECK (card_template IN ('auto','lilac','silver','gold','plum','black-gold'));
ALTER TABLE salon_member_level ADD COLUMN IF NOT EXISTS level_type varchar(16) NOT NULL DEFAULT 'REGULAR'
    CHECK (level_type IN ('REGULAR','ACTIVITY'));
COMMENT ON COLUMN salon_member_level.card_image IS '会员卡自选贴图对象键，NULL=使用内置卡面';
COMMENT ON COLUMN salon_member_level.card_template IS '内置卡面模板（auto/lilac/silver/gold/plum/black-gold）';
COMMENT ON COLUMN salon_member_level.level_type IS '等级类型（REGULAR=常规等级，ACTIVITY=活动等级）';

CREATE TEMP TABLE member_level_default_blueprint ON COMMIT DROP AS
SELECT * FROM (VALUES
  ('普通会员',     0, 1.00, 1.00, 1.00, NULL::numeric,  'lilac',      'REGULAR'),
  ('银卡会员',     1, 0.98, 1.00, 1.00, 1000::numeric,  'silver',     'REGULAR'),
  ('金卡会员',     2, 0.95, 0.99, 1.10, 3000::numeric,  'gold',       'REGULAR'),
  ('钻石会员',     3, 0.93, 0.98, 1.20, 8000::numeric,  'plum',       'REGULAR'),
  ('尊享会员',     4, 0.90, 0.97, 1.30, 15000::numeric, 'black-gold', 'REGULAR'),
  ('新客体验会员', 100, 0.98, 1.00, 1.00, NULL::numeric, 'lilac',      'ACTIVITY')
) AS d(name, base_no, service_discount, goods_discount, point_rate, upgrade_threshold, card_template, level_type);

UPDATE salon_member_level AS l
SET service_discount = d.service_discount,
    goods_discount = d.goods_discount,
    point_rate = d.point_rate,
    recharge_gift_rate = 0.00,
    upgrade_threshold = d.upgrade_threshold,
    card_template = CASE WHEN l.card_template = 'auto' OR d.name = '尊享会员'
                         THEN d.card_template ELSE l.card_template END,
    level_type = d.level_type,
    update_by = 0,
    update_time = CURRENT_TIMESTAMP
FROM member_level_default_blueprint AS d
WHERE l.deleted = 0 AND l.name = d.name
  AND (l.level_no = d.base_no OR d.name IN ('新客体验会员','尊享会员'))
  AND EXISTS (SELECT 1 FROM sys_tenant t WHERE t.id = l.tenant_id AND t.deleted = 0);

WITH missing AS (
    SELECT t.id AS tenant_id, d.*,
           CASE WHEN d.level_type = 'ACTIVITY'
                THEN GREATEST(100, COALESCE((SELECT MAX(l.level_no) FROM salon_member_level l
                      WHERE l.tenant_id = t.id AND l.deleted = 0), 0) + 2)
                ELSE GREATEST(d.base_no, COALESCE((SELECT MAX(l.level_no) FROM salon_member_level l
                      WHERE l.tenant_id = t.id AND l.deleted = 0 AND l.level_type = 'REGULAR'), -1) + 1)
           END AS target_no
    FROM sys_tenant t CROSS JOIN member_level_default_blueprint d
    WHERE t.deleted = 0 AND d.name IN ('新客体验会员','尊享会员')
      AND NOT EXISTS (SELECT 1 FROM salon_member_level l
                      WHERE l.tenant_id = t.id AND l.name = d.name AND l.deleted = 0)
), numbered AS (
    SELECT m.*, COALESCE((SELECT MAX(id) FROM salon_member_level), 0)
                + ROW_NUMBER() OVER (ORDER BY tenant_id, base_no) AS target_id
    FROM missing m
)
INSERT INTO salon_member_level
    (id, tenant_id, name, level_no, card_template, level_type,
     service_discount, goods_discount, point_rate, recharge_gift_rate, upgrade_threshold,
     rights, sort, status, remark, create_by, create_time, update_by, update_time, deleted)
SELECT target_id, tenant_id, name, target_no, card_template, level_type,
       service_discount, goods_discount, point_rate, 0.00, upgrade_threshold,
       '{}'::jsonb, base_no, 1,
       CASE WHEN level_type = 'ACTIVITY'
            THEN '活动专用，手动选择；不参与自动升级，活动结束后由店员切回常规等级'
            ELSE '系统默认等级；无长期充值赠送，可按门店经营情况调整' END,
       0, CURRENT_TIMESTAMP, 0, CURRENT_TIMESTAMP, 0
FROM numbered;
COMMIT;
