-- PostgreSQL：系统管理表（含多租户 tenant_id）
-- tenant_id：NOT NULL，无库级 DEFAULT，避免遗漏赋值时静默落到 1
-- 写入由应用 MetaObjectHandler / 业务显式赋值；种子数据在 data.sql 里写死 tenant_id=1
-- sys_tenant 为租户主数据，本身不做行级租户过滤

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
COMMENT ON TABLE sys_tenant IS '租户主数据';
COMMENT ON COLUMN sys_tenant.id IS '租户ID';
COMMENT ON COLUMN sys_tenant.name IS '租户名称';
COMMENT ON COLUMN sys_tenant.code IS '租户编码（全局唯一）';
COMMENT ON COLUMN sys_tenant.status IS '状态（1=启用 0=禁用）';
COMMENT ON COLUMN sys_tenant.contact IS '联系人';
COMMENT ON COLUMN sys_tenant.phone IS '联系电话';
COMMENT ON COLUMN sys_tenant.expire_time IS '到期时间';
COMMENT ON COLUMN sys_tenant.remark IS '备注';
COMMENT ON COLUMN sys_tenant.create_by IS '创建人ID（0=系统）';
COMMENT ON COLUMN sys_tenant.create_time IS '创建时间';
COMMENT ON COLUMN sys_tenant.update_by IS '更新人ID';
COMMENT ON COLUMN sys_tenant.update_time IS '更新时间';
COMMENT ON COLUMN sys_tenant.deleted IS '逻辑删除（0=未删除 1=已删除）';

CREATE TABLE IF NOT EXISTS sys_user (
    id            int8         NOT NULL PRIMARY KEY,
    username      varchar(64)  NOT NULL,
    password      varchar(128) NOT NULL,
    nickname      varchar(64),
    gender        int4,
    avatar        varchar(255),
    phone         varchar(20),
    email         varchar(128),
    status        int4         DEFAULT 1,
    dept_id       int8,
    -- 最近一次用户自行改密时间；NULL=从未改过（首次须重置）；超期见 wj.salon.password-expire-days
    last_password_change_time timestamp,
    tenant_id     int8         NOT NULL,
    create_by     int8,
    create_time   timestamp,
    update_by     int8,
    update_time   timestamp,
    deleted       int4         DEFAULT 0
);
CREATE UNIQUE INDEX IF NOT EXISTS uk_sys_user_username_tenant ON sys_user (tenant_id, username);
COMMENT ON TABLE sys_user IS '系统用户';
COMMENT ON COLUMN sys_user.id IS '用户ID';
COMMENT ON COLUMN sys_user.username IS '登录账号';
COMMENT ON COLUMN sys_user.password IS '登录密码（加密存储）';
COMMENT ON COLUMN sys_user.nickname IS '昵称';
COMMENT ON COLUMN sys_user.gender IS '性别（1=男 2=女）';
COMMENT ON COLUMN sys_user.avatar IS '头像URL';
COMMENT ON COLUMN sys_user.phone IS '手机号';
COMMENT ON COLUMN sys_user.email IS '邮箱';
COMMENT ON COLUMN sys_user.status IS '状态（1=启用 0=禁用）';
COMMENT ON COLUMN sys_user.dept_id IS '所属部门ID';
COMMENT ON COLUMN sys_user.last_password_change_time IS '最近一次改密时间；NULL=从未改过（首次/重置后须重置），超期见 wj.salon.password-expire-days';
COMMENT ON COLUMN sys_user.tenant_id IS '租户ID';
COMMENT ON COLUMN sys_user.create_by IS '创建人ID（0=系统）';
COMMENT ON COLUMN sys_user.create_time IS '创建时间';
COMMENT ON COLUMN sys_user.update_by IS '更新人ID';
COMMENT ON COLUMN sys_user.update_time IS '更新时间';
COMMENT ON COLUMN sys_user.deleted IS '逻辑删除（0=未删除 1=已删除）';

