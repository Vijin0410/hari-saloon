-- PostgreSQL：门店自然日日结快照；唯一约束防并发重复结算。
CREATE TABLE IF NOT EXISTS salon_daily_settlement (
    id            int8         NOT NULL PRIMARY KEY,
    tenant_id     int8         NOT NULL,
    store_id      int8         NOT NULL,
    business_date date         NOT NULL,
    snapshot      text         NOT NULL,
    fingerprint   varchar(64)  NOT NULL,
    remark        varchar(500),
    create_by     int8,
    create_time   timestamp,
    update_by     int8,
    update_time   timestamp,
    deleted       int4         NOT NULL DEFAULT 0,
    CONSTRAINT uk_daily_settlement UNIQUE (tenant_id, store_id, business_date)
);
COMMENT ON TABLE salon_daily_settlement IS '门店自然日日结快照';
COMMENT ON COLUMN salon_daily_settlement.id IS '日结ID';
COMMENT ON COLUMN salon_daily_settlement.tenant_id IS '租户ID';
COMMENT ON COLUMN salon_daily_settlement.store_id IS '门店ID';
COMMENT ON COLUMN salon_daily_settlement.business_date IS '营业日期';
COMMENT ON COLUMN salon_daily_settlement.snapshot IS '冻结报表JSON';
COMMENT ON COLUMN salon_daily_settlement.fingerprint IS '业务明细指纹';
COMMENT ON COLUMN salon_daily_settlement.remark IS '日结备注';
COMMENT ON COLUMN salon_daily_settlement.create_by IS '确认人ID';
COMMENT ON COLUMN salon_daily_settlement.create_time IS '确认时间';
COMMENT ON COLUMN salon_daily_settlement.update_by IS '更新人ID';
COMMENT ON COLUMN salon_daily_settlement.update_time IS '更新时间';
COMMENT ON COLUMN salon_daily_settlement.deleted IS '逻辑删除标记';
CREATE INDEX IF NOT EXISTS idx_finance_order_date ON salon_order (store_id, paid_time)
    WHERE deleted = 0 AND status IN (1, 2, 3);
CREATE INDEX IF NOT EXISTS idx_finance_recharge_date ON salon_recharge_order (store_id, pay_time)
    WHERE deleted = 0 AND status = 1;
CREATE INDEX IF NOT EXISTS idx_finance_refund_date ON salon_refund_order (store_id, success_time)
    WHERE deleted = 0 AND status = 1;
CREATE INDEX IF NOT EXISTS idx_finance_balance_date ON salon_member_balance_log (store_id, balance_type, create_time)
    WHERE deleted = 0;
-- 财务与经营：默认授权 ROOT、租户管理员、店长，店员不默认开放。
INSERT INTO sys_menu(id,parent_id,name,type,path,component,tree_path,meta,perm,tenant_id,create_by,create_time,deleted)
SELECT v.id,v.parent_id,v.name,v.type,v.path,v.component,v.tree_path,v.meta,v.perm,1,0,CURRENT_TIMESTAMP,0 FROM (VALUES
 (210::int8,0::int8,'financeCenter',2,'/finance','Layout','0','{"title":"经营财务","icon":"wallet","rank":30,"showLink":true}',NULL),
 (211::int8,210::int8,'finance',1,'daily','biz/finance/index','0,210','{"title":"财务日结","icon":"receipt","rank":1,"showLink":true}',NULL),
 (212::int8,210::int8,'reports',1,'reports','biz/reports/index','0,210','{"title":"经营报表","icon":"clipboard-list","rank":2,"showLink":true}',NULL),
 (213::int8,211::int8,'financeList',4,NULL,NULL,'0,210,211','{"title":"查看财务"}','biz:finance:list'),
 (214::int8,211::int8,'financeSettle',4,NULL,NULL,'0,210,211','{"title":"确认日结"}','biz:finance:settle'),
 (215::int8,211::int8,'financeExport',4,NULL,NULL,'0,210,211','{"title":"导出财务"}','biz:finance:export'),
 (216::int8,212::int8,'reportList',4,NULL,NULL,'0,210,212','{"title":"查看经营报表"}','biz:report:list')
) v(id,parent_id,name,type,path,component,tree_path,meta,perm)
WHERE NOT EXISTS(SELECT 1 FROM sys_menu m WHERE m.id=v.id);
INSERT INTO sys_role_menu(role_id,menu_id,type)
SELECT r.id,m.id,1 FROM sys_role r CROSS JOIN sys_menu m
WHERE r.deleted=0 AND r.code IN('ROOT','TENANT_ADMIN','STORE_MANAGER') AND m.id BETWEEN 210 AND 216
AND NOT EXISTS(SELECT 1 FROM sys_role_menu rm WHERE rm.role_id=r.id AND rm.menu_id=m.id AND rm.type=1);
