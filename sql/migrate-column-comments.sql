-- 存量库增量：为全部表与字段补充 comment 注释
-- 适用 PostgreSQL。COMMENT ON 幂等，重复执行只覆盖不报错。
-- 在已有 hair_salon 库手工执行（sql.init.mode=never 时不会自动跑 schema）
-- 公共字段约定：
--   id          主键
--   tenant_id   租户ID（行级隔离）
--   create_by   创建人ID（0=系统）
--   create_time 创建时间
--   update_by   更新人ID
--   update_time 更新时间
--   deleted     逻辑删除（0=未删除 1=已删除）

-- ============ sys_tenant 租户主数据（全局表，不做行级租户过滤） ============
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

-- ============ sys_user 系统用户 ============
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

-- ============ sys_dept 部门 ============
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

-- ============ sys_role 角色 ============
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

-- ============ sys_menu 菜单/按钮权限 ============
COMMENT ON TABLE sys_menu IS '菜单/按钮权限（各租户通过 sys_role_menu 挂同一套菜单，全局共享）';
COMMENT ON COLUMN sys_menu.id IS '菜单ID';
COMMENT ON COLUMN sys_menu.parent_id IS '父级菜单ID（0=顶级）';
COMMENT ON COLUMN sys_menu.name IS '菜单/按钮名称';
COMMENT ON COLUMN sys_menu.type IS '类型（见 MenuTypeEnum）';
COMMENT ON COLUMN sys_menu.path IS '路由路径';
COMMENT ON COLUMN sys_menu.component IS '前端组件路径';
COMMENT ON COLUMN sys_menu.redirect IS '重定向路径';
COMMENT ON COLUMN sys_menu.tree_path IS '层级路径（逗号分隔）';
COMMENT ON COLUMN sys_menu.meta IS '元数据（JSON：标题/图标/排序/是否显示等）';
COMMENT ON COLUMN sys_menu.perm IS '权限标识，如 system:user:add';
COMMENT ON COLUMN sys_menu.api_path IS '接口路径';
COMMENT ON COLUMN sys_menu.remark IS '备注';
COMMENT ON COLUMN sys_menu.tenant_id IS '租户ID';
COMMENT ON COLUMN sys_menu.create_by IS '创建人ID（0=系统）';
COMMENT ON COLUMN sys_menu.create_time IS '创建时间';
COMMENT ON COLUMN sys_menu.update_by IS '更新人ID';
COMMENT ON COLUMN sys_menu.update_time IS '更新时间';
COMMENT ON COLUMN sys_menu.deleted IS '逻辑删除（0=未删除 1=已删除）';

-- ============ sys_user_role 用户-角色关联 ============
COMMENT ON TABLE sys_user_role IS '用户-角色关联';
COMMENT ON COLUMN sys_user_role.user_id IS '用户ID';
COMMENT ON COLUMN sys_user_role.role_id IS '角色ID';

-- ============ sys_role_menu 角色-菜单关联 ============
COMMENT ON TABLE sys_role_menu IS '角色-菜单关联';
COMMENT ON COLUMN sys_role_menu.role_id IS '角色ID';
COMMENT ON COLUMN sys_role_menu.menu_id IS '菜单ID';
COMMENT ON COLUMN sys_role_menu.type IS '终端类型（1=web 2=app，一期仅用1）';

-- ============ sys_dict_type 字典类型 ============
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

-- ============ sys_dict 字典数据项 ============
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

-- ============ salon_store 门店营业档案（与 sys_dept 1:1） ============
COMMENT ON TABLE salon_store IS '门店营业档案（与 sys_dept 1:1，数据权限走 dept_id）';
COMMENT ON COLUMN salon_store.id IS '门店ID';
COMMENT ON COLUMN salon_store.name IS '门店名称';
COMMENT ON COLUMN salon_store.code IS '门店编码（租户内唯一）';
COMMENT ON COLUMN salon_store.dept_id IS '绑定的组织部门ID';
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

-- ============ salon_member 会员 ============
COMMENT ON TABLE salon_member IS '会员（租户 + 部门数据权限）';
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
COMMENT ON COLUMN salon_member.dept_id IS '所属部门ID';
COMMENT ON COLUMN salon_member.tenant_id IS '租户ID';
COMMENT ON COLUMN salon_member.create_by IS '创建人ID（0=系统）';
COMMENT ON COLUMN salon_member.create_time IS '创建时间';
COMMENT ON COLUMN salon_member.update_by IS '更新人ID';
COMMENT ON COLUMN salon_member.update_time IS '更新时间';
COMMENT ON COLUMN salon_member.deleted IS '逻辑删除（0=未删除 1=已删除）';
