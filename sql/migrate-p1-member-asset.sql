-- ===== P1 会员资产闭环迁移（存量库手工执行，幂等）=====
-- 对应 docs/p1-member-asset-ddl.md §3
-- 执行前请备份；执行后校验 salon_member.level_id / salon_member_balance / salon_member_level 等表
-- 注：sql.init.mode=never 时 Spring Boot 不自动执行 schema.sql/data.sql，存量库须手工跑本脚本

-- 1) salon_member: level int4 -> level_id int8（已改则跳过）
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'salon_member' AND column_name = 'level') THEN
    ALTER TABLE salon_member ALTER COLUMN level DROP DEFAULT;
    ALTER TABLE salon_member ALTER COLUMN level TYPE int8 USING level::int8;
    ALTER TABLE salon_member RENAME COLUMN level TO level_id;
  END IF;
END $$;
COMMENT ON COLUMN salon_member.level_id IS '会员等级ID（关联salon_member_level，空=普通，建档时由service填默认等级）';
COMMENT ON COLUMN salon_member.balance IS '可用总余额（冗余=本金+赠送-冻结，真源在salon_member_balance）';
COMMENT ON COLUMN salon_member.points IS '可用总积分（冗余，真源由salon_member_point_log汇总）';

-- 2) 建新表（7 表，IF NOT EXISTS 幂等；DDL 同 schema.sql P1 段）

-- 会员等级配置
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

-- 会员余额
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

-- 会员余额流水
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

-- 会员积分流水
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

-- 会员标签字典
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

-- 会员结构化备注
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

-- 3) 为现有会员补建余额档案（存量 balance 视为本金，赠送/冻结 0）
INSERT INTO salon_member_balance (id, member_id, tenant_id, principal_balance, gift_balance, frozen_balance, version, create_by, create_time, update_by, update_time, deleted)
SELECT m.id, m.id, m.tenant_id, COALESCE(m.balance, 0), 0, 0, 0, 0, CURRENT_TIMESTAMP, 0, CURRENT_TIMESTAMP, 0
FROM salon_member m
WHERE m.deleted = 0
  AND NOT EXISTS (SELECT 1 FROM salon_member_balance b WHERE b.member_id = m.id AND b.tenant_id = m.tenant_id AND b.deleted = 0);

-- 4) 回填 level_id 指向各租户普通等级（level_no=0）；无普通等级的租户置空，由 service 兜底
UPDATE salon_member m SET level_id = COALESCE((
    SELECT l.id FROM salon_member_level l
    WHERE l.tenant_id = m.tenant_id AND l.level_no = 0 AND l.deleted = 0
    LIMIT 1
), NULL)
WHERE m.deleted = 0 AND (m.level_id IS NULL OR m.level_id = 0);

-- 5) 种子（等级/标签/字典/权限；WHERE NOT EXISTS 幂等；同 data.sql P1 段）

-- 会员等级（默认租户 1）
INSERT INTO salon_member_level (id, tenant_id, name, level_no, service_discount, goods_discount, point_rate, recharge_gift_rate, sort, status, create_by, create_time, update_by, update_time, deleted)
SELECT v.id, 1, v.name, v.level_no, v.service_discount, v.goods_discount, v.point_rate, v.recharge_gift_rate, v.level_no, 1, 0, CURRENT_TIMESTAMP, 0, CURRENT_TIMESTAMP, 0
FROM (VALUES
  (1001::int8, '普通会员', 0, 1.00, 1.00, 1.00, 0.00),
  (1002::int8, '银卡会员', 1, 0.95, 0.95, 1.00, 0.05),
  (1003::int8, '金卡会员', 2, 0.90, 0.90, 1.20, 0.10),
  (1004::int8, '钻石会员', 3, 0.85, 0.85, 1.50, 0.15)
) AS v(id, name, level_no, service_discount, goods_discount, point_rate, recharge_gift_rate)
WHERE NOT EXISTS (SELECT 1 FROM salon_member_level l WHERE l.id = v.id);

