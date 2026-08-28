-- ===== 支付渠道配置 存量库迁移（幂等可重跑） =====
-- 新表：salon_tenant_pay_config
-- 种子：字典 pay_channel/pay_settle_type/pay_config_status（含租户副本）；菜单 170 + 按钮 194-199；店长授权
-- 方言：PostgreSQL

-- ===== DDL =====
CREATE TABLE IF NOT EXISTS salon_tenant_pay_config (
    id                  int8          NOT NULL PRIMARY KEY,
    tenant_id           int8          NOT NULL,
    channel             varchar(16)   NOT NULL,
    settle_type         varchar(16)   NOT NULL,
    enabled             int4          DEFAULT 1,
    app_id              varchar(64),
    mch_id              varchar(32),
    api_v3_key          varchar(512),
    cert_serial_no      varchar(64),
    private_key         text,
    platform_public_key text,
    sub_mch_id          varchar(64),
    store_no            varchar(64),
    auth_token          varchar(2048),
    license_object_key  varchar(255),
    cert_object_key     varchar(255),
    pull_interval_sec   int4,
    status              varchar(16)   NOT NULL DEFAULT 'pending',
    remark              varchar(255),
    create_by           int8,
    create_time         timestamp,
    update_by           int8,
    update_time         timestamp,
    deleted             int4          DEFAULT 0
);
CREATE UNIQUE INDEX IF NOT EXISTS uk_salon_tenant_pay_config_channel ON salon_tenant_pay_config (tenant_id, channel) WHERE deleted = 0;
COMMENT ON TABLE salon_tenant_pay_config IS '租户支付配置（渠道参数；一租户一渠道一条，敏感字段SM4加密）';
COMMENT ON COLUMN salon_tenant_pay_config.id IS '配置ID';
COMMENT ON COLUMN salon_tenant_pay_config.tenant_id IS '租户ID';
COMMENT ON COLUMN salon_tenant_pay_config.channel IS '支付渠道（字典 pay_channel：wxpay/alipay/shouqianba/saibe/fuzhangui/manual）';
COMMENT ON COLUMN salon_tenant_pay_config.settle_type IS '结算模式（字典 pay_settle_type：self_merchant直连/aggregate_pull聚合拉单/manual手动）';
COMMENT ON COLUMN salon_tenant_pay_config.enabled IS '是否启用（1=启用 0=停用）';
COMMENT ON COLUMN salon_tenant_pay_config.app_id IS '直连：AppID（微信公众号/小程序或支付宝应用）';
COMMENT ON COLUMN salon_tenant_pay_config.mch_id IS '直连：商户号（微信mch_id/支付宝合作者身份ID）';
COMMENT ON COLUMN salon_tenant_pay_config.api_v3_key IS '直连：微信APIv3密钥（SM4加密存储）';
COMMENT ON COLUMN salon_tenant_pay_config.cert_serial_no IS '直连：商户证书序列号（微信）';
COMMENT ON COLUMN salon_tenant_pay_config.private_key IS '直连：商户/应用私钥PEM全文（SM4加密存储）';
COMMENT ON COLUMN salon_tenant_pay_config.platform_public_key IS '直连：平台公钥（支付宝公钥，SM4加密存储）';
COMMENT ON COLUMN salon_tenant_pay_config.sub_mch_id IS '聚合：服务商商户号/子商户号';
COMMENT ON COLUMN salon_tenant_pay_config.store_no IS '聚合：门店号/终端号';
COMMENT ON COLUMN salon_tenant_pay_config.auth_token IS '聚合：开放平台授权token（SM4加密存储）';
COMMENT ON COLUMN salon_tenant_pay_config.license_object_key IS '营业执照文件MinIO object_key（私有桶）';
COMMENT ON COLUMN salon_tenant_pay_config.cert_object_key IS '证书/密钥文件MinIO object_key（私有桶，如微信apiclient_cert.p12）';
COMMENT ON COLUMN salon_tenant_pay_config.pull_interval_sec IS '聚合拉单间隔（秒，如120）';
COMMENT ON COLUMN salon_tenant_pay_config.status IS '配置状态（字典 pay_config_status：pending待验证/active验证通过/invalid验证失败）';
COMMENT ON COLUMN salon_tenant_pay_config.remark IS '备注';
COMMENT ON COLUMN salon_tenant_pay_config.create_by IS '创建人ID（0=系统）';
COMMENT ON COLUMN salon_tenant_pay_config.create_time IS '创建时间';
COMMENT ON COLUMN salon_tenant_pay_config.update_by IS '更新人ID';
COMMENT ON COLUMN salon_tenant_pay_config.update_time IS '更新时间';
COMMENT ON COLUMN salon_tenant_pay_config.deleted IS '逻辑删除（0=未删除 1=已删除）';

