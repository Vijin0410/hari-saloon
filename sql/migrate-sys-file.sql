-- 存量库增量：通用文件档案表 sys_file
-- 在已有 hair_salon 库手工执行（sql.init.mode=never 时不会自动跑 schema）
-- 关联运维：切换私有桶后须撤销存量桶公开读策略（yml public-read=false 只影响新建桶，存量桶 policy 不自动撤）：
--   mc anonymous set none myminio/hair-salon
--   （或用 SDK removeBucketPolicy；撤销后所有访问走预签名 + getAccessibleUrl 归属校验）
-- MinIO 对象元数据落库；业务表存 object_key 软关联
-- 权限归属：dept_id + create_by 走 @DataPermission；is_public=0 私有文件访问须校验归属
-- 幂等：CREATE TABLE/INDEX IF NOT EXISTS + COMMENT ON 可重复执行

CREATE TABLE IF NOT EXISTS sys_file (
    id                int8         NOT NULL PRIMARY KEY,
    object_key        varchar(255) NOT NULL,
    bucket            varchar(64)  NOT NULL,
    original_name     varchar(255),
    content_type      varchar(128),
    extension         varchar(32),
    size              int8         DEFAULT 0,
    biz               varchar(32),
    biz_id            int8,
    directory_id      int8,
    is_public         int4         DEFAULT 0,
    dept_id           int8,
    tenant_id         int8         NOT NULL,
    create_by         int8,
    create_time       timestamp,
    update_by         int8,
    update_time       timestamp,
    deleted           int4         DEFAULT 0
);
CREATE UNIQUE INDEX IF NOT EXISTS uk_sys_file_object_key ON sys_file (object_key);
CREATE INDEX IF NOT EXISTS idx_sys_file_biz ON sys_file (tenant_id, biz, biz_id);
CREATE INDEX IF NOT EXISTS idx_sys_file_dept ON sys_file (tenant_id, dept_id);

COMMENT ON TABLE sys_file IS '通用文件档案（MinIO 对象元数据落库，业务表存 object_key 软关联）';
COMMENT ON COLUMN sys_file.id IS '文件ID';
COMMENT ON COLUMN sys_file.object_key IS '桶内对象键（{tenant}/{biz}/{yyyyMMdd}/{uuid}.ext），业务表存此值';
COMMENT ON COLUMN sys_file.bucket IS '存储桶名称';
COMMENT ON COLUMN sys_file.original_name IS '原始文件名';
COMMENT ON COLUMN sys_file.content_type IS 'MIME 类型';
COMMENT ON COLUMN sys_file.extension IS '扩展名（无点小写）';
COMMENT ON COLUMN sys_file.size IS '文件大小（字节）';
COMMENT ON COLUMN sys_file.biz IS '业务类型，如 avatar/logo/product/contract';
COMMENT ON COLUMN sys_file.biz_id IS '关联业务ID（上传时可能未落库，事后回填）';
COMMENT ON COLUMN sys_file.directory_id IS '所属目录ID（一期可空，用 biz 分类）';
COMMENT ON COLUMN sys_file.is_public IS '是否公开（0=私有，访问须校验归属+预签名；1=公开，直链 publicUrl）';
COMMENT ON COLUMN sys_file.dept_id IS '上传人部门ID（@DataPermission 行级过滤用）';
COMMENT ON COLUMN sys_file.tenant_id IS '租户ID';
COMMENT ON COLUMN sys_file.create_by IS '创建人ID（0=系统）';
COMMENT ON COLUMN sys_file.create_time IS '创建时间';
COMMENT ON COLUMN sys_file.update_by IS '更新人ID';
COMMENT ON COLUMN sys_file.update_time IS '更新时间';
COMMENT ON COLUMN sys_file.deleted IS '逻辑删除（0=未删除 1=已删除）';