-- 会员标签（默认租户 1）
INSERT INTO salon_member_tag (id, tenant_id, name, color, sort, status, create_by, create_time, update_by, update_time, deleted)
SELECT v.id, 1, v.name, v.color, v.sort, 1, 0, CURRENT_TIMESTAMP, 0, CURRENT_TIMESTAMP, 0
FROM (VALUES
  (2001::int8, '高价值客户', 'red',    1),
  (2002::int8, '烫染客户',   'purple', 2),
  (2003::int8, '流失风险',   'gray',   3),
  (2004::int8, '新会员',     'blue',   4),
  (2005::int8, '老客户',     'green',  5),
  (2006::int8, '生日客户',   'pink',   6)
) AS v(id, name, color, sort)
WHERE NOT EXISTS (SELECT 1 FROM salon_member_tag t WHERE t.id = v.id);

-- 字典：member_source
INSERT INTO sys_dict_type (id, name, code, status, remark, group_code, tenant_id, create_by, create_time, update_by, update_time, deleted)
SELECT 3, '会员来源', 'member_source', 1, '会员来源渠道', 'system', 1, 0, CURRENT_TIMESTAMP, 0, CURRENT_TIMESTAMP, 0
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_type WHERE code = 'member_source' AND tenant_id = 1);
INSERT INTO sys_dict (id, type_code, name, value, sort, status, defaulted, remark, tenant_id)
SELECT v.id, 'member_source', v.name, v.value, v.sort, 1, v.defaulted, NULL, 1
FROM (VALUES
  (31::int8, '到店',     '1', 1, 1),
  (32::int8, '小程序',   '2', 2, 0),
  (33::int8, '推荐',     '3', 3, 0),
  (34::int8, '活动',     '4', 4, 0),
  (35::int8, '其他',     '9', 9, 0)
) AS v(id, name, value, sort, defaulted)
WHERE NOT EXISTS (SELECT 1 FROM sys_dict d WHERE d.type_code = 'member_source' AND d.value = v.value AND d.tenant_id = 1);

-- 字典：member_balance_type
INSERT INTO sys_dict_type (id, name, code, status, remark, group_code, tenant_id, create_by, create_time, update_by, update_time, deleted)
SELECT 4, '余额桶类型', 'member_balance_type', 1, '会员余额分桶', 'system', 1, 0, CURRENT_TIMESTAMP, 0, CURRENT_TIMESTAMP, 0
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_type WHERE code = 'member_balance_type' AND tenant_id = 1);
INSERT INTO sys_dict (id, type_code, name, value, sort, status, defaulted, remark, tenant_id)
SELECT v.id, 'member_balance_type', v.name, v.value, v.sort, 1, 0, NULL, 1
FROM (VALUES
  (41::int8, '本金', '1', 1),
  (42::int8, '赠送', '2', 2),
  (43::int8, '冻结', '3', 3)
) AS v(id, name, value, sort)
WHERE NOT EXISTS (SELECT 1 FROM sys_dict d WHERE d.type_code = 'member_balance_type' AND d.value = v.value AND d.tenant_id = 1);

-- 字典：balance_change_type
INSERT INTO sys_dict_type (id, name, code, status, remark, group_code, tenant_id, create_by, create_time, update_by, update_time, deleted)
SELECT 5, '余额变动类型', 'balance_change_type', 1, '会员余额流水业务类型', 'system', 1, 0, CURRENT_TIMESTAMP, 0, CURRENT_TIMESTAMP, 0
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_type WHERE code = 'balance_change_type' AND tenant_id = 1);
INSERT INTO sys_dict (id, type_code, name, value, sort, status, defaulted, remark, tenant_id)
SELECT v.id, 'balance_change_type', v.name, v.value, v.sort, 1, 0, NULL, 1
FROM (VALUES
  (51::int8, '充值',     '1', 1),
  (52::int8, '充值赠送', '2', 2),
  (53::int8, '消费扣款', '3', 3),
  (54::int8, '退款退回', '4', 4),
  (55::int8, '手工调整', '5', 5),
  (56::int8, '余额转入', '6', 6),
  (57::int8, '余额转出', '7', 7),
  (58::int8, '冻结',     '8', 8),
  (59::int8, '解冻',     '9', 9)
) AS v(id, name, value, sort)
WHERE NOT EXISTS (SELECT 1 FROM sys_dict d WHERE d.type_code = 'balance_change_type' AND d.value = v.value AND d.tenant_id = 1);

