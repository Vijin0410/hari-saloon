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
COMMENT ON TABLE sys_dict_type IS '字典类型（通用(默认租户1)+租户覆盖：走 ignore-tables，由代码按租户分键写缓存；value 多为后端代码契约，仅系统管理员维护）';
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
COMMENT ON TABLE sys_dict IS '字典数据项（通用(默认租户1)+租户覆盖：走 ignore-tables，由代码按租户分键写缓存，同 value 租户覆盖通用）';
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
    level_id        int8,
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
COMMENT ON COLUMN salon_member.level_id IS '会员等级ID（关联salon_member_level，空=普通，建档时由service填默认等级）';
COMMENT ON COLUMN salon_member.balance IS '可用总余额（冗余=本金+赠送-冻结，真源在salon_member_balance）';
COMMENT ON COLUMN salon_member.points IS '可用总积分（冗余，真源由salon_member_point_log汇总）';
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

-- ===== P1 会员资产闭环 =====

-- 会员等级配置（租户级，影响折扣/积分倍率/充值优惠/权益）
CREATE TABLE IF NOT EXISTS salon_member_level (
    id                  int8          NOT NULL PRIMARY KEY,
    tenant_id           int8          NOT NULL,
    name                varchar(64)   NOT NULL,
    level_no            int4          NOT NULL,
    service_discount    numeric(3, 2),
    goods_discount      numeric(3, 2),
    point_rate          numeric(3, 2) DEFAULT 1.00,
    recharge_gift_rate  numeric(5, 2) DEFAULT 0.00,
    upgrade_threshold   numeric(12, 2),
    rights              jsonb,
    sort                int4          DEFAULT 0,
    status              int4          DEFAULT 1,
    remark              varchar(255),
    create_by           int8,
    create_time         timestamp,
    update_by           int8,
    update_time         timestamp,
    deleted             int4          DEFAULT 0
);
CREATE UNIQUE INDEX IF NOT EXISTS uk_salon_member_level_no ON salon_member_level (tenant_id, level_no) WHERE deleted = 0;
CREATE UNIQUE INDEX IF NOT EXISTS uk_salon_member_level_name ON salon_member_level (tenant_id, name) WHERE deleted = 0;
CREATE INDEX IF NOT EXISTS idx_salon_member_level_sort ON salon_member_level (tenant_id, sort) WHERE deleted = 0;
COMMENT ON TABLE salon_member_level IS '会员等级配置（租户级）';
COMMENT ON COLUMN salon_member_level.id IS '等级ID';
COMMENT ON COLUMN salon_member_level.tenant_id IS '租户ID';
COMMENT ON COLUMN salon_member_level.name IS '等级名称（如普通/银卡/金卡/钻石）';
COMMENT ON COLUMN salon_member_level.level_no IS '等级序号（0=普通，数值越大等级越高，用于比较）';
COMMENT ON COLUMN salon_member_level.service_discount IS '服务折扣（0.00-1.00，1=不打折，NULL=不参与折扣）';
COMMENT ON COLUMN salon_member_level.goods_discount IS '商品折扣（0.00-1.00，1=不打折，NULL=不参与折扣）';
COMMENT ON COLUMN salon_member_level.point_rate IS '积分倍率（1.00=正常，1.50=1.5倍）';
COMMENT ON COLUMN salon_member_level.recharge_gift_rate IS '充值赠送率（0.10=充100送10），等级默认值，P4充值活动可叠加';
COMMENT ON COLUMN salon_member_level.upgrade_threshold IS '升级门槛（累计消费金额），NULL=不自动升级';
COMMENT ON COLUMN salon_member_level.rights IS '专属权益（JSON，如生日礼包、专属项目）';
COMMENT ON COLUMN salon_member_level.sort IS '排序';
COMMENT ON COLUMN salon_member_level.status IS '状态（1=启用 0=禁用）';
COMMENT ON COLUMN salon_member_level.remark IS '备注';
COMMENT ON COLUMN salon_member_level.create_by IS '创建人ID（0=系统）';
COMMENT ON COLUMN salon_member_level.create_time IS '创建时间';
COMMENT ON COLUMN salon_member_level.update_by IS '更新人ID';
COMMENT ON COLUMN salon_member_level.update_time IS '更新时间';
COMMENT ON COLUMN salon_member_level.deleted IS '逻辑删除（0=未删除 1=已删除）';

