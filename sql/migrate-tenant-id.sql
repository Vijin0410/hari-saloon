-- 已有库：租户主表 + 业务表 tenant_id（勿用 DEFAULT 1 静默灌值）
-- 步骤：可空列 → 人工/脚本显式回填 → 再 NOT NULL
-- 执行前请确认回填策略；单租户试点可在确认后统一写成 1。

CREATE TABLE IF NOT EXISTS sys_tenant (
    id            int8         NOT NULL PRIMARY KEY,
    name          varchar(64)  NOT NULL,
    code          varchar(64)  NOT NULL,
    status        int4         DEFAULT 1,
    contact       varchar(64),
    phone         varchar(20),
    expire_time   timestamp,
    remark        varchar(255),
    create_by     int8,
    create_time   timestamp,
    update_by     int8,
    update_time   timestamp,
    deleted       int4         DEFAULT 0
);
CREATE UNIQUE INDEX IF NOT EXISTS uk_sys_tenant_code ON sys_tenant (code);

INSERT INTO sys_tenant (id, name, code, status, contact, phone, remark, create_by, create_time, update_by, update_time, deleted)
SELECT 1, '默认门店', 'default', 1, '管理员', '15061952394', '系统默认租户', 0, CURRENT_TIMESTAMP, 0, CURRENT_TIMESTAMP, 0
WHERE NOT EXISTS (SELECT 1 FROM sys_tenant WHERE id = 1);

ALTER TABLE sys_user ADD COLUMN IF NOT EXISTS tenant_id int8;
ALTER TABLE sys_dept ADD COLUMN IF NOT EXISTS tenant_id int8;
ALTER TABLE sys_role ADD COLUMN IF NOT EXISTS tenant_id int8;
ALTER TABLE sys_menu ADD COLUMN IF NOT EXISTS tenant_id int8;
ALTER TABLE sys_dict_type ADD COLUMN IF NOT EXISTS tenant_id int8;
ALTER TABLE sys_dict ADD COLUMN IF NOT EXISTS tenant_id int8;

-- 显式回填（仅当你确认这些行都属于默认租户 1 时执行）
-- UPDATE sys_user SET tenant_id = 1 WHERE tenant_id IS NULL;
-- UPDATE sys_dept SET tenant_id = 1 WHERE tenant_id IS NULL;
-- UPDATE sys_role SET tenant_id = 1 WHERE tenant_id IS NULL;
-- UPDATE sys_menu SET tenant_id = 1 WHERE tenant_id IS NULL;
-- UPDATE sys_dict_type SET tenant_id = 1 WHERE tenant_id IS NULL;
-- UPDATE sys_dict SET tenant_id = 1 WHERE tenant_id IS NULL;

-- 回填完成且无 NULL 后，再加非空约束：
-- ALTER TABLE sys_user ALTER COLUMN tenant_id SET NOT NULL;
-- ALTER TABLE sys_dept ALTER COLUMN tenant_id SET NOT NULL;
-- ALTER TABLE sys_role ALTER COLUMN tenant_id SET NOT NULL;
-- ALTER TABLE sys_menu ALTER COLUMN tenant_id SET NOT NULL;
-- ALTER TABLE sys_dict_type ALTER COLUMN tenant_id SET NOT NULL;
-- ALTER TABLE sys_dict ALTER COLUMN tenant_id SET NOT NULL;
