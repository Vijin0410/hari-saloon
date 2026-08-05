-- 截断所有业务表数据（保留表结构），用于重置后重跑 data.sql。
-- 执行顺序：先关联表，再主表；CASCADE 兜底外键（当前无显式外键，保险起见）。
-- 注意：TRUNCATE 不可回滚，请在开发/测试环境使用。

TRUNCATE TABLE
    sys_role_menu,
    sys_user_role,
    sys_dict,
    sys_dict_type,
    salon_store_user,
    salon_store,
    salon_member,
    sys_file,
    sys_menu,
    sys_user,
    sys_role,
    sys_dept,
    sys_tenant
RESTART IDENTITY CASCADE;
