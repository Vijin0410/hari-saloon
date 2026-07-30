-- Decouple salon stores from sys_dept and move salon data range to store_id.
-- Early development data can be discarded: member rows are truncated before the NOT NULL store_id change.

BEGIN;

DROP INDEX IF EXISTS uk_salon_store_dept;
ALTER TABLE salon_store DROP COLUMN IF EXISTS dept_id;
CREATE INDEX IF NOT EXISTS idx_salon_store_status ON salon_store (tenant_id, status);
COMMENT ON TABLE salon_store IS '门店营业档案（独立于 sys_dept，权限范围走 salon_store_user）';

CREATE TABLE IF NOT EXISTS salon_store_user (
    id              int8         NOT NULL PRIMARY KEY,
    store_id        int8         NOT NULL,
    user_id         int8         NOT NULL,
    tenant_id       int8         NOT NULL,
    create_by       int8,
    create_time     timestamp,
    update_by       int8,
    update_time     timestamp,
    deleted         int4         DEFAULT 0
);
CREATE UNIQUE INDEX IF NOT EXISTS uk_salon_store_user ON salon_store_user (tenant_id, store_id, user_id) WHERE deleted = 0;
CREATE INDEX IF NOT EXISTS idx_salon_store_user_user ON salon_store_user (tenant_id, user_id) WHERE deleted = 0;
COMMENT ON TABLE salon_store_user IS '门店-用户数据权限授权';
COMMENT ON COLUMN salon_store_user.id IS '授权ID';
COMMENT ON COLUMN salon_store_user.store_id IS '门店ID';
COMMENT ON COLUMN salon_store_user.user_id IS '用户ID';
COMMENT ON COLUMN salon_store_user.tenant_id IS '租户ID';
COMMENT ON COLUMN salon_store_user.create_by IS '创建人ID（0=系统）';
COMMENT ON COLUMN salon_store_user.create_time IS '创建时间';
COMMENT ON COLUMN salon_store_user.update_by IS '更新人ID';
COMMENT ON COLUMN salon_store_user.update_time IS '更新时间';
COMMENT ON COLUMN salon_store_user.deleted IS '逻辑删除（0=未删除 1=已删除）';

TRUNCATE TABLE salon_member;
DROP INDEX IF EXISTS idx_salon_member_dept;
ALTER TABLE salon_member DROP COLUMN IF EXISTS dept_id;
ALTER TABLE salon_member ADD COLUMN IF NOT EXISTS store_id int8 NOT NULL;
ALTER TABLE salon_member ALTER COLUMN store_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_salon_member_store ON salon_member (tenant_id, store_id);
COMMENT ON TABLE salon_member IS '会员（租户 + 门店数据权限）';
COMMENT ON COLUMN salon_member.store_id IS '所属门店ID';

INSERT INTO salon_store_user (id, store_id, user_id, tenant_id, create_by, create_time, update_by, update_time, deleted)
SELECT 1000, 1000, 1, 1, 0, CURRENT_TIMESTAMP, 0, CURRENT_TIMESTAMP, 0
WHERE EXISTS (SELECT 1 FROM salon_store WHERE id = 1000)
  AND EXISTS (SELECT 1 FROM sys_user WHERE id = 1)
  AND NOT EXISTS (SELECT 1 FROM salon_store_user WHERE store_id = 1000 AND user_id = 1 AND tenant_id = 1 AND deleted = 0);

COMMIT;