-- 会员余额（1:1 salon_member；本金/赠送/冻结分桶 + 乐观锁）
CREATE TABLE IF NOT EXISTS salon_member_balance (
    id                  int8          NOT NULL PRIMARY KEY,
    member_id           int8          NOT NULL,
    tenant_id           int8          NOT NULL,
    principal_balance   numeric(12, 2) DEFAULT 0,
    gift_balance        numeric(12, 2) DEFAULT 0,
    frozen_balance      numeric(12, 2) DEFAULT 0,
    last_recharge_time  timestamp,
    last_consume_time   timestamp,
    version             int4          DEFAULT 0,
    create_by           int8,
    create_time         timestamp,
    update_by           int8,
    update_time         timestamp,
    deleted             int4          DEFAULT 0
);
CREATE UNIQUE INDEX IF NOT EXISTS uk_salon_member_balance_member ON salon_member_balance (tenant_id, member_id) WHERE deleted = 0;
COMMENT ON TABLE salon_member_balance IS '会员余额（1:1 salon_member）';
COMMENT ON COLUMN salon_member_balance.id IS '余额ID';
COMMENT ON COLUMN salon_member_balance.member_id IS '会员ID';
COMMENT ON COLUMN salon_member_balance.tenant_id IS '租户ID';
COMMENT ON COLUMN salon_member_balance.principal_balance IS '本金余额';
COMMENT ON COLUMN salon_member_balance.gift_balance IS '赠送余额';
COMMENT ON COLUMN salon_member_balance.frozen_balance IS '冻结金额（可用=本金+赠送-冻结）';
COMMENT ON COLUMN salon_member_balance.last_recharge_time IS '最近充值时间';
COMMENT ON COLUMN salon_member_balance.last_consume_time IS '最近消费时间';
COMMENT ON COLUMN salon_member_balance.version IS '乐观锁版本号';
COMMENT ON COLUMN salon_member_balance.create_by IS '创建人ID（0=系统）';
COMMENT ON COLUMN salon_member_balance.create_time IS '创建时间';
COMMENT ON COLUMN salon_member_balance.update_by IS '更新人ID';
COMMENT ON COLUMN salon_member_balance.update_time IS '更新时间';
COMMENT ON COLUMN salon_member_balance.deleted IS '逻辑删除（0=未删除 1=已删除）';