-- 字典：point_change_type
INSERT INTO sys_dict_type (id, name, code, status, remark, group_code, tenant_id, create_by, create_time, update_by, update_time, deleted)
SELECT 6, '积分变动类型', 'point_change_type', 1, '会员积分流水类型', 'system', 1, 0, CURRENT_TIMESTAMP, 0, CURRENT_TIMESTAMP, 0
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_type WHERE code = 'point_change_type' AND tenant_id = 1);
INSERT INTO sys_dict (id, type_code, name, value, sort, status, defaulted, remark, tenant_id)
SELECT v.id, 'point_change_type', v.name, v.value, v.sort, 1, 0, NULL, 1
FROM (VALUES
  (61::int8, '消费获得', '1', 1),
  (62::int8, '充值获得', '2', 2),
  (63::int8, '活动赠送', '3', 3),
  (64::int8, '手工调整', '4', 4),
  (65::int8, '抵扣消费', '5', 5),
  (66::int8, '兑换商品', '6', 6),
  (67::int8, '手工扣减', '7', 7),
  (68::int8, '过期清零', '8', 8)
) AS v(id, name, value, sort)
WHERE NOT EXISTS (SELECT 1 FROM sys_dict d WHERE d.type_code = 'point_change_type' AND d.value = v.value AND d.tenant_id = 1);

-- 菜单：会员等级 / 会员标签（挂会员菜单 10）
INSERT INTO sys_menu (id, parent_id, name, type, path, component, redirect, tree_path, meta, perm, tenant_id, create_by, create_time, update_by, update_time, deleted)
SELECT v.id, v.parent_id, v.name, v.type, v.path, v.component, NULL, v.tree_path, v.meta, NULL, 1, 0, CURRENT_TIMESTAMP, 0, CURRENT_TIMESTAMP, 0
FROM (VALUES
  (11::int8, 8::int8, 'memberLevel', 1, 'level', 'biz/member/level/index', '0,8', '{"title":"会员等级","icon":"medal","rank":3,"showLink":true}'),
  (12::int8, 8::int8, 'memberTag',   1, 'tag',   'biz/member/tag/index',   '0,8', '{"title":"会员标签","icon":"tag","rank":4,"showLink":true}')
) AS v(id, parent_id, name, type, path, component, tree_path, meta)
WHERE NOT EXISTS (SELECT 1 FROM sys_menu m WHERE m.id = v.id);

INSERT INTO sys_menu (id, parent_id, name, type, path, component, redirect, tree_path, meta, perm, tenant_id, create_by, create_time, update_by, update_time, deleted)
SELECT v.id, v.parent_id, v.name, 4, NULL, NULL, NULL, v.tree_path, v.meta, v.perm, 1, 0, CURRENT_TIMESTAMP, 0, CURRENT_TIMESTAMP, 0
FROM (VALUES
  (111::int8, 11::int8, 'memberLevelList',   '0,8,10,11', '{"title":"查看列表"}', 'biz:memberLevel:list'),
  (112::int8, 11::int8, 'memberLevelView',   '0,8,10,11', '{"title":"查看详情"}', 'biz:memberLevel:view'),
  (113::int8, 11::int8, 'memberLevelAdd',    '0,8,10,11', '{"title":"新增等级"}', 'biz:memberLevel:add'),
  (114::int8, 11::int8, 'memberLevelEdit',   '0,8,10,11', '{"title":"编辑等级"}', 'biz:memberLevel:edit'),
  (115::int8, 11::int8, 'memberLevelDelete', '0,8,10,11', '{"title":"删除等级"}', 'biz:memberLevel:delete'),
  (121::int8, 12::int8, 'memberTagList',   '0,8,10,12', '{"title":"查看列表"}', 'biz:memberTag:list'),
  (122::int8, 12::int8, 'memberTagView',   '0,8,10,12', '{"title":"查看详情"}', 'biz:memberTag:view'),
  (123::int8, 12::int8, 'memberTagAdd',    '0,8,10,12', '{"title":"新增标签"}', 'biz:memberTag:add'),
  (124::int8, 12::int8, 'memberTagEdit',   '0,8,10,12', '{"title":"编辑标签"}', 'biz:memberTag:edit'),
  (125::int8, 12::int8, 'memberTagDelete', '0,8,10,12', '{"title":"删除标签"}', 'biz:memberTag:delete'),
  (106::int8, 10::int8, 'memberBalanceAdjust', '0,8,10', '{"title":"余额调整"}', 'biz:memberBalance:adjust'),
  (107::int8, 10::int8, 'memberBalanceLog',    '0,8,10', '{"title":"余额流水"}', 'biz:memberBalance:log'),
  (108::int8, 10::int8, 'memberPointAdjust',   '0,8,10', '{"title":"积分调整"}', 'biz:memberPoint:adjust'),
  (109::int8, 10::int8, 'memberPointLog',      '0,8,10', '{"title":"积分流水"}', 'biz:memberPoint:log'),
  (110::int8, 10::int8, 'memberTagRel',        '0,8,10', '{"title":"会员打标签"}', 'biz:member:tag')
) AS v(id, parent_id, name, tree_path, meta, perm)
WHERE NOT EXISTS (SELECT 1 FROM sys_menu m WHERE m.id = v.id);