CREATE TABLE IF NOT EXISTS sys_dept (
    id            int8         NOT NULL PRIMARY KEY,
    name          varchar(64)  NOT NULL,
    parent_id     int8         DEFAULT 0,
    tree_path     varchar(255),
    sort          int4         DEFAULT 0,
    status        int4         DEFAULT 1,
    leader_id     int8,
    tenant_id     int8         NOT NULL,
    create_by     int8,
    create_time   timestamp,
    update_by     int8,
    update_time   timestamp,
    deleted       int4         DEFAULT 0
);
COMMENT ON TABLE sys_dept IS '部门';
COMMENT ON COLUMN sys_dept.id IS '部门ID';
COMMENT ON COLUMN sys_dept.name IS '部门名称';
COMMENT ON COLUMN sys_dept.parent_id IS '父级部门ID（0=顶级）';
COMMENT ON COLUMN sys_dept.tree_path IS '层级路径（逗号分隔，如 0,1）';
COMMENT ON COLUMN sys_dept.sort IS '排序（升序）';
COMMENT ON COLUMN sys_dept.status IS '状态（1=启用 0=禁用）';
COMMENT ON COLUMN sys_dept.leader_id IS '负责人ID';
COMMENT ON COLUMN sys_dept.tenant_id IS '租户ID';
COMMENT ON COLUMN sys_dept.create_by IS '创建人ID（0=系统）';
COMMENT ON COLUMN sys_dept.create_time IS '创建时间';
COMMENT ON COLUMN sys_dept.update_by IS '更新人ID';
COMMENT ON COLUMN sys_dept.update_time IS '更新时间';
COMMENT ON COLUMN sys_dept.deleted IS '逻辑删除（0=未删除 1=已删除）';

CREATE TABLE IF NOT EXISTS sys_role (
    id            int8         NOT NULL PRIMARY KEY,
    name          varchar(64)  NOT NULL,
    code          varchar(64)  NOT NULL,
    sort          int4         DEFAULT 0,
    status        int4         DEFAULT 1,
    data_scope    int4         DEFAULT 1,
    dept_ids      varchar(512),
    tenant_id     int8         NOT NULL,
    create_by     int8,
    create_time   timestamp,
    update_by     int8,
    update_time   timestamp,
    deleted       int4         DEFAULT 0
);
CREATE UNIQUE INDEX IF NOT EXISTS uk_sys_role_code_tenant ON sys_role (tenant_id, code);
COMMENT ON TABLE sys_role IS '角色';
COMMENT ON COLUMN sys_role.id IS '角色ID';
COMMENT ON COLUMN sys_role.name IS '角色名称';
COMMENT ON COLUMN sys_role.code IS '角色编码（租户内唯一）';
COMMENT ON COLUMN sys_role.sort IS '排序（升序）';
COMMENT ON COLUMN sys_role.status IS '状态（1=启用 0=禁用）';
COMMENT ON COLUMN sys_role.data_scope IS '数据权限范围（见 DataScopeEnum：1全部 2本部门及子 3本部门 4仅本人 5自定义）';
COMMENT ON COLUMN sys_role.dept_ids IS '自定义数据权限部门ID（逗号分隔）';
COMMENT ON COLUMN sys_role.tenant_id IS '租户ID';
COMMENT ON COLUMN sys_role.create_by IS '创建人ID（0=系统）';
COMMENT ON COLUMN sys_role.create_time IS '创建时间';
COMMENT ON COLUMN sys_role.update_by IS '更新人ID';
COMMENT ON COLUMN sys_role.update_time IS '更新时间';
COMMENT ON COLUMN sys_role.deleted IS '逻辑删除（0=未删除 1=已删除）';

CREATE TABLE IF NOT EXISTS sys_menu (
    id            int8         NOT NULL PRIMARY KEY,
    parent_id     int8         DEFAULT 0,
    name          varchar(64),
    type          int4,
    path          varchar(128),
    component     varchar(128),
    redirect      varchar(128),
    tree_path     varchar(255),
    meta          text,
    perm          varchar(128),
    api_path      varchar(255),
    remark        varchar(255),
    tenant_id     int8         NOT NULL,
    create_by     int8,
    create_time   timestamp,
    update_by     int8,
    update_time   timestamp,
    deleted       int4         DEFAULT 0
);
COMMENT ON TABLE sys_menu IS '菜单/按钮权限（各租户通过 sys_role_menu 挂同一套菜单，全局共享）';
COMMENT ON COLUMN sys_menu.id IS '菜单ID';
COMMENT ON COLUMN sys_menu.parent_id IS '父级菜单ID（0=顶级）';
COMMENT ON COLUMN sys_menu.name IS '菜单/按钮名称';
COMMENT ON COLUMN sys_menu.type IS '类型（1=菜单 2=目录 3=外链 4=按钮，见 MenuTypeEnum）';
COMMENT ON COLUMN sys_menu.path IS '路由路径';
COMMENT ON COLUMN sys_menu.component IS '前端组件路径';
COMMENT ON COLUMN sys_menu.redirect IS '重定向路径';
COMMENT ON COLUMN sys_menu.tree_path IS '层级路径（逗号分隔）';
COMMENT ON COLUMN sys_menu.meta IS '元数据（JSON：标题/图标/排序/是否显示等）';
COMMENT ON COLUMN sys_menu.perm IS '权限标识（如 system:user:add）；目录/菜单 type=1/2 留空，按钮 type=4 挂 :list/:view/:add/:edit/:delete/:status/:password/:assign';
COMMENT ON COLUMN sys_menu.api_path IS '接口路径';
COMMENT ON COLUMN sys_menu.remark IS '备注';
COMMENT ON COLUMN sys_menu.tenant_id IS '租户ID';
COMMENT ON COLUMN sys_menu.create_by IS '创建人ID（0=系统）';
COMMENT ON COLUMN sys_menu.create_time IS '创建时间';
COMMENT ON COLUMN sys_menu.update_by IS '更新人ID';
COMMENT ON COLUMN sys_menu.update_time IS '更新时间';
COMMENT ON COLUMN sys_menu.deleted IS '逻辑删除（0=未删除 1=已删除）';

