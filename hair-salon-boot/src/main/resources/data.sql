-- 默认管理员 admin / admin123
-- 启动时 DevDataInitializer 会将 {noop} 转为 BCrypt
INSERT INTO sys_user (id, username, password, nickname, phone, status, dept_id, create_by, create_time, update_by, update_time, deleted)
SELECT 1, 'admin', '{noop}adminm', '管理员', '15061952394', 1, NULL, 0, CURRENT_TIMESTAMP, 0, CURRENT_TIMESTAMP, 0
WHERE NOT EXISTS (SELECT 1 FROM sys_user WHERE username = 'admin');
