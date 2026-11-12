-- PostgreSQL；存量库升级；幂等。首次升级旧租户显式保留启用，后续新租户默认关闭。
BEGIN;
ALTER TABLE sys_tenant ADD COLUMN IF NOT EXISTS points_enabled int4 NOT NULL DEFAULT 1;
ALTER TABLE sys_tenant ALTER COLUMN points_enabled SET DEFAULT 0;
COMMENT ON COLUMN sys_tenant.points_enabled IS '启用会员积分（1=启用 0=停用，新租户默认停用）';
ALTER TABLE salon_member ADD COLUMN IF NOT EXISTS point_debt int4 NOT NULL DEFAULT 0;
COMMENT ON COLUMN salon_member.point_debt IS '待追回积分（后续消费奖励抵扣，非可用积分负债余额）';
ALTER TABLE salon_member_point_log ADD COLUMN IF NOT EXISTS refund_processed_points int4 NOT NULL DEFAULT 0;
ALTER TABLE salon_member_point_log ADD COLUMN IF NOT EXISTS debt_change_points int4 NOT NULL DEFAULT 0;
COMMENT ON COLUMN salon_member_point_log.refund_processed_points IS '已处理退款权益数量（含已退回、已扣回、过期免扣、待追回）';
COMMENT ON COLUMN salon_member_point_log.debt_change_points IS '待追回积分变动（正=新增待追回 负=奖励抵扣）';
ALTER TABLE salon_order ADD COLUMN IF NOT EXISTS points_enabled_snapshot int4;
ALTER TABLE salon_order ADD COLUMN IF NOT EXISTS point_rate_snapshot numeric(12,4);
COMMENT ON COLUMN salon_order.points_enabled_snapshot IS '支付开始时积分启用快照（1=启用 0=停用）';
COMMENT ON COLUMN salon_order.point_rate_snapshot IS '支付开始时消费积分倍率快照';
-- 已开始的旧扫码单保留旧行为；今后每次支付开始均由后端保存快照。
UPDATE salon_order o SET points_enabled_snapshot=1, point_rate_snapshot=COALESCE(
 (SELECT l.point_rate FROM salon_member m LEFT JOIN salon_member_level l ON l.id=m.level_id WHERE m.id=o.member_id),1)
WHERE o.points_enabled_snapshot IS NULL;
ALTER TABLE salon_refund_order ADD COLUMN IF NOT EXISTS point_clawback_points int4 NOT NULL DEFAULT 0;
COMMENT ON COLUMN salon_refund_order.point_clawback_points IS '应回收消费赠送积分';
ALTER TABLE salon_refund_order ADD COLUMN IF NOT EXISTS point_clawback_deducted int4 NOT NULL DEFAULT 0;
COMMENT ON COLUMN salon_refund_order.point_clawback_deducted IS '实际扣回可用积分';
ALTER TABLE salon_refund_order ADD COLUMN IF NOT EXISTS point_clawback_expired int4 NOT NULL DEFAULT 0;
COMMENT ON COLUMN salon_refund_order.point_clawback_expired IS '原奖励已过期免扣积分';
ALTER TABLE salon_refund_order ADD COLUMN IF NOT EXISTS point_clawback_debt int4 NOT NULL DEFAULT 0;
COMMENT ON COLUMN salon_refund_order.point_clawback_debt IS '本次新增待追回积分';
COMMENT ON COLUMN salon_refund_order.point_refund_points IS '退回原抵扣积分数（按累计成功资金比例，纯积分订单全退）';
COMMENT ON COLUMN salon_member_point_log.change_type IS '变动类型（1消费获得 2充值获得 3活动赠送 4手工调整 5抵扣消费 6兑换商品 7手工扣减 8过期清零 9退款退回 10退款奖励回收 11奖励抵扣待追回）';
CREATE TABLE IF NOT EXISTS salon_member_settings_audit (
 id int8 PRIMARY KEY, tenant_id int8 NOT NULL, before_enabled int4 NOT NULL, after_enabled int4 NOT NULL,
 create_by int8, create_time timestamp, update_by int8, update_time timestamp, deleted int4 DEFAULT 0
);
COMMENT ON TABLE salon_member_settings_audit IS '会员积分开关修改审计';
COMMENT ON COLUMN salon_member_settings_audit.id IS '审计ID';
COMMENT ON COLUMN salon_member_settings_audit.tenant_id IS '租户ID';
COMMENT ON COLUMN salon_member_settings_audit.before_enabled IS '修改前积分开关（1=启用 0=停用）';
COMMENT ON COLUMN salon_member_settings_audit.after_enabled IS '修改后积分开关（1=启用 0=停用）';
COMMENT ON COLUMN salon_member_settings_audit.create_by IS '操作者ID';
COMMENT ON COLUMN salon_member_settings_audit.create_time IS '操作时间';
COMMENT ON COLUMN salon_member_settings_audit.update_by IS '更新人ID';
COMMENT ON COLUMN salon_member_settings_audit.update_time IS '更新时间';
COMMENT ON COLUMN salon_member_settings_audit.deleted IS '逻辑删除（0=未删除 1=已删除）';
-- 旧退款已退回抵扣积分：标记原扣减流水已处理，防再次退回；旧流水未关联批次不猜造有效期。
UPDATE salon_member_point_log d SET refund_processed_points=ABS(d.change_points)
WHERE d.change_type=5 AND d.biz_type='ORDER' AND d.refund_processed_points=0
 AND EXISTS (SELECT 1 FROM salon_refund_order r WHERE r.order_id=d.biz_id AND r.tenant_id=d.tenant_id AND r.status=1 AND r.deleted=0 AND r.point_refund_points>0
 AND EXISTS (SELECT 1 FROM salon_member_point_log old_back WHERE old_back.biz_type='REFUND'
 AND old_back.biz_id=r.id AND old_back.change_type=9 AND old_back.source_log_id IS NULL AND old_back.deleted=0));