CREATE TABLE IF NOT EXISTS sys_user_role (
    user_id       int8 NOT NULL,
    role_id       int8 NOT NULL,
    PRIMARY KEY (user_id, role_id)
);
COMMENT ON TABLE sys_user_role IS '用户-角色关联';
COMMENT ON COLUMN sys_user_role.user_id IS '用户ID';
COMMENT ON COLUMN sys_user_role.role_id IS '角色ID';

CREATE TABLE IF NOT EXISTS sys_role_menu (
    role_id       int8 NOT NULL,
    menu_id       int8 NOT NULL,
    type          int4 DEFAULT 1,
    PRIMARY KEY (role_id, menu_id, type)
);
COMMENT ON TABLE sys_role_menu IS '角色-菜单关联';
COMMENT ON COLUMN sys_role_menu.role_id IS '角色ID';
COMMENT ON COLUMN sys_role_menu.menu_id IS '菜单ID';
COMMENT ON COLUMN sys_role_menu.type IS '终端类型（1=web 2=app，一期仅用1）';

CREATE TABLE IF NOT EXISTS sys_dict_type (
    id            int8         NOT NULL PRIMARY KEY,
    name          varchar(64)  NOT NULL,
    code          varchar(64)  NOT NULL,
    status        int4         DEFAULT 1,
    remark        varchar(255),
    group_code    varchar(64),
    tenant_id     int8         NOT NULL,
    create_by     int8,
    create_time   timestamp,
    update_by     int8,
    update_time   timestamp,
    deleted       int4         DEFAULT 0
);
CREATE UNIQUE INDEX IF NOT EXISTS uk_sys_dict_type_code_tenant ON sys_dict_type (tenant_id, code);
COMMENT ON TABLE sys_dict_type IS '字典类型';
COMMENT ON COLUMN sys_dict_type.id IS '字典类型ID';
COMMENT ON COLUMN sys_dict_type.name IS '字典类型名称';
COMMENT ON COLUMN sys_dict_type.code IS '字典类型编码（租户内唯一）';
COMMENT ON COLUMN sys_dict_type.status IS '状态（1=启用 0=禁用）';
COMMENT ON COLUMN sys_dict_type.remark IS '备注';
COMMENT ON COLUMN sys_dict_type.group_code IS '分组编码';
COMMENT ON COLUMN sys_dict_type.tenant_id IS '租户ID';
COMMENT ON COLUMN sys_dict_type.create_by IS '创建人ID（0=系统）';
COMMENT ON COLUMN sys_dict_type.create_time IS '创建时间';
COMMENT ON COLUMN sys_dict_type.update_by IS '更新人ID';
COMMENT ON COLUMN sys_dict_type.update_time IS '更新时间';
COMMENT ON COLUMN sys_dict_type.deleted IS '逻辑删除（0=未删除 1=已删除）';