-- ===== 字典 =====
INSERT INTO sys_dict_type (id, name, code, status, remark, group_code, tenant_id, create_by, create_time, update_by, update_time, deleted)
SELECT 9, '支付渠道', 'pay_channel', 1, '租户支付配置渠道', 'system', 1, 0, CURRENT_TIMESTAMP, 0, CURRENT_TIMESTAMP, 0
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_type WHERE code = 'pay_channel' AND tenant_id = 1);
INSERT INTO sys_dict (id, type_code, name, value, sort, status, defaulted, remark, tenant_id)
SELECT v.id, 'pay_channel', v.name, v.value, v.sort, 1, 0, NULL, 1
FROM (VALUES
  (131::int8, '微信支付', 'wxpay',       1),
  (132::int8, '支付宝',   'alipay',      2),
  (133::int8, '收钱吧',   'shouqianba',  3),
  (134::int8, '扫呗',     'saibe',       4),
  (135::int8, '富掌柜',   'fuzhangui',   5),
  (136::int8, '手动录入', 'manual',      6)
) AS v(id, name, value, sort)
WHERE NOT EXISTS (SELECT 1 FROM sys_dict d WHERE d.type_code = 'pay_channel' AND d.value = v.value AND d.tenant_id = 1);

INSERT INTO sys_dict_type (id, name, code, status, remark, group_code, tenant_id, create_by, create_time, update_by, update_time, deleted)
SELECT 10, '支付结算模式', 'pay_settle_type', 1, '租户支付结算模式', 'system', 1, 0, CURRENT_TIMESTAMP, 0, CURRENT_TIMESTAMP, 0
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_type WHERE code = 'pay_settle_type' AND tenant_id = 1);
INSERT INTO sys_dict (id, type_code, name, value, sort, status, defaulted, remark, tenant_id)
SELECT v.id, 'pay_settle_type', v.name, v.value, v.sort, 1, 0, NULL, 1
FROM (VALUES
  (141::int8, '商户直连',   'self_merchant',  1),
  (142::int8, '聚合拉单',   'aggregate_pull', 2),
  (143::int8, '手动录入',   'manual',         3)
) AS v(id, name, value, sort)
WHERE NOT EXISTS (SELECT 1 FROM sys_dict d WHERE d.type_code = 'pay_settle_type' AND d.value = v.value AND d.tenant_id = 1);

INSERT INTO sys_dict_type (id, name, code, status, remark, group_code, tenant_id, create_by, create_time, update_by, update_time, deleted)
SELECT 11, '支付配置状态', 'pay_config_status', 1, '租户支付配置验证状态', 'system', 1, 0, CURRENT_TIMESTAMP, 0, CURRENT_TIMESTAMP, 0
WHERE NOT EXISTS (SELECT 1 FROM sys_dict_type WHERE code = 'pay_config_status' AND tenant_id = 1);
INSERT INTO sys_dict (id, type_code, name, value, sort, status, defaulted, remark, tenant_id)
SELECT v.id, 'pay_config_status', v.name, v.value, v.sort, 1, 0, NULL, 1
FROM (VALUES
  (151::int8, '待验证',   'pending', 1),
  (152::int8, '验证通过', 'active',  2),
  (153::int8, '验证失败', 'invalid', 3)
) AS v(id, name, value, sort)
WHERE NOT EXISTS (SELECT 1 FROM sys_dict d WHERE d.type_code = 'pay_config_status' AND d.value = v.value AND d.tenant_id = 1);

