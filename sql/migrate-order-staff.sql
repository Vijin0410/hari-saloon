-- PostgreSQL：角色开单默认身份；重复执行不会覆盖管理员后续调整。
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = current_schema() AND table_name = 'sys_role'
                     AND column_name = 'order_staff_type') THEN
        ALTER TABLE sys_role ADD COLUMN order_staff_type varchar(16) NOT NULL DEFAULT 'NONE'
            CHECK (order_staff_type IN ('NONE', 'STAFF', 'ASSISTANT'));
        UPDATE sys_role SET order_staff_type = 'STAFF' WHERE code = 'STORE_STAFF';
    END IF;
END $$;
COMMENT ON COLUMN sys_role.order_staff_type IS '开单默认身份（NONE=默认服务人员 STAFF=服务人员 ASSISTANT=助理）';

CREATE TABLE IF NOT EXISTS salon_order_staff_change (
    id int8 NOT NULL PRIMARY KEY,
    tenant_id int8 NOT NULL,
    order_id int8 NOT NULL,
    order_item_id int8 NOT NULL,
    item_name varchar(255) NOT NULL,
    before_staff_id int8,
    after_staff_id int8 NOT NULL,
    before_assistant_id int8,
    after_assistant_id int8,
    before_staff_name varchar(128),
    after_staff_name varchar(128),
    before_assistant_name varchar(128),
    after_assistant_name varchar(128),
    reason varchar(255) NOT NULL,
    operator_name varchar(128),
    create_by int8,
    create_time timestamp,
    update_by int8,
    update_time timestamp,
    deleted int4 DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_salon_order_staff_change_order
    ON salon_order_staff_change (tenant_id, order_id, create_time DESC);
COMMENT ON TABLE salon_order_staff_change IS '订单服务人员更正记录';
COMMENT ON COLUMN salon_order_staff_change.id IS '更正记录ID';
COMMENT ON COLUMN salon_order_staff_change.tenant_id IS '租户ID';
COMMENT ON COLUMN salon_order_staff_change.order_id IS '订单ID';
COMMENT ON COLUMN salon_order_staff_change.order_item_id IS '订单明细ID';
COMMENT ON COLUMN salon_order_staff_change.item_name IS '明细名称快照';
COMMENT ON COLUMN salon_order_staff_change.before_staff_id IS '原主服务人员ID';
COMMENT ON COLUMN salon_order_staff_change.after_staff_id IS '新主服务人员ID';
COMMENT ON COLUMN salon_order_staff_change.before_assistant_id IS '原助理ID';
COMMENT ON COLUMN salon_order_staff_change.after_assistant_id IS '新助理ID';
COMMENT ON COLUMN salon_order_staff_change.before_staff_name IS '原主服务人员姓名快照';
COMMENT ON COLUMN salon_order_staff_change.after_staff_name IS '新主服务人员姓名快照';
COMMENT ON COLUMN salon_order_staff_change.before_assistant_name IS '原助理姓名快照';
COMMENT ON COLUMN salon_order_staff_change.after_assistant_name IS '新助理姓名快照';
COMMENT ON COLUMN salon_order_staff_change.reason IS '更正原因';
COMMENT ON COLUMN salon_order_staff_change.operator_name IS '操作人姓名快照';
COMMENT ON COLUMN salon_order_staff_change.create_by IS '操作人ID';
COMMENT ON COLUMN salon_order_staff_change.create_time IS '更正时间';
COMMENT ON COLUMN salon_order_staff_change.update_by IS '更新人ID';
COMMENT ON COLUMN salon_order_staff_change.update_time IS '更新时间';
COMMENT ON COLUMN salon_order_staff_change.deleted IS '逻辑删除（0=未删除 1=已删除）';

-- 更正人员需独立权限，默认授予管理员与店长。
INSERT INTO sys_menu (id,parent_id,name,type,tree_path,meta,perm,tenant_id,create_by,create_time,update_by,update_time,deleted)
SELECT 217,166,'orderStaffEdit',4,'0,20,166','{"title":"更正订单人员"}','biz:order:staff-edit',1,0,CURRENT_TIMESTAMP,0,CURRENT_TIMESTAMP,0
WHERE NOT EXISTS (SELECT 1 FROM sys_menu WHERE perm='biz:order:staff-edit' AND deleted=0);
INSERT INTO sys_role_menu (role_id,menu_id,type)
SELECT r.id,m.id,1 FROM sys_role r CROSS JOIN sys_menu m
WHERE r.code IN ('ROOT','TENANT_ADMIN','STORE_MANAGER') AND r.deleted=0
  AND m.perm='biz:order:staff-edit' AND m.deleted=0
  AND NOT EXISTS (SELECT 1 FROM sys_role_menu rm WHERE rm.role_id=r.id AND rm.menu_id=m.id AND rm.type=1);
