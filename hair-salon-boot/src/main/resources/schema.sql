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
    tenant_id     int8         NOT NULL,
    create_by     int8,
    create_time   timestamp,
    update_by     int8,
    update_time   timestamp,
    deleted       int4         DEFAULT 0
);
CREATE UNIQUE INDEX IF NOT EXISTS uk_sys_user_username_tenant ON sys_user (tenant_id, username);

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

CREATE TABLE IF NOT EXISTS sys_user_role (
    user_id       int8 NOT NULL,
    role_id       int8 NOT NULL,
    PRIMARY KEY (user_id, role_id)
);

CREATE TABLE IF NOT EXISTS sys_role_menu (
    role_id       int8 NOT NULL,
    menu_id       int8 NOT NULL,
    type          int4 DEFAULT 1,
    PRIMARY KEY (role_id, menu_id, type)
);

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