-- 店长(role 2)
INSERT INTO sys_role_menu (role_id, menu_id, type)
SELECT 2, m.id, 1 FROM sys_menu m
WHERE m.id IN (11, 111, 112, 113, 114, 115,
               12, 121, 122, 123, 124, 125,
               106, 107, 108, 109, 110)
  AND NOT EXISTS (SELECT 1 FROM sys_role_menu rm WHERE rm.role_id = 2 AND rm.menu_id = m.id AND rm.type = 1);

-- 店员(role 3)
INSERT INTO sys_role_menu (role_id, menu_id, type)
SELECT 3, m.id, 1 FROM sys_menu m
WHERE m.id IN (110, 107, 109)
  AND NOT EXISTS (SELECT 1 FROM sys_role_menu rm WHERE rm.role_id = 3 AND rm.menu_id = m.id AND rm.type = 1);

-- ===== 租户 2084880957290426370 P1 通用数据（等级/标签/4类字典）=====

-- 会员等级
INSERT INTO salon_member_level (id, tenant_id, name, level_no, service_discount, goods_discount, point_rate, recharge_gift_rate, sort, status, create_by, create_time, update_by, update_time, deleted)
SELECT v.id, 2084880957290426370, v.name, v.level_no, v.service_discount, v.goods_discount, v.point_rate, v.recharge_gift_rate, v.level_no, 1, 0, CURRENT_TIMESTAMP, 0, CURRENT_TIMESTAMP, 0
FROM (VALUES
  (1005::int8, '普通会员', 0, 1.00, 1.00, 1.00, 0.00),
  (1006::int8, '银卡会员', 1, 0.95, 0.95, 1.00, 0.05),
  (1007::int8, '金卡会员', 2, 0.90, 0.90, 1.20, 0.10),
  (1008::int8, '钻石会员', 3, 0.85, 0.85, 1.50, 0.15)
) AS v(id, name, level_no, service_discount, goods_discount, point_rate, recharge_gift_rate)
WHERE NOT EXISTS (SELECT 1 FROM salon_member_level l WHERE l.id = v.id);

-- 会员标签
INSERT INTO salon_member_tag (id, tenant_id, name, color, sort, status, create_by, create_time, update_by, update_time, deleted)
SELECT v.id, 2084880957290426370, v.name, v.color, v.sort, 1, 0, CURRENT_TIMESTAMP, 0, CURRENT_TIMESTAMP, 0
FROM (VALUES
  (2007::int8, '高价值客户', 'red',    1),
  (2008::int8, '烫染客户',   'purple', 2),
  (2009::int8, '流失风险',   'gray',   3),
  (2010::int8, '新会员',     'blue',   4),
  (2011::int8, '老客户',     'green',  5),
  (2012::int8, '生日客户',   'pink',   6)
) AS v(id, name, color, sort)
WHERE NOT EXISTS (SELECT 1 FROM salon_member_tag t WHERE t.id = v.id);

-- 字典：member_source
INSERT INTO sys_dict_type (id, name, code, status, remark, group_code, tenant_id, create_by, create_time, update_by, update_time, deleted)
SELECT 103, '会员来源', 'member_source', 1, '会员来源渠道', 'system', 2084880957290426370, 0, CURRENT_TIMESTAMP, 0, CURRENT_TIMESTAMP, 0
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_type WHERE code = 'member_source' AND tenant_id = 2084880957290426370);
INSERT INTO sys_dict (id, type_code, name, value, sort, status, defaulted, remark, tenant_id)
SELECT v.id, 'member_source', v.name, v.value, v.sort, 1, v.defaulted, NULL, 2084880957290426370
FROM (VALUES
  (105::int8, '到店',     '1', 1, 1),
  (106::int8, '小程序',   '2', 2, 0),
  (107::int8, '推荐',     '3', 3, 0),
  (108::int8, '活动',     '4', 4, 0),
  (109::int8, '其他',     '9', 9, 0)
) AS v(id, name, value, sort, defaulted)
WHERE NOT EXISTS (SELECT 1 FROM sys_dict d WHERE d.type_code = 'member_source' AND d.value = v.value AND d.tenant_id = 2084880957290426370);