CREATE TABLE IF NOT EXISTS sys_dict (
    id            int8         NOT NULL PRIMARY KEY,
    type_code     varchar(64)  NOT NULL,
    name          varchar(64)  NOT NULL,
    value         varchar(64)  NOT NULL,
    sort          int4         DEFAULT 0,
    status        int4         DEFAULT 1,
    defaulted     int4         DEFAULT 0,
    remark        varchar(255),
    tenant_id     int8         NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sys_dict_type_code ON sys_dict (tenant_id, type_code);
COMMENT ON TABLE sys_dict IS '字典数据项';
COMMENT ON COLUMN sys_dict.id IS '字典项ID';
COMMENT ON COLUMN sys_dict.type_code IS '字典类型编码';
COMMENT ON COLUMN sys_dict.name IS '字典项名称';
COMMENT ON COLUMN sys_dict.value IS '字典项值';
COMMENT ON COLUMN sys_dict.sort IS '排序（升序）';
COMMENT ON COLUMN sys_dict.status IS '状态（1=启用 0=禁用）';
COMMENT ON COLUMN sys_dict.defaulted IS '是否默认（0=否 1=是）';
COMMENT ON COLUMN sys_dict.remark IS '备注';
COMMENT ON COLUMN sys_dict.tenant_id IS '租户ID';

-- 门店（业务独立，不再绑定 sys_dept；门店数据权限走 salon_store_user）
CREATE TABLE IF NOT EXISTS salon_store (
    id              int8         NOT NULL PRIMARY KEY,
    name            varchar(64)  NOT NULL,
    code            varchar(64),
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
CREATE UNIQUE INDEX IF NOT EXISTS uk_salon_store_code ON salon_store (tenant_id, code) WHERE deleted = 0 AND code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_salon_store_status ON salon_store (tenant_id, status);
COMMENT ON TABLE salon_store IS '门店营业档案（独立于 sys_dept，权限范围走 salon_store_user）';
COMMENT ON COLUMN salon_store.id IS '门店ID';
COMMENT ON COLUMN salon_store.name IS '门店名称';
COMMENT ON COLUMN salon_store.code IS '门店编码（租户内唯一）';
COMMENT ON COLUMN salon_store.phone IS '联系电话';
COMMENT ON COLUMN salon_store.address IS '详细地址';
COMMENT ON COLUMN salon_store.province IS '省';
COMMENT ON COLUMN salon_store.city IS '市';
COMMENT ON COLUMN salon_store.district IS '区/县';
COMMENT ON COLUMN salon_store.longitude IS '经度';
COMMENT ON COLUMN salon_store.latitude IS '纬度';
COMMENT ON COLUMN salon_store.business_hours IS '营业时间文案（如 09:00-21:00）';
COMMENT ON COLUMN salon_store.open_time IS '开门时间';
COMMENT ON COLUMN salon_store.close_time IS '关门时间';
COMMENT ON COLUMN salon_store.rest_days IS '休息日（逗号分隔，如 0,6 表示周日/周六）';
COMMENT ON COLUMN salon_store.status IS '状态（1=营业 0=停业）';
COMMENT ON COLUMN salon_store.sort IS '排序（升序）';
COMMENT ON COLUMN salon_store.remark IS '备注';
COMMENT ON COLUMN salon_store.tenant_id IS '租户ID';
COMMENT ON COLUMN salon_store.create_by IS '创建人ID（0=系统）';
COMMENT ON COLUMN salon_store.create_time IS '创建时间';
COMMENT ON COLUMN salon_store.update_by IS '更新人ID';
COMMENT ON COLUMN salon_store.update_time IS '更新时间';
COMMENT ON COLUMN salon_store.deleted IS '逻辑删除（0=未删除 1=已删除）';

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

-- 会员（租户 + 门店数据权限）
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
    store_id        int8         NOT NULL,
    tenant_id       int8         NOT NULL,
    create_by       int8,
    create_time     timestamp,
    update_by       int8,
    update_time     timestamp,
    deleted         int4         DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_salon_member_phone ON salon_member (tenant_id, phone);
CREATE INDEX IF NOT EXISTS idx_salon_member_store ON salon_member (tenant_id, store_id);
COMMENT ON TABLE salon_member IS '会员（租户 + 门店数据权限）';
COMMENT ON COLUMN salon_member.id IS '会员ID';
COMMENT ON COLUMN salon_member.name IS '会员姓名';
COMMENT ON COLUMN salon_member.phone IS '手机号';
COMMENT ON COLUMN salon_member.gender IS '性别（1=男 2=女）';
COMMENT ON COLUMN salon_member.birthday IS '生日';
COMMENT ON COLUMN salon_member.level IS '会员等级';
COMMENT ON COLUMN salon_member.balance IS '余额';
COMMENT ON COLUMN salon_member.points IS '积分';
COMMENT ON COLUMN salon_member.source IS '会员来源';
COMMENT ON COLUMN salon_member.status IS '状态（1=启用 0=禁用）';
COMMENT ON COLUMN salon_member.remark IS '备注';
COMMENT ON COLUMN salon_member.store_id IS '所属门店ID';
COMMENT ON COLUMN salon_member.tenant_id IS '租户ID';
COMMENT ON COLUMN salon_member.create_by IS '创建人ID（0=系统）';
COMMENT ON COLUMN salon_member.create_time IS '创建时间';
COMMENT ON COLUMN salon_member.update_by IS '更新人ID';
COMMENT ON COLUMN salon_member.update_time IS '更新时间';
COMMENT ON COLUMN salon_member.deleted IS '逻辑删除（0=未删除 1=已删除）';

-- 通用文件档案（MinIO 对象元数据落库；业务表存 object_key 软关联）
-- 权限归属：dept_id + create_by 走 @DataPermission；is_public=0 私有文件访问须校验归属
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