-- 会员余额流水（每次变动必记；按桶分行：一次充值产生本金/赠送两条）
CREATE TABLE IF NOT EXISTS salon_member_balance_log (
    id              int8          NOT NULL PRIMARY KEY,
    member_id       int8          NOT NULL,
    tenant_id       int8          NOT NULL,
    store_id        int8,
    balance_type    int4          NOT NULL,
    change_type     int4          NOT NULL,
    before_amount   numeric(12, 2) NOT NULL,
    change_amount   numeric(12, 2) NOT NULL,
    after_amount    numeric(12, 2) NOT NULL,
    biz_type        varchar(32),
    biz_id          int8,
    biz_no          varchar(64),
    operator_id     int8,
    remark          varchar(255),
    create_by       int8,
    create_time     timestamp,
    update_by       int8,
    update_time     timestamp,
    deleted         int4          DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_salon_member_balance_log_member ON salon_member_balance_log (tenant_id, member_id, create_time) WHERE deleted = 0;
CREATE INDEX IF NOT EXISTS idx_salon_member_balance_log_biz ON salon_member_balance_log (tenant_id, biz_type, biz_id) WHERE deleted = 0;
CREATE INDEX IF NOT EXISTS idx_salon_member_balance_log_store ON salon_member_balance_log (tenant_id, store_id, create_time) WHERE deleted = 0;
COMMENT ON TABLE salon_member_balance_log IS '会员余额流水';
COMMENT ON COLUMN salon_member_balance_log.id IS '流水ID';
COMMENT ON COLUMN salon_member_balance_log.member_id IS '会员ID';
COMMENT ON COLUMN salon_member_balance_log.tenant_id IS '租户ID';
COMMENT ON COLUMN salon_member_balance_log.store_id IS '发生门店ID（冗余，便于门店维度查询）';
COMMENT ON COLUMN salon_member_balance_log.balance_type IS '余额桶（1=本金 2=赠送 3=冻结）';
COMMENT ON COLUMN salon_member_balance_log.change_type IS '业务类型（1=充值 2=充值赠送 3=消费扣款 4=退款退回 5=手工调整 6=余额转入 7=余额转出 8=冻结 9=解冻）';
COMMENT ON COLUMN salon_member_balance_log.before_amount IS '变动前金额（该桶）';
COMMENT ON COLUMN salon_member_balance_log.change_amount IS '变动金额（正=增加 负=减少）';
COMMENT ON COLUMN salon_member_balance_log.after_amount IS '变动后金额（该桶）';
COMMENT ON COLUMN salon_member_balance_log.biz_type IS '关联业务类型（RECHARGE/ORDER/REFUND/MANUAL/TRANSFER）';
COMMENT ON COLUMN salon_member_balance_log.biz_id IS '关联业务单据ID（充值单/订单/退款单）';
COMMENT ON COLUMN salon_member_balance_log.biz_no IS '关联业务单号';
COMMENT ON COLUMN salon_member_balance_log.operator_id IS '操作人ID';
COMMENT ON COLUMN salon_member_balance_log.remark IS '备注';
COMMENT ON COLUMN salon_member_balance_log.create_by IS '创建人ID（0=系统）';
COMMENT ON COLUMN salon_member_balance_log.create_time IS '创建时间';
COMMENT ON COLUMN salon_member_balance_log.update_by IS '更新人ID';
COMMENT ON COLUMN salon_member_balance_log.update_time IS '更新时间';
COMMENT ON COLUMN salon_member_balance_log.deleted IS '逻辑删除（0=未删除 1=已删除）';

-- 会员积分流水（获得类带 expire_time/remaining_points 兼作批次，支持过期清零）
CREATE TABLE IF NOT EXISTS salon_member_point_log (
    id                int8         NOT NULL PRIMARY KEY,
    member_id         int8         NOT NULL,
    tenant_id         int8         NOT NULL,
    store_id          int8,
    change_type       int4         NOT NULL,
    before_points     int4         NOT NULL,
    change_points     int4         NOT NULL,
    after_points      int4         NOT NULL,
    expire_time       timestamp,
    remaining_points  int4,
    source_log_id     int8,
    biz_type          varchar(32),
    biz_id            int8,
    biz_no            varchar(64),
    operator_id       int8,
    remark            varchar(255),
    create_by         int8,
    create_time       timestamp,
    update_by         int8,
    update_time       timestamp,
    deleted           int4         DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_salon_member_point_log_member ON salon_member_point_log (tenant_id, member_id, create_time) WHERE deleted = 0;
CREATE INDEX IF NOT EXISTS idx_salon_member_point_log_biz ON salon_member_point_log (tenant_id, biz_type, biz_id) WHERE deleted = 0;
CREATE INDEX IF NOT EXISTS idx_salon_member_point_log_expire ON salon_member_point_log (tenant_id, expire_time) WHERE deleted = 0 AND remaining_points > 0;
COMMENT ON TABLE salon_member_point_log IS '会员积分流水';
COMMENT ON COLUMN salon_member_point_log.id IS '流水ID';
COMMENT ON COLUMN salon_member_point_log.member_id IS '会员ID';
COMMENT ON COLUMN salon_member_point_log.tenant_id IS '租户ID';
COMMENT ON COLUMN salon_member_point_log.store_id IS '发生门店ID（冗余，便于门店维度查询）';
COMMENT ON COLUMN salon_member_point_log.change_type IS '变动类型（1=消费获得 2=充值获得 3=活动赠送 4=手工调整 5=抵扣消费 6=兑换商品 7=手工扣减 8=过期清零）';
COMMENT ON COLUMN salon_member_point_log.before_points IS '变动前积分';
COMMENT ON COLUMN salon_member_point_log.change_points IS '变动积分（正=增加 负=减少）';
COMMENT ON COLUMN salon_member_point_log.after_points IS '变动后积分';
COMMENT ON COLUMN salon_member_point_log.expire_time IS '过期时间（仅获得类有效，按天；选当天则在当天24:00后过期）';
COMMENT ON COLUMN salon_member_point_log.remaining_points IS '批次剩余可扣积分（仅获得类有效，FIFO消费/过期时递减）';
COMMENT ON COLUMN salon_member_point_log.source_log_id IS '被扣减的获得批次流水ID（消费/过期类指向源批次）';
COMMENT ON COLUMN salon_member_point_log.biz_type IS '关联业务类型（ORDER/RECHARGE/ACTIVITY/MANUAL/EXCHANGE）';
COMMENT ON COLUMN salon_member_point_log.biz_id IS '关联业务单据ID';
COMMENT ON COLUMN salon_member_point_log.biz_no IS '关联业务单号';
COMMENT ON COLUMN salon_member_point_log.operator_id IS '操作人ID';
COMMENT ON COLUMN salon_member_point_log.remark IS '备注';
COMMENT ON COLUMN salon_member_point_log.create_by IS '创建人ID（0=系统）';
COMMENT ON COLUMN salon_member_point_log.create_time IS '创建时间';
COMMENT ON COLUMN salon_member_point_log.update_by IS '更新人ID';
COMMENT ON COLUMN salon_member_point_log.update_time IS '更新时间';
COMMENT ON COLUMN salon_member_point_log.deleted IS '逻辑删除（0=未删除 1=已删除）';

-- 会员标签字典（租户级）
CREATE TABLE IF NOT EXISTS salon_member_tag (
    id              int8          NOT NULL PRIMARY KEY,
    tenant_id       int8          NOT NULL,
    name            varchar(32)   NOT NULL,
    color           varchar(16),
    sort            int4          DEFAULT 0,
    status          int4          DEFAULT 1,
    remark          varchar(255),
    create_by       int8,
    create_time     timestamp,
    update_by       int8,
    update_time     timestamp,
    deleted         int4          DEFAULT 0
);
CREATE UNIQUE INDEX IF NOT EXISTS uk_salon_member_tag_name ON salon_member_tag (tenant_id, name) WHERE deleted = 0;
CREATE INDEX IF NOT EXISTS idx_salon_member_tag_sort ON salon_member_tag (tenant_id, sort) WHERE deleted = 0;
COMMENT ON TABLE salon_member_tag IS '会员标签字典（租户级）';
COMMENT ON COLUMN salon_member_tag.id IS '标签ID';
COMMENT ON COLUMN salon_member_tag.tenant_id IS '租户ID';
COMMENT ON COLUMN salon_member_tag.name IS '标签名称';
COMMENT ON COLUMN salon_member_tag.color IS '标签颜色（前端展示）';
COMMENT ON COLUMN salon_member_tag.sort IS '排序';
COMMENT ON COLUMN salon_member_tag.status IS '状态（1=启用 0=禁用）';
COMMENT ON COLUMN salon_member_tag.remark IS '备注';
COMMENT ON COLUMN salon_member_tag.create_by IS '创建人ID（0=系统）';
COMMENT ON COLUMN salon_member_tag.create_time IS '创建时间';
COMMENT ON COLUMN salon_member_tag.update_by IS '更新人ID';
COMMENT ON COLUMN salon_member_tag.update_time IS '更新时间';
COMMENT ON COLUMN salon_member_tag.deleted IS '逻辑删除（0=未删除 1=已删除）';

-- 会员-标签关联
CREATE TABLE IF NOT EXISTS salon_member_tag_rel (
    id              int8          NOT NULL PRIMARY KEY,
    member_id       int8          NOT NULL,
    tag_id          int8          NOT NULL,
    tenant_id       int8          NOT NULL,
    create_by       int8,
    create_time     timestamp,
    update_by       int8,
    update_time     timestamp,
    deleted         int4          DEFAULT 0
);
CREATE UNIQUE INDEX IF NOT EXISTS uk_salon_member_tag_rel ON salon_member_tag_rel (tenant_id, member_id, tag_id) WHERE deleted = 0;
CREATE INDEX IF NOT EXISTS idx_salon_member_tag_rel_tag ON salon_member_tag_rel (tenant_id, tag_id) WHERE deleted = 0;
COMMENT ON TABLE salon_member_tag_rel IS '会员-标签关联';
COMMENT ON COLUMN salon_member_tag_rel.id IS '关联ID';
COMMENT ON COLUMN salon_member_tag_rel.member_id IS '会员ID';
COMMENT ON COLUMN salon_member_tag_rel.tag_id IS '标签ID';
COMMENT ON COLUMN salon_member_tag_rel.tenant_id IS '租户ID';
COMMENT ON COLUMN salon_member_tag_rel.create_by IS '创建人ID（0=系统）';
COMMENT ON COLUMN salon_member_tag_rel.create_time IS '创建时间';
COMMENT ON COLUMN salon_member_tag_rel.update_by IS '更新人ID';
COMMENT ON COLUMN salon_member_tag_rel.update_time IS '更新时间';
COMMENT ON COLUMN salon_member_tag_rel.deleted IS '逻辑删除（0=未删除 1=已删除）';

-- 会员结构化备注（1:1 salon_member）
CREATE TABLE IF NOT EXISTS salon_member_profile (
    id                  int8          NOT NULL PRIMARY KEY,
    member_id           int8          NOT NULL,
    tenant_id           int8          NOT NULL,
    hair_quality        varchar(64),
    preferred_style     varchar(128),
    preferred_stylist_id int8,
    allergy             varchar(255),
    taboo               varchar(255),
    remark              varchar(500),
    create_by           int8,
    create_time         timestamp,
    update_by           int8,
    update_time         timestamp,
    deleted             int4          DEFAULT 0
);
CREATE UNIQUE INDEX IF NOT EXISTS uk_salon_member_profile_member ON salon_member_profile (tenant_id, member_id) WHERE deleted = 0;
COMMENT ON TABLE salon_member_profile IS '会员结构化备注（1:1 salon_member）';
COMMENT ON COLUMN salon_member_profile.id IS '备注ID';
COMMENT ON COLUMN salon_member_profile.member_id IS '会员ID';
COMMENT ON COLUMN salon_member_profile.tenant_id IS '租户ID';
COMMENT ON COLUMN salon_member_profile.hair_quality IS '发质情况';
COMMENT ON COLUMN salon_member_profile.preferred_style IS '偏好发型';
COMMENT ON COLUMN salon_member_profile.preferred_stylist_id IS '常用发型师ID（关联sys_user）';
COMMENT ON COLUMN salon_member_profile.allergy IS '过敏信息';
COMMENT ON COLUMN salon_member_profile.taboo IS '服务禁忌';
COMMENT ON COLUMN salon_member_profile.remark IS '扩展备注';
COMMENT ON COLUMN salon_member_profile.create_by IS '创建人ID（0=系统）';
COMMENT ON COLUMN salon_member_profile.create_time IS '创建时间';
COMMENT ON COLUMN salon_member_profile.update_by IS '更新人ID';
COMMENT ON COLUMN salon_member_profile.update_time IS '更新时间';
COMMENT ON COLUMN salon_member_profile.deleted IS '逻辑删除（0=未删除 1=已删除）';

-- ===== P2 服务项目与商品主数据 =====

-- 服务项目分类（租户级）
CREATE TABLE IF NOT EXISTS salon_service_category (
    id                  int8          NOT NULL PRIMARY KEY,
    tenant_id           int8          NOT NULL,
    name                varchar(64)   NOT NULL,
    sort                int4          DEFAULT 0,
    status              int4          DEFAULT 1,
    remark              varchar(255),
    create_by           int8,
    create_time         timestamp,
    update_by           int8,
    update_time         timestamp,
    deleted             int4          DEFAULT 0
);
CREATE UNIQUE INDEX IF NOT EXISTS uk_salon_service_category_name ON salon_service_category (tenant_id, name) WHERE deleted = 0;
CREATE INDEX IF NOT EXISTS idx_salon_service_category_sort ON salon_service_category (tenant_id, sort) WHERE deleted = 0;
COMMENT ON TABLE salon_service_category IS '服务项目分类（租户级）';
COMMENT ON COLUMN salon_service_category.id IS '分类ID';
COMMENT ON COLUMN salon_service_category.tenant_id IS '租户ID';
COMMENT ON COLUMN salon_service_category.name IS '分类名称';
COMMENT ON COLUMN salon_service_category.sort IS '排序';
COMMENT ON COLUMN salon_service_category.status IS '状态（1=启用 0=禁用）';
COMMENT ON COLUMN salon_service_category.remark IS '备注';
COMMENT ON COLUMN salon_service_category.create_by IS '创建人ID（0=系统）';
COMMENT ON COLUMN salon_service_category.create_time IS '创建时间';
COMMENT ON COLUMN salon_service_category.update_by IS '更新人ID';
COMMENT ON COLUMN salon_service_category.update_time IS '更新时间';
COMMENT ON COLUMN salon_service_category.deleted IS '逻辑删除（0=未删除 1=已删除）';

-- 服务项目（租户级，收银开单可选）
CREATE TABLE IF NOT EXISTS salon_service (
    id                  int8          NOT NULL PRIMARY KEY,
    tenant_id           int8          NOT NULL,
    name                varchar(64)   NOT NULL,
    category_id         int8,
    standard_price      numeric(12, 2) NOT NULL,
    member_price        numeric(12, 2),
    duration            int4,
    discountable        int4          DEFAULT 1,
    commissionable      int4          DEFAULT 1,
    sort                int4          DEFAULT 0,
    status              int4          DEFAULT 1,
    remark              varchar(255),
    create_by           int8,
    create_time         timestamp,
    update_by           int8,
    update_time         timestamp,
    deleted             int4          DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_salon_service_category_id ON salon_service (tenant_id, category_id) WHERE deleted = 0;
CREATE INDEX IF NOT EXISTS idx_salon_service_sort ON salon_service (tenant_id, sort) WHERE deleted = 0;
COMMENT ON TABLE salon_service IS '服务项目（租户级，收银开单可选）';
COMMENT ON COLUMN salon_service.id IS '项目ID';
COMMENT ON COLUMN salon_service.tenant_id IS '租户ID';
COMMENT ON COLUMN salon_service.name IS '项目名称';
COMMENT ON COLUMN salon_service.category_id IS '项目分类ID（关联salon_service_category）';
COMMENT ON COLUMN salon_service.standard_price IS '标准价格';
COMMENT ON COLUMN salon_service.member_price IS '会员价格（NULL=无会员价，按标准价）';
COMMENT ON COLUMN salon_service.duration IS '服务时长（分钟）';
COMMENT ON COLUMN salon_service.discountable IS '是否参与折扣（1=是 0=否）';
COMMENT ON COLUMN salon_service.commissionable IS '是否计算提成（1=是 0=否）';
COMMENT ON COLUMN salon_service.sort IS '排序';
COMMENT ON COLUMN salon_service.status IS '状态（1=启用 0=禁用）';
COMMENT ON COLUMN salon_service.remark IS '备注';
COMMENT ON COLUMN salon_service.create_by IS '创建人ID（0=系统）';
COMMENT ON COLUMN salon_service.create_time IS '创建时间';
COMMENT ON COLUMN salon_service.update_by IS '更新人ID';
COMMENT ON COLUMN salon_service.update_time IS '更新时间';
COMMENT ON COLUMN salon_service.deleted IS '逻辑删除（0=未删除 1=已删除）';

-- 商品分类（租户级）
CREATE TABLE IF NOT EXISTS salon_goods_category (
    id                  int8          NOT NULL PRIMARY KEY,
    tenant_id           int8          NOT NULL,
    name                varchar(64)   NOT NULL,
    sort                int4          DEFAULT 0,
    status              int4          DEFAULT 1,
    remark              varchar(255),
    create_by           int8,
    create_time         timestamp,
    update_by           int8,
    update_time         timestamp,
    deleted             int4          DEFAULT 0
);
CREATE UNIQUE INDEX IF NOT EXISTS uk_salon_goods_category_name ON salon_goods_category (tenant_id, name) WHERE deleted = 0;
CREATE INDEX IF NOT EXISTS idx_salon_goods_category_sort ON salon_goods_category (tenant_id, sort) WHERE deleted = 0;
COMMENT ON TABLE salon_goods_category IS '商品分类（租户级）';
COMMENT ON COLUMN salon_goods_category.id IS '分类ID';
COMMENT ON COLUMN salon_goods_category.tenant_id IS '租户ID';
COMMENT ON COLUMN salon_goods_category.name IS '分类名称';
COMMENT ON COLUMN salon_goods_category.sort IS '排序';
COMMENT ON COLUMN salon_goods_category.status IS '状态（1=启用 0=禁用）';
COMMENT ON COLUMN salon_goods_category.remark IS '备注';
COMMENT ON COLUMN salon_goods_category.create_by IS '创建人ID（0=系统）';
COMMENT ON COLUMN salon_goods_category.create_time IS '创建时间';
COMMENT ON COLUMN salon_goods_category.update_by IS '更新人ID';
COMMENT ON COLUMN salon_goods_category.update_time IS '更新时间';
COMMENT ON COLUMN salon_goods_category.deleted IS '逻辑删除（0=未删除 1=已删除）';

-- 商品（租户级，收银开单可选；库存数量为冗余，P5销售扣减，完整进销存见P17）
CREATE TABLE IF NOT EXISTS salon_goods (
    id                  int8          NOT NULL PRIMARY KEY,
    tenant_id           int8          NOT NULL,
    name                varchar(64)   NOT NULL,
    category_id         int8,
    barcode             varchar(64),
    sale_price          numeric(12, 2) NOT NULL,
    cost_price          numeric(12, 2),
    stock_quantity      int4          DEFAULT 0,
    discountable        int4          DEFAULT 1,
    commissionable      int4          DEFAULT 1,
    sort                int4          DEFAULT 0,
    status              int4          DEFAULT 1,
    remark              varchar(255),
    create_by           int8,
    create_time         timestamp,
    update_by           int8,
    update_time         timestamp,
    deleted             int4          DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_salon_goods_category_id ON salon_goods (tenant_id, category_id) WHERE deleted = 0;
CREATE INDEX IF NOT EXISTS idx_salon_goods_sort ON salon_goods (tenant_id, sort) WHERE deleted = 0;
CREATE INDEX IF NOT EXISTS idx_salon_goods_barcode ON salon_goods (tenant_id, barcode) WHERE deleted = 0;
COMMENT ON TABLE salon_goods IS '商品（租户级，收银开单可选）';
COMMENT ON COLUMN salon_goods.id IS '商品ID';
COMMENT ON COLUMN salon_goods.tenant_id IS '租户ID';
COMMENT ON COLUMN salon_goods.name IS '商品名称';
COMMENT ON COLUMN salon_goods.category_id IS '商品分类ID（关联salon_goods_category）';
COMMENT ON COLUMN salon_goods.barcode IS '商品条码';
COMMENT ON COLUMN salon_goods.sale_price IS '销售价格';
COMMENT ON COLUMN salon_goods.cost_price IS '成本价';
COMMENT ON COLUMN salon_goods.stock_quantity IS '库存数量（冗余，P5销售扣减；完整进销存见P17）';
COMMENT ON COLUMN salon_goods.discountable IS '是否参与折扣（1=是 0=否）';
COMMENT ON COLUMN salon_goods.commissionable IS '是否计算提成（1=是 0=否）';
COMMENT ON COLUMN salon_goods.sort IS '排序';
COMMENT ON COLUMN salon_goods.status IS '状态（1=启用 0=禁用）';
COMMENT ON COLUMN salon_goods.remark IS '备注';
COMMENT ON COLUMN salon_goods.create_by IS '创建人ID（0=系统）';
COMMENT ON COLUMN salon_goods.create_time IS '创建时间';
COMMENT ON COLUMN salon_goods.update_by IS '更新人ID';
COMMENT ON COLUMN salon_goods.update_time IS '更新时间';
COMMENT ON COLUMN salon_goods.deleted IS '逻辑删除（0=未删除 1=已删除）';
