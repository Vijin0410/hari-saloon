-- 存量库增量：密码改密时间 + 门店 + 会员
-- 在已有 hair_salon 库手工执行（sql.init.mode=never 时不会自动跑 schema）

-- 1) 新字段
ALTER TABLE sys_user
    ADD COLUMN IF NOT EXISTS last_password_change_time timestamp;

-- 2) 从旧布尔字段迁移（若存在）
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'sys_user' AND column_name = 'pwd_reset_required'
    ) THEN
        -- 已改过密(0) → 记为当前时间；须改密(1)/NULL → 保持 NULL
        UPDATE sys_user
        SET last_password_change_time = CURRENT_TIMESTAMP
        WHERE pwd_reset_required = 0
          AND last_password_change_time IS NULL;

        ALTER TABLE sys_user DROP COLUMN IF EXISTS pwd_reset_required;
    END IF;
END $$;

-- 历史 admin 若仍无改密时间，视为已改过，避免立刻被拦
UPDATE sys_user
SET last_password_change_time = CURRENT_TIMESTAMP
WHERE username = 'admin' AND tenant_id = 1 AND last_password_change_time IS NULL;

CREATE TABLE IF NOT EXISTS salon_store (
    id              int8         NOT NULL PRIMARY KEY,
    name            varchar(64)  NOT NULL,
    code            varchar(64),
    dept_id         int8         NOT NULL,
    phone           varchar(20),
    address         varchar(255),
    province        varchar(64),
    city            varchar(64),
    district        varchar(64),
    longitude       numeric(10, 6),
    latitude        numeric(10, 6),
    business_hours  varchar(255),
    open_time       time,
    close_time      time,
    rest_days       varchar(64),
    status          int4         DEFAULT 1,
    sort            int4         DEFAULT 0,
    remark          varchar(255),
    tenant_id       int8         NOT NULL,
    create_by       int8,
    create_time     timestamp,
    update_by       int8,
    update_time     timestamp,
    deleted         int4         DEFAULT 0
);
CREATE UNIQUE INDEX IF NOT EXISTS uk_salon_store_dept ON salon_store (tenant_id, dept_id) WHERE deleted = 0;
CREATE UNIQUE INDEX IF NOT EXISTS uk_salon_store_code ON salon_store (tenant_id, code) WHERE deleted = 0 AND code IS NOT NULL;

CREATE TABLE IF NOT EXISTS salon_member (
    id              int8         NOT NULL PRIMARY KEY,
    name            varchar(64)  NOT NULL,
    phone           varchar(20),
    gender          int4,
    birthday        date,
    level           int4         DEFAULT 0,
    balance         numeric(12, 2) DEFAULT 0,
    points          int4         DEFAULT 0,
    source          varchar(32),
    status          int4         DEFAULT 1,
    remark          varchar(255),
    dept_id         int8         NOT NULL,
    tenant_id       int8         NOT NULL,
    create_by       int8,
    create_time     timestamp,
    update_by       int8,
    update_time     timestamp,
    deleted         int4         DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_salon_member_phone ON salon_member (tenant_id, phone);
CREATE INDEX IF NOT EXISTS idx_salon_member_dept ON salon_member (tenant_id, dept_id);