-- 字典：member_balance_type
INSERT INTO sys_dict_type (id, name, code, status, remark, group_code, tenant_id, create_by, create_time, update_by, update_time, deleted)
SELECT 104, '余额桶类型', 'member_balance_type', 1, '会员余额分桶', 'system', 2084880957290426370, 0, CURRENT_TIMESTAMP, 0, CURRENT_TIMESTAMP, 0
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_type WHERE code = 'member_balance_type' AND tenant_id = 2084880957290426370);
INSERT INTO sys_dict (id, type_code, name, value, sort, status, defaulted, remark, tenant_id)
SELECT v.id, 'member_balance_type', v.name, v.value, v.sort, 1, 0, NULL, 2084880957290426370
FROM (VALUES
  (110::int8, '本金', '1', 1),
  (111::int8, '赠送', '2', 2),
  (112::int8, '冻结', '3', 3)
) AS v(id, name, value, sort)
WHERE NOT EXISTS (SELECT 1 FROM sys_dict d WHERE d.type_code = 'member_balance_type' AND d.value = v.value AND d.tenant_id = 2084880957290426370);

-- 字典：balance_change_type
INSERT INTO sys_dict_type (id, name, code, status, remark, group_code, tenant_id, create_by, create_time, update_by, update_time, deleted)
SELECT 105, '余额变动类型', 'balance_change_type', 1, '会员余额流水业务类型', 'system', 2084880957290426370, 0, CURRENT_TIMESTAMP, 0, CURRENT_TIMESTAMP, 0
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_type WHERE code = 'balance_change_type' AND tenant_id = 2084880957290426370);
INSERT INTO sys_dict (id, type_code, name, value, sort, status, defaulted, remark, tenant_id)
SELECT v.id, 'balance_change_type', v.name, v.value, v.sort, 1, 0, NULL, 2084880957290426370
FROM (VALUES
  (113::int8, '充值',     '1', 1),
  (114::int8, '充值赠送', '2', 2),
  (115::int8, '消费扣款', '3', 3),
  (116::int8, '退款退回', '4', 4),
  (117::int8, '手工调整', '5', 5),
  (118::int8, '余额转入', '6', 6),
  (119::int8, '余额转出', '7', 7),
  (120::int8, '冻结',     '8', 8),
  (121::int8, '解冻',     '9', 9)
) AS v(id, name, value, sort)
WHERE NOT EXISTS (SELECT 1 FROM sys_dict d WHERE d.type_code = 'balance_change_type' AND d.value = v.value AND d.tenant_id = 2084880957290426370);

-- 字典：point_change_type
INSERT INTO sys_dict_type (id, name, code, status, remark, group_code, tenant_id, create_by, create_time, update_by, update_time, deleted)
SELECT 106, '积分变动类型', 'point_change_type', 1, '会员积分流水类型', 'system', 2084880957290426370, 0, CURRENT_TIMESTAMP, 0, CURRENT_TIMESTAMP, 0
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_type WHERE code = 'point_change_type' AND tenant_id = 2084880957290426370);
INSERT INTO sys_dict (id, type_code, name, value, sort, status, defaulted, remark, tenant_id)
SELECT v.id, 'point_change_type', v.name, v.value, v.sort, 1, 0, NULL, 2084880957290426370
FROM (VALUES
  (122::int8, '消费获得', '1', 1),
  (123::int8, '充值获得', '2', 2),
  (124::int8, '活动赠送', '3', 3),
  (125::int8, '手工调整', '4', 4),
  (126::int8, '抵扣消费', '5', 5),
  (127::int8, '兑换商品', '6', 6),
  (128::int8, '手工扣减', '7', 7),
  (129::int8, '过期清零', '8', 8)
) AS v(id, name, value, sort)
WHERE NOT EXISTS (SELECT 1 FROM sys_dict d WHERE d.type_code = 'point_change_type' AND d.value = v.value AND d.tenant_id = 2084880957290426370);