-- 字典租户副本（2084880957290426370，id = 租户1 + 1000）
INSERT INTO sys_dict_type (id, name, code, status, remark, group_code, tenant_id, create_by, create_time, update_by, update_time, deleted)
SELECT d.id + 1000, d.name, d.code, d.status, d.remark, d.group_code, 2084880957290426370, 0, CURRENT_TIMESTAMP, 0, CURRENT_TIMESTAMP, 0
FROM sys_dict_type d
WHERE d.tenant_id = 1 AND d.deleted = 0 AND d.code IN ('pay_channel', 'pay_settle_type', 'pay_config_status')
  AND NOT EXISTS (SELECT 1 FROM sys_dict_type t WHERE t.code = d.code AND t.tenant_id = 2084880957290426370);
INSERT INTO sys_dict (id, type_code, name, value, sort, status, defaulted, remark, tenant_id)
SELECT d.id + 1000, d.type_code, d.name, d.value, d.sort, d.status, d.defaulted, d.remark, 2084880957290426370
FROM sys_dict d
WHERE d.tenant_id = 1 AND d.type_code IN ('pay_channel', 'pay_settle_type', 'pay_config_status')
  AND NOT EXISTS (SELECT 1 FROM sys_dict t WHERE t.type_code = d.type_code AND t.value = d.value AND t.tenant_id = 2084880957290426370);

-- ===== 菜单与授权 =====
INSERT INTO sys_menu (id, parent_id, name, type, path, component, redirect, tree_path, meta, perm, tenant_id, create_by, create_time, update_by, update_time, deleted)
SELECT v.id, v.parent_id, v.name, v.type, v.path, v.component, NULL, v.tree_path, v.meta, NULL, 1, 0, CURRENT_TIMESTAMP, 0, CURRENT_TIMESTAMP, 0
FROM (VALUES
  (170::int8, 19::int8, 'payConfig', 1, 'pay-config', 'biz/pay-config/index', '0,19', '{"title":"支付配置","icon":"credit-card","rank":6,"showLink":true}')
) AS v(id, parent_id, name, type, path, component, tree_path, meta)
WHERE NOT EXISTS (SELECT 1 FROM sys_menu m WHERE m.id = v.id);

INSERT INTO sys_menu (id, parent_id, name, type, path, component, redirect, tree_path, meta, perm, tenant_id, create_by, create_time, update_by, update_time, deleted)
SELECT v.id, v.parent_id, v.name, 4, NULL, NULL, NULL, v.tree_path, v.meta, v.perm, 1, 0, CURRENT_TIMESTAMP, 0, CURRENT_TIMESTAMP, 0
FROM (VALUES
  (194::int8, 170::int8, 'payConfigList',   '0,19,170', '{"title":"查看列表"}',   'biz:pay:config:list'),
  (195::int8, 170::int8, 'payConfigView',   '0,19,170', '{"title":"查看详情"}',   'biz:pay:config:view'),
  (196::int8, 170::int8, 'payConfigAdd',    '0,19,170', '{"title":"新增配置"}',   'biz:pay:config:add'),
  (197::int8, 170::int8, 'payConfigEdit',   '0,19,170', '{"title":"编辑配置"}',   'biz:pay:config:edit'),
  (198::int8, 170::int8, 'payConfigDelete', '0,19,170', '{"title":"删除配置"}',   'biz:pay:config:delete'),
  (199::int8, 170::int8, 'payConfigVerify', '0,19,170', '{"title":"验参自检"}',   'biz:pay:config:verify')
) AS v(id, parent_id, name, tree_path, meta, perm)
WHERE NOT EXISTS (SELECT 1 FROM sys_menu m WHERE m.id = v.id);

-- 店长(role 2)：支付配置全按钮（ROOT 走全菜单授权；资金敏感，店员不授权）
INSERT INTO sys_role_menu (role_id, menu_id, type)
SELECT 2, m.id, 1 FROM sys_menu m
WHERE m.id IN (19, 170, 194, 195, 196, 197, 198, 199)
  AND NOT EXISTS (SELECT 1 FROM sys_role_menu rm WHERE rm.role_id = 2 AND rm.menu_id = m.id AND rm.type = 1);

-- 注意：新增字典种子后须刷新 Redis 字典缓存（重启或字典管理界面保存触发重建）
