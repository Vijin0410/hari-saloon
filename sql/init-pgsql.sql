-- 手工初始化（库 hair_salon 已创建后执行）
-- psql -U postgres -d hair_salon -f sql/init-pgsql.sql

CREATE TABLE IF NOT EXISTS sys_user (
    id            int8         NOT NULL PRIMARY KEY,
    username      varchar(64)  NOT NULL,
    password      varchar(128) NOT NULL,
    nickname      varchar(64),
    phone         varchar(20),
    status        int4         DEFAULT 1,
    dept_id       int8,
    create_by     int8,
    create_time   timestamp,
    update_by     int8,
    update_time   timestamp,
    deleted       int4         DEFAULT 0
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_sys_user_username ON sys_user (username);

INSERT INTO sys_user (id, username, password, nickname, phone, status, dept_id, create_by, create_time, update_by, update_time, deleted)
SELECT 1, 'admin', '{noop}admin123', '管理员', '13800000000', 1, NULL, 0, CURRENT_TIMESTAMP, 0, CURRENT_TIMESTAMP, 0
WHERE NOT EXISTS (SELECT 1 FROM sys_user WHERE username = 'admin');