-- 会员设置（业务配置）；租户管理员可管理，店长仅查看，店员不授权。
INSERT INTO sys_menu (id,parent_id,name,type,path,component,tree_path,meta,perm,tenant_id,create_by,create_time,deleted)
SELECT v.id,v.parent_id,v.name,v.type,v.path,v.component,v.tree_path,v.meta,v.perm,1,0,CURRENT_TIMESTAMP,0
FROM (VALUES
 (201::int8,19::int8,'memberSettings',1,'member-settings','biz/member-settings/index','0,19','{"title":"会员设置","icon":"settings","rank":1,"showLink":true}',NULL),
 (202::int8,201::int8,'memberSettingsList',4,NULL,NULL,'0,19,201','{"title":"查看会员设置"}','biz:memberSettings:list'),
 (203::int8,201::int8,'memberSettingsEdit',4,NULL,NULL,'0,19,201','{"title":"修改会员设置"}','biz:memberSettings:edit')
) v(id,parent_id,name,type,path,component,tree_path,meta,perm)
WHERE NOT EXISTS (SELECT 1 FROM sys_menu m WHERE m.id=v.id);
INSERT INTO sys_role_menu (role_id,menu_id,type)
SELECT r.id,m.id,1 FROM sys_role r CROSS JOIN sys_menu m
WHERE r.deleted=0 AND ((r.code='ROOT' AND r.tenant_id=1 AND m.id IN (201,202,203)) OR (r.code='TENANT_ADMIN' AND m.id IN (19,201,202,203)) OR (r.code='STORE_MANAGER' AND m.id IN (19,201,202)))
AND NOT EXISTS(SELECT 1 FROM sys_role_menu rm WHERE rm.role_id=r.id AND rm.menu_id=m.id AND rm.type=1);
INSERT INTO sys_dict(id,type_code,name,value,sort,status,defaulted,tenant_id)
SELECT v.id,'point_change_type',v.name,v.value,v.id::int4,1,0,1
FROM (VALUES (70::int8,'退款奖励回收','10'),(71::int8,'奖励抵扣待追回','11')) v(id,name,value)
WHERE NOT EXISTS(SELECT 1 FROM sys_dict d WHERE d.type_code='point_change_type' AND d.value=v.value AND d.tenant_id=1);
INSERT INTO sys_dict(id,type_code,name,value,sort,status,defaulted,tenant_id)
SELECT d.id+1000,d.type_code,d.name,d.value,d.sort,d.status,d.defaulted,2084880957290426370
FROM sys_dict d WHERE d.tenant_id=1 AND d.type_code='point_change_type' AND d.value IN ('10','11')
AND NOT EXISTS(SELECT 1 FROM sys_dict t WHERE t.tenant_id=2084880957290426370 AND t.type_code=d.type_code AND t.value=d.value);

COMMIT;
