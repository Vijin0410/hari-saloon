# P1 会员资产闭环 - 模块设计与落地

> 对应实施计划 `hair-salon-implementation-plan.md` 的 **P1 会员资产闭环**，需求章节 9.3–9.8。
> 数据库：PostgreSQL；表风格对齐现有 `schema.sql`（`int8` 雪花主键、`tenant_id NOT NULL`、`COMMENT ON`、部分唯一索引 `WHERE deleted = 0`）。
> 后端：Spring Boot 3.2 + MyBatis-Plus + MapStruct；前端：React + Vite + TS + Tailwind v4 + Zustand。
> 最后更新：2026-08-06

---

## 1. 设计概览

### 1.1 表清单

| 表 | 职责 | 关系 | 需求 |
|----|------|------|------|
| `salon_member_level` | 会员等级配置（折扣/积分倍率/充值优惠/权益） | 租户级配置 | 9.3 |
| `salon_member_balance` | 会员余额明细（本金/赠送/冻结 + 最近时间 + 乐观锁） | 1:1 `salon_member` | 9.4 |
| `salon_member_balance_log` | 余额流水（每变动必记） | N:1 `salon_member` | 9.5 |
| `salon_member_point_log` | 积分流水（含批次过期） | N:1 `salon_member` | 9.6 |
| `salon_member_tag` | 会员标签字典（租户级） | 租户级配置 | 9.7 |
| `salon_member_tag_rel` | 会员-标签关联 | N:M | 9.7 |
| `salon_member_profile` | 会员结构化备注（发质/偏好/发型师/过敏/禁忌） | 1:1 `salon_member` | 9.8 |

### 1.2 关键决策

1. **等级名不走字典，保留 `salon_member_level.name`（租户级自定义）**。等级是"带配置的实体"（折扣/倍率/权益/门槛），不是纯枚举，`sys_dict` 承载不了配置；该表本身已是租户级，`name` 天然支持每租户自定义卡名（VIP 卡 / 黑金卡）。字典只用于无配置的纯枚举（`member_source` / 余额桶 / 变动类型）。`salon_member` 通过 `level_id` join 取名，不冗余等级名。
2. **余额独立成表（不下沉 member）**：余额是高频更新资产，与低频档案分离以减小锁面；字段较多；流水需明确余额主体。`salon_member.balance` / `points` **保留为冗余**（可用总余额 = 本金 + 赠送 - 冻结 / 可用总积分），由 service 同事务同步，列表查询免 join。
3. **本金 / 赠送分桶 + 流水分行**：`salon_member_balance` 用 `principal_balance` / `gift_balance` / `frozen_balance` 三桶；一次充值（本金 +500、赠送 +50）产生 **两条** 流水（各桶各记变动前/额/后），满足 9.5「充值 / 充值赠送」分类型，且为 P8 财务对账（本金计预收款、赠送不计营收）打底。
4. **乐观锁**：`salon_member_balance.version`，配合 MyBatis-Plus `@Version` 防并发超扣。
5. **积分流水兼作批次**：获得类流水带 `expire_time` + `remaining_points`，消费/过期时通过 `source_log_id` 指向被扣批次，FIFO 扣减。无需单独批次表即可支持「过期清零」（9.6）。
6. **`member.level` -> `member.level_id`**：原 `level int4`（字典序号）改为 `level_id int8` 外键关联 `salon_member_level`，支撑等级配置化。
7. **结构化备注独立 `salon_member_profile`**：避免 `salon_member` 字段膨胀，便于后续扩展。
8. **流水冗余 `store_id`**：余额/积分流水带 `store_id`，便于门店数据权限过滤与 P8 门店维度统计。
9. **余额/积分禁止走会员表单**：`MemberForm` 移除 `balance` / `points`，只能通过流水接口（调整/充值/消费）变动，保证每笔变动可追溯（9.5/9.6）。

### 1.3 §5 待确认问题对设计的影响

| 待确认项 | 影响阶段 | 对 P1 表结构的影响 |
|----------|----------|-------------------|
| 消费扣款优先扣本金还是赠送 | P1 扣减 / P6 退款 | **无影响**。两桶分记，扣减顺序是 service 逻辑，流水按桶记录即可双向表达 |
| 退款时本金/赠送如何退回 | P6 | **无影响**。退款退回走 `change_type=退款退回` 流水，退到哪桶由 P6 规则定 |
| 赠送余额消费是否计提成 | P7 | **无影响**。流水已区分桶，P7 按桶统计即可 |

> 结论：P1 表结构不依赖 §5 任一待确认项的拍板，可先行落地。扣减顺序/退款规则/提成口径均在 service 层实现，不动表。

---

## 2. DDL（新表 + member 改造）

> 新库：追加到 `hair-salon-boot/src/main/resources/schema.sql` 末尾。
> 存量库：见 §3 迁移脚本。

### 2.1 会员等级配置

```sql
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
```

### 2.2 会员余额

```sql
-- 会员余额（1:1 salon_member；本金/赠送/冻结分桶 + 乐观锁）
-- 可用总余额 = principal_balance + gift_balance - frozen_balance（不落库，计算或冗余到 member.balance）
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
```

### 2.3 余额流水

```sql
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
```

### 2.4 积分流水

```sql
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
COMMENT ON COLUMN salon_member_point_log.expire_time IS '过期时间（仅获得类有效，标识该批次过期点）';
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
```

### 2.5 会员标签

```sql
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
```

### 2.6 会员结构化备注

```sql
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
```

### 2.7 salon_member 改造

原 `level int4 DEFAULT 0` -> `level_id int8`（关联 `salon_member_level.id`）。`balance` / `points` 保留为冗余可用值。

```sql
-- 新库 schema.sql 中 salon_member 建表把：
--   level     int4     DEFAULT 0,
-- 改为：
--   level_id  int8,
-- 并替换其 COMMENT：
COMMENT ON COLUMN salon_member.level_id IS '会员等级ID（关联salon_member_level，空=普通，建档时由service填默认等级）';
COMMENT ON COLUMN salon_member.balance IS '可用总余额（冗余=本金+赠送-冻结，真源在salon_member_balance）';
COMMENT ON COLUMN salon_member.points IS '可用总积分（冗余，真源由salon_member_point_log汇总）';
```

---

## 3. 存量库迁移脚本

> 文件：`sql/migrate-p1-member-asset.sql`（`sql.init.mode=never`，存量库手工执行；幂等）。

```sql
-- ===== P1 会员资产闭环迁移 =====

-- 1) salon_member: level int4 -> level_id int8
ALTER TABLE salon_member ALTER COLUMN level DROP DEFAULT;
ALTER TABLE salon_member ALTER COLUMN level TYPE int8 USING level::int8;
ALTER TABLE salon_member RENAME COLUMN level TO level_id;
COMMENT ON COLUMN salon_member.level_id IS '会员等级ID（关联salon_member_level，空=普通，建档时由service填默认等级）';
COMMENT ON COLUMN salon_member.balance IS '可用总余额（冗余=本金+赠送-冻结，真源在salon_member_balance）';
COMMENT ON COLUMN salon_member.points IS '可用总积分（冗余，真源由salon_member_point_log汇总）';

-- 2) 建新表（执行 §2.1–§2.6 全部 CREATE TABLE / INDEX / COMMENT）

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

-- 5) 执行 §4 种子（等级/标签/字典/权限）
```

---

## 4. 种子数据

> 新库：追加到 `hair-salon-boot/src/main/resources/data.sql`。
> 存量库：并入 §3 迁移脚本。
> 字典按租户隔离（提交 5c49807）：新增字典类型需同步到「新租户字典种子模板」，否则新开租户缺该字典。

### 4.1 会员等级（默认租户 1 预置）

```sql
INSERT INTO salon_member_level (id, tenant_id, name, level_no, service_discount, goods_discount, point_rate, recharge_gift_rate, sort, status, create_by, create_time, update_by, update_time, deleted)
SELECT v.id, 1, v.name, v.level_no, v.service_discount, v.goods_discount, v.point_rate, v.recharge_gift_rate, v.level_no, 1, 0, CURRENT_TIMESTAMP, 0, CURRENT_TIMESTAMP, 0
FROM (VALUES
  (1001::int8, '普通会员', 0, 1.00, 1.00, 1.00, 0.00),
  (1002::int8, '银卡会员', 1, 0.95, 0.95, 1.00, 0.05),
  (1003::int8, '金卡会员', 2, 0.90, 0.90, 1.20, 0.10),
  (1004::int8, '钻石会员', 3, 0.85, 0.85, 1.50, 0.15)
) AS v(id, name, level_no, service_discount, goods_discount, point_rate, recharge_gift_rate)
WHERE NOT EXISTS (SELECT 1 FROM salon_member_level l WHERE l.id = v.id);
```

### 4.2 会员标签（默认租户 1 预置）

```sql
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
```

### 4.3 字典（默认租户 1）

```sql
-- member_source 会员来源
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

-- member_balance_type 余额桶
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

-- balance_change_type 余额变动类型
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

-- point_change_type 积分变动类型
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
```

### 4.4 菜单与权限种子

> ID 段：等级菜单 11 + 按钮 111–115；标签菜单 12 + 按钮 121–125；会员余额/积分按钮 106–110（挂会员菜单 10）。

```sql
-- 菜单：会员等级配置 / 会员标签管理（type=1，挂会员菜单 10 下）
INSERT INTO sys_menu (id, parent_id, name, type, path, component, redirect, tree_path, meta, perm, tenant_id, create_by, create_time, update_by, update_time, deleted)
SELECT v.id, v.parent_id, v.name, v.type, v.path, v.component, NULL, v.tree_path, v.meta, NULL, 1, 0, CURRENT_TIMESTAMP, 0, CURRENT_TIMESTAMP, 0
FROM (VALUES
  (11::int8, 10::int8, 'memberLevel', 1, 'level', 'biz/member/level/index', '0,8,10', '{"title":"会员等级","icon":"medal","rank":3,"showLink":true}'),
  (12::int8, 10::int8, 'memberTag',   1, 'tag',   'biz/member/tag/index',   '0,8,10', '{"title":"会员标签","icon":"tag","rank":4,"showLink":true}')
) AS v(id, parent_id, name, type, path, component, tree_path, meta)
WHERE NOT EXISTS (SELECT 1 FROM sys_menu m WHERE m.id = v.id);

-- 按钮（type=4）
INSERT INTO sys_menu (id, parent_id, name, type, path, component, redirect, tree_path, meta, perm, tenant_id, create_by, create_time, update_by, update_time, deleted)
SELECT v.id, v.parent_id, v.name, 4, NULL, NULL, NULL, v.tree_path, v.meta, v.perm, 1, 0, CURRENT_TIMESTAMP, 0, CURRENT_TIMESTAMP, 0
FROM (VALUES
  -- 会员等级 biz:memberLevel:*
  (111::int8, 11::int8, 'memberLevelList',   '0,8,10,11', '{"title":"查看列表"}', 'biz:memberLevel:list'),
  (112::int8, 11::int8, 'memberLevelView',   '0,8,10,11', '{"title":"查看详情"}', 'biz:memberLevel:view'),
  (113::int8, 11::int8, 'memberLevelAdd',    '0,8,10,11', '{"title":"新增等级"}', 'biz:memberLevel:add'),
  (114::int8, 11::int8, 'memberLevelEdit',   '0,8,10,11', '{"title":"编辑等级"}', 'biz:memberLevel:edit'),
  (115::int8, 11::int8, 'memberLevelDelete', '0,8,10,11', '{"title":"删除等级"}', 'biz:memberLevel:delete'),
  -- 会员标签 biz:memberTag:*
  (121::int8, 12::int8, 'memberTagList',   '0,8,10,12', '{"title":"查看列表"}', 'biz:memberTag:list'),
  (122::int8, 12::int8, 'memberTagView',   '0,8,10,12', '{"title":"查看详情"}', 'biz:memberTag:view'),
  (123::int8, 12::int8, 'memberTagAdd',    '0,8,10,12', '{"title":"新增标签"}', 'biz:memberTag:add'),
  (124::int8, 12::int8, 'memberTagEdit',   '0,8,10,12', '{"title":"编辑标签"}', 'biz:memberTag:edit'),
  (125::int8, 12::int8, 'memberTagDelete', '0,8,10,12', '{"title":"删除标签"}', 'biz:memberTag:delete'),
  -- 会员余额/积分（挂会员菜单 10）
  (106::int8, 10::int8, 'memberBalanceAdjust', '0,8,10', '{"title":"余额调整"}', 'biz:memberBalance:adjust'),
  (107::int8, 10::int8, 'memberBalanceLog',    '0,8,10', '{"title":"余额流水"}', 'biz:memberBalance:log'),
  (108::int8, 10::int8, 'memberPointAdjust',   '0,8,10', '{"title":"积分调整"}', 'biz:memberPoint:adjust'),
  (109::int8, 10::int8, 'memberPointLog',      '0,8,10', '{"title":"积分流水"}', 'biz:memberPoint:log'),
  (110::int8, 10::int8, 'memberTagRel',        '0,8,10', '{"title":"会员打标签"}', 'biz:member:tag')
) AS v(id, parent_id, name, tree_path, meta, perm)
WHERE NOT EXISTS (SELECT 1 FROM sys_menu m WHERE m.id = v.id);

-- 店长(role 2)：等级全 + 标签全 + 余额/积分调整 + 流水查看 + 打标签
INSERT INTO sys_role_menu (role_id, menu_id, type)
SELECT 2, m.id, 1 FROM sys_menu m
WHERE m.id IN (11, 111, 112, 113, 114, 115,
               12, 121, 122, 123, 124, 125,
               106, 107, 108, 109, 110)
  AND NOT EXISTS (SELECT 1 FROM sys_role_menu rm WHERE rm.role_id = 2 AND rm.menu_id = m.id AND rm.type = 1);

-- 店员(role 3)：打标签 + 余额/积分流水查看（不含余额/积分调整）
INSERT INTO sys_role_menu (role_id, menu_id, type)
SELECT 3, m.id, 1 FROM sys_menu m
WHERE m.id IN (110, 107, 109)
  AND NOT EXISTS (SELECT 1 FROM sys_role_menu rm WHERE rm.role_id = 3 AND rm.menu_id = m.id AND rm.type = 1);
```

> ROOT（role 1）挂全部菜单由现有 `SELECT 1, m.id, 1 FROM sys_menu m` 自动覆盖，无需额外处理。

---

## 5. 与第三方支付的衔接（前瞻，避免 P4/P5 返工）

### 5.1 分层原则

| 层 | 表 | 职责 | 单号 |
|----|----|------|------|
| 资产流水层 | `salon_member_balance_log` / `salon_member_point_log` | 会员资产桶变动追溯 | 只存**系统业务单号**（`biz_no`） |
| 支付明细层（P4/P5 建） | `salon_recharge_payment` / `salon_order_payment` | 支付方式 + 第三方单号 | `out_trade_no` / `transaction_id` / `trade_no` / `refund_no` |

**余额/积分流水不接触第三方单号**。对账时链式追溯：

```
balance_log.biz_id ──> recharge_order / order ──> xxx_payment ──> 第三方单号
```

### 5.2 当前 `balance_log` 字段兼容性

| 字段 | 用途 | 是否需改 |
|------|------|----------|
| `biz_type varchar(32)` | 业务单据类型（RECHARGE/ORDER/REFUND/MANUAL/TRANSFER），多态鉴别器 | 否 |
| `biz_id int8` | 系统业务单据 ID（充值单/订单/退款单） | 否 |
| `biz_no varchar(64)` | 系统业务单号（≤32 位，兼容作 `out_trade_no`） | 否 |

### 5.3 三点前置约定

1. **`biz_no` 保持纯净**：只存系统业务单号，不冗余 `transaction_id`。否则同一笔充值的第三方单号在「流水」和「支付明细」双写，退款重试/换渠道重付会让一致性维护爆炸。**分层 > 冗余**。
2. **P10 编号规则兼容 `out_trade_no`**：系统单号若复用为商户订单号（推荐），需满足 **微信 `out_trade_no` ≤ 32 位、仅字母数字、全局唯一**。建议格式 `RC26080614300001`（前缀+YYMMDD+序号，≤18 位），可同时作系统单号与 `out_trade_no`，免维护两套。
3. **回调不直接写流水**：第三方回调只更新支付明细/业务单据状态；余额变动由 service 在「业务单据置为已支付」时事务内写入。流水始终由业务驱动，不由支付通道驱动。

### 5.4 P4/P5 支付明细表字段预留（仅约定，P1 不建）

```
out_trade_no      varchar(32)   -- 商户订单号（系统生成，传第三方）
transaction_id    varchar(64)   -- 微信交易号（第三方返回，支付宝用 trade_no 同字段或另列）
refund_no         varchar(32)   -- 商户退款单号
refund_id         varchar(64)   -- 第三方退款单号
pay_status        int4          -- 支付状态
pay_time          timestamp
callback_raw      jsonb         -- 回调原始报文（对账/排查）
```

> 第三方单号长度边界：微信 `transaction_id` 28 位、支付宝 `trade_no` 64 位 → 统一 `varchar(64)`。

---

## 6. 后端接口与模型设计

### 6.1 接口路由清单

> 路径遵循规范：业务 `/api/v1/...`；`{id}` 居中（`/{id}/detail` `/{id}/update` `/{id}/adjust`），新增 `POST /add`，删除批量 `/delete?ids=`；子资源用 `/{id}/子资源`（如 `/{id}/tags`）。

#### 6.1.1 会员等级 `/api/v1/member-levels`

| 方法 | 路径 | perm | 说明 |
|------|------|------|------|
| GET | `/page` | `biz:memberLevel:list` | 等级分页 |
| GET | `/{id}/detail` | `biz:memberLevel:view` | 等级详情 |
| POST | `/add` | `biz:memberLevel:add` | 新增等级 |
| PUT | `/{id}/update` | `biz:memberLevel:edit` | 修改等级 |
| DELETE | `/delete?ids=` | `biz:memberLevel:delete` | 删除等级 |
| GET | `/options` | `isAuthenticated()` | 等级下拉（会员建档/筛选用） |

#### 6.1.2 会员标签 `/api/v1/member-tags`

| 方法 | 路径 | perm | 说明 |
|------|------|------|------|
| GET | `/page` | `biz:memberTag:list` | 标签分页 |
| GET | `/{id}/detail` | `biz:memberTag:view` | 标签详情 |
| POST | `/add` | `biz:memberTag:add` | 新增标签 |
| PUT | `/{id}/update` | `biz:memberTag:edit` | 修改标签 |
| DELETE | `/delete?ids=` | `biz:memberTag:delete` | 删除标签 |
| GET | `/options` | `isAuthenticated()` | 标签下拉 |

#### 6.1.3 会员主表 `/api/v1/members`（改造现有）

| 方法 | 路径 | perm | 说明 |
|------|------|------|------|
| GET | `/page` | `biz:member:list` | 分页（加 `levelId`/`tagId` 筛选，列加 `levelName`/`tagNames`） |
| GET | `/{id}/detail` | `biz:member:view` | 详情（扩充余额明细 + 标签 + 备注） |
| POST | `/add` | `biz:member:add` | 新增（建档同步建 `balance` 记录，默认普通等级） |
| PUT | `/{id}/update` | `biz:member:edit` | 修改（表单**不含** balance/points） |
| DELETE | `/delete?ids=` | `biz:member:delete` | 删除 |
| GET | `/{id}/tags` | `biz:member:view` | 查会员已标签 |
| PUT | `/{id}/tags` | `biz:member:tag` | 全量设置会员标签（body: `tagIds[]`） |
| PUT | `/{id}/profile` | `biz:member:edit` | 编辑结构化备注（`{id}`=memberId） |

#### 6.1.4 会员余额 `/api/v1/members/balance`

| 方法 | 路径 | perm | 说明 |
|------|------|------|------|
| GET | `/{id}/detail` | `biz:member:view` | 余额明细（本金/赠送/冻结/可用/最近时间，`{id}`=memberId） |
| GET | `/logs/page` | `biz:memberBalance:log` | 余额流水分页（按 `memberId`/`store_id`/时间筛选） |
| POST | `/{id}/adjust` | `biz:memberBalance:adjust` | 手工调整（`{id}`=memberId，`@PreventDuplicateResubmit`） |

#### 6.1.5 会员积分 `/api/v1/members/points`

| 方法 | 路径 | perm | 说明 |
|------|------|------|------|
| GET | `/logs/page` | `biz:memberPoint:log` | 积分流水分页 |
| POST | `/{id}/adjust` | `biz:memberPoint:adjust` | 手工调整（`{id}`=memberId，`@PreventDuplicateResubmit`） |

### 6.2 模型设计

#### 6.2.1 等级

- `MemberLevelForm`：name(必填) / levelNo(必填) / serviceDiscount / goodsDiscount / pointRate / rechargeGiftRate / upgradeThreshold / rights(String JSON) / sort / status / remark
- `MemberLevelPageVO`：id / name / levelNo / serviceDiscount / goodsDiscount / pointRate / rechargeGiftRate / upgradeThreshold / sort / status / createTime
- `MemberLevelOptionVO`：id / name / levelNo / serviceDiscount / goodsDiscount / pointRate

#### 6.2.2 标签

- `MemberTagForm`：name(必填) / color / sort / status / remark
- `MemberTagVO`：id / name / color / sort / status / remark / createTime
- `MemberTagOptionVO`：id / name / color

#### 6.2.3 会员（改造）

- `MemberForm`（改）：移除 `balance` / `points`；`level: Integer` → `levelId: Long`
- `MemberPageVO`（改）：`level: Integer` → `levelId: Long` + `levelName: String`；保留 `balance`(可用总额) / `points`；新增 `tagNames: List<String>`；`source` 加 `@Dict(dictCode="member_source")`
- `MemberDetailVO`（改）：`levelId` + `levelName`；新增 `balance: MemberBalanceVO`（明细） / `tags: List<MemberTagOptionVO>` / `profile: MemberProfileVO`
- `MemberPageQuery`（改）：新增 `levelId: Long` / `tagId: Long`
- `MemberProfileVO`：hairQuality / preferredStyle / preferredStylistId / preferredStylistName / allergy / taboo / remark
- `MemberProfileForm`：hairQuality / preferredStyle / preferredStylistId / allergy / taboo / remark

#### 6.2.4 余额

- `MemberBalanceVO`：principalBalance / giftBalance / frozenBalance / availableBalance(计算) / lastRechargeTime / lastConsumeTime
- `MemberBalanceLogVO`：id / memberId / balanceType(`@Dict(member_balance_type)`) / changeType(`@Dict(balance_change_type)`) / beforeAmount / changeAmount / afterAmount / bizNo / operatorName / remark / createTime
- `MemberBalanceAdjustForm`：balanceType(1本金/2赠送/3冻结) / changeAmount(可正可负) / remark(必填)

#### 6.2.5 积分

- `MemberPointLogVO`：id / memberId / changeType(`@Dict(point_change_type)`) / beforePoints / changePoints / afterPoints / expireTime / bizNo / operatorName / remark / createTime
- `MemberPointAdjustForm`：changePoints(可正可负) / expireTime(获得类可选) / remark(必填)

### 6.3 Service 关键逻辑（核心交付，P4/P5 复用）

> 余额/积分变动是 P1 的核心能力，P4 充值 / P5 消费 / P6 退款均调用以下通用方法，确保每笔变动有流水、并发安全、冗余同步。

```java
// MemberAssetService（新增，会员资产领域服务）
public interface MemberAssetService {

    /** 余额变动（通用）。changeAmount 正增负减。事务内：更新 balance + 插流水 + 同步 member.balance */
    void changeBalance(Long memberId, int balanceType, BigDecimal changeAmount,
                       int changeType, String bizType, Long bizId, String bizNo, String remark);

    /** 积分变动（通用）。changePoints 正增负减；获得类带 expireTime，FIFO 扣减。事务内：插流水 + 同步 member.points */
    void changePoints(Long memberId, int changePoints, int changeType,
                      String bizType, Long bizId, String bizNo,
                      LocalDateTime expireTime, String remark);
}
```

实现要点：
- `changeBalance`：`@Transactional(rollbackFor)`；`@Version` 乐观锁，失败重试 2–3 次，仍失败抛 `BizException("余额变动并发冲突")`；变动前金额从 `balance` 表读，校验变动后 `>= 0`（冻结桶允许？由调用方约束）；写 `balance_log`；按 `changeType` 更新 `last_recharge_time`/`last_consume_time`；重算 `member.balance = principal + gift - frozen` 同步。
- `changePoints`：获得类（changePoints>0）插一条批次流水（`remaining_points = change_points`，`expire_time` 赋值）；扣减类（changePoints<0）按 FIFO 扫描该会员 `remaining_points > 0` 的获得批次，逐条扣减 `remaining_points` 并写消费流水（`source_log_id` 指向被扣批次），扣完为止；同步 `member.points`。
- 操作人：`SecurityUtils.getCurrentUserId()`；门店：从会员档案取 `store_id` 写流水。
- 扣减顺序（本金 vs 赠送）：**P1 手工调整由调用方指定 `balanceType`**；P5 消费扣款的默认顺序待 §5.1 拍板，落 `MemberAssetService.consumeBalance()` 时实现，不影响表。

### 6.4 建档流程（SalonMemberServiceImpl 改造）

```
saveMember(form):
  1. assertStoreAssignable(form.storeId)
  2. entity = form2Entity(form); levelId 空 -> 查本租户 level_no=0 普通等级填入
  3. save(member) -> 拿 memberId
  4. 同事务 insert salon_member_balance (member_id, principal=0, gift=0, frozen=0, version=0)
  5. (可选) insert salon_member_profile 空记录，或 detail 时懒建
```

---

## 7. 前端落地

### 7.1 目录与约定（对齐现有）

| 关注点 | 位置 | 约定 |
|--------|------|------|
| 页面 | `src/pages/XxxPage.tsx` | 组合 UI + 调 API |
| API 模块 | `src/shared/api/modules/memberApi.ts`（**新建**，从 `systemApi.ts` 抽出 member 域） | 每资源一个对象，方法 `list/detail/create/update/remove/options` |
| 类型 | `src/features/member/model/memberTypes.ts`（**新建**） | VO/Query/FormPayload |
| 通用组件 | `src/shared/ui/` | Button/Input/Modal/Field/Select/Badge/ConfirmDialog/EmptyState/PageLoading |
| 权限 | `useAuthStore.hasPermission(perm)` | 按钮显隐 |
| 租户/门店筛选 | `useTenantStoreFilter` | 列表顶部筛选 |
| 字典下拉 | `dictApi.options(typeCode)` | `member_source` 等 |
| HTTP | `get/post/put/patch/deleteRequest` | 已封装 `unwrapResponse` |

> 路由：菜单种子已配 `biz/member/level/index`、`biz/member/tag/index`，前端按 `router/index.tsx` 现有模式注册 `MemberLevelPage` / `MemberTagPage`。

### 7.2 页面规划

| 页面 | 路由 | 复用 | 说明 |
|------|------|------|------|
| `MemberPage`（改造） | `/biz/member` | 现有 | 列表加等级名/积分/标签列；表单去 balance/points、level 改下拉、source 改字典下拉；新增「详情」抽屉 |
| `MemberLevelPage`（新） | `/biz/member/level` | StorePage 范本 | 等级 CRUD |
| `MemberTagPage`（新） | `/biz/member/tag` | StorePage 范本 | 标签 CRUD |
| 会员详情抽屉 | MemberPage 内 | - | Tabs：基础 / 余额(含调整+流水) / 积分(含调整+流水) / 标签 / 备注 |

### 7.3 API 模块设计（`memberApi.ts`）

```ts
export const memberLevelApi = {
  list, detail, create, update, remove, options
};
export const memberTagApi = {
  list, detail, create, update, remove, options
};
export const memberApi = {
  list, detail, create, update, remove,
  tags(id): GET /v1/members/{id}/tags
  setTags(id, tagIds): PUT /v1/members/{id}/tags
  profile(id): GET /v1/members/{id}/profile        // 或并入 detail
  updateProfile(id, payload): PUT /v1/members/{id}/profile
};
export const memberBalanceApi = {
  detail(id): GET /v1/members/balance/{id}/detail
  logs(params): GET /v1/members/balance/logs/page
  adjust(id, payload): POST /v1/members/balance/{id}/adjust
};
export const memberPointApi = {
  logs(params): GET /v1/members/points/logs/page
  adjust(id, payload): POST /v1/members/points/{id}/adjust
};
```

### 7.4 各表前端展示与交互

#### 7.4.1 `salon_member_level` — 会员等级页

- **列表列**：等级名 / 序号 / 服务折扣 / 商品折扣 / 积分倍率 / 充值赠送率 / 升级门槛 / 排序 / 状态(Badge) / 操作(编辑·删除)
- **表单**：name(Input 必填) / levelNo(Input number 必填) / serviceDiscount / goodsDiscount / pointRate / rechargeGiftRate / upgradeThreshold / sort / status(Select) / remark；`rights` MVP 用 Textarea 存 JSON 字符串（后续可换键值编辑器）
- **下拉来源**：建档/筛选用 `memberLevelApi.options()` → `{value: id, label: name}`
- **权限**：新增 `biz:memberLevel:add` / 编辑 `:edit` / 删除 `:delete`

#### 7.4.2 `salon_member_balance` — 会员详情「余额」Tab

- **展示卡片**：本金余额 / 赠送余额 / 冻结金额 / **可用总余额**（=本金+赠送-冻结，加粗） / 最近充值时间 / 最近消费时间
- **操作**：「余额调整」按钮（`biz:memberBalance:adjust`）→ Modal：余额桶(Select: 本金/赠送/冻结) + 变动额(Input, 可负) + 备注(必填) → `memberBalanceApi.adjust`
- **数据来源**：`memberBalanceApi.detail(memberId)` 或并入 `memberApi.detail` 的 `balance` 字段

#### 7.4.3 `salon_member_balance_log` — 会员详情「余额流水」

- **表格列**：时间 / 余额桶(Badge, `@Dict member_balance_type`) / 业务类型(`@Dict balance_change_type`) / 变动前 / 变动额(正绿负红) / 变动后 / 关联单号(可点跳业务单) / 操作人 / 备注
- **筛选**：桶 / 业务类型 / 时间范围
- **权限**：`biz:memberBalance:log`
- **后端**：`@QueryDict` 一次翻译桶/类型两个字典

#### 7.4.4 `salon_member_point_log` — 会员详情「积分」Tab

- **展示**：可用总积分（`member.points`）
- **操作**：「积分调整」按钮（`biz:memberPoint:adjust`）→ Modal：变动额(可负) + 过期时间(增加时可选) + 备注(必填) → `memberPointApi.adjust`
- **流水表格列**：时间 / 变动类型(`@Dict point_change_type`) / 变动前 / 变动额 / 变动后 / 过期时间 / 关联单号 / 操作人 / 备注
- **权限**：`biz:memberPoint:log`

#### 7.4.5 `salon_member_tag` — 会员标签页

- **列表列**：标签名 / 颜色(色块预览) / 排序 / 状态 / 操作
- **表单**：name(Input 必填) / color(颜色选择器或预设色板 Input) / sort / status / remark
- **下拉来源**：`memberTagApi.options()` → `{value: id, label: name, color}`

#### 7.4.6 `salon_member_tag_rel` — 会员详情「标签」区

- **展示**：会员已有标签，用 `<Badge>` 带色块渲染（`tag.color`）
- **操作**：「编辑标签」按钮（`biz:member:tag`）→ Modal：复选标签列表（来自 `memberTagApi.options()`，回显已选）→ `memberApi.setTags(id, tagIds)`（全量提交）
- **列表页标签列**：`MemberPageVO.tagNames` 直接渲染色块 Badge（不超过 N 个 + `+N`）

#### 7.4.7 `salon_member_profile` — 会员详情「备注」区

- **展示**：发质 / 偏好发型 / 常用发型师(显示 `preferredStylistName`) / 过敏信息 / 服务禁忌 / 扩展备注
- **操作**：「编辑备注」按钮（`biz:member:edit`）→ Modal：hairQuality / preferredStyle / preferredStylistId(Select 用户下拉，复用 `userApi.list`) / allergy / taboo / remark(Textarea) → `memberApi.updateProfile`

#### 7.4.8 `salon_member` — 会员管理页（改造）

- **列表列**：姓名 / 手机 / 门店 / **等级(levelName)** / **余额(可用总额)** / **积分** / **标签(色块)** / 状态 / 操作(详情·编辑·删除)
- **筛选**：关键词 + 门店 + **等级下拉** + **标签下拉** + 状态
- **新增/编辑表单**：name / phone / gender / birthday / **levelId(下拉)** / **source(字典下拉 member_source)** / status / remark / storeId（**移除 balance/points**）
- **详情抽屉**：5 个 Tab（基础信息 / 余额 / 积分 / 标签 / 备注），各 Tab 见 7.4.2–7.4.7
- **detail 类型**：前端 `memberApi.detail` 返回类型由 `MemberFormPayload` 改为 `MemberDetailVO`

---

## 8. 现状改造点（P1 对现有代码的必改项）

### 8.1 后端

| 文件 | 改造 |
|------|------|
| `SalonMember` entity | `level: Integer` → `levelId: Long`（`@TableField` 默认即可） |
| `MemberForm` | **删除** `balance` / `points`；`level: Integer` → `levelId: Long` |
| `MemberPageVO` | `level` → `levelId` + `levelName`；`source` 加 `@Dict(dictCode="member_source")`；新增 `tagNames: List<String>` |
| `MemberDetailVO` | `levelId` + `levelName`；新增 `balance: MemberBalanceVO` / `tags: List<MemberTagOptionVO>` / `profile: MemberProfileVO` |
| `MemberPageQuery` | 新增 `levelId: Long` / `tagId: Long` |
| `MemberConverter` | `entity2PageVo` 后补充 `levelName` 装配（按 `levelId` 批量查等级）；`entity2DetailVo` 补充 balance/tags/profile 装配；`form2Entity` 去掉 balance/points 映射 |
| `SalonMemberMapper.xml` | `getMemberPage` 加 `levelName`（left join `salon_member_level`）+ `tagId` 筛选（exists `salon_member_tag_rel`）+ `levelId` 筛选 |
| `SalonMemberServiceImpl` | `saveMember`：默认 `levelId` 指向普通等级（非 0）；建档同步建 `salon_member_balance`；移除 `setBalance/setPoints` 默认值（改由 balance 表） |
| 新增 | `SalonMemberLevel` / `SalonMemberBalance`(`@Version`) / `SalonMemberBalanceLog` / `SalonMemberPointLog` / `SalonMemberTag` / `SalonMemberTagRel` / `SalonMemberProfile` 七个 entity（均 `extends BaseTenantEntity<Long>`）+ 对应 Mapper/Service/Controller/Converter/Form/VO/Query |

### 8.2 前端

| 文件 | 改造 |
|------|------|
| `systemApi.ts` | 将 `memberApi` 及其类型迁出；新增 `memberLevelApi` / `memberTagApi` / `memberBalanceApi` / `memberPointApi` |
| `memberTypes.ts`（新） | `MemberPageVO` 加 `levelId/levelName/tagNames`；`MemberFormPayload` **删 `balance/points`**，`level` → `levelId`；`MemberDetailVO` 加 balance/tags/profile；新增等级/标签/余额/积分 VO/Form/Query |
| `MemberPage.tsx` | 表单去 balance/points；level 改下拉（`memberLevelApi.options`）；source 改字典下拉（`dictApi.options('member_source')`）；列表等级列显示 `levelName`、加积分/标签列；加「详情」抽屉 |
| `MemberLevelPage.tsx`（新） | 仿 `StorePage` |
| `MemberTagPage.tsx`（新） | 仿 `StorePage`，颜色色块预览 |
| `router/index.tsx` | 注册 `/biz/member/level`、`/biz/member/tag` 路由 |

### 8.3 迁移与种子

| 项 | 动作 |
|----|------|
| `schema.sql` | 追加 §2.1–§2.6 建表；§2.7 member `level`→`level_id` |
| `data.sql` | 追加 §4.1–§4.4 种子 |
| `sql/migrate-p1-member-asset.sql` | 新建，§3 全文 |
| 新租户字典种子模板 | 同步 4 类新字典（`member_source` / `member_balance_type` / `balance_change_type` / `point_change_type`），参考提交 5c49807 机制 |
| 新租户开通流程 | 预置「普通会员」等级（`level_no=0`），供建档默认引用 |

---

## 9. 落地检查清单

- [ ] §2 DDL 落 `schema.sql` + §3 `sql/migrate-p1-member-asset.sql`
- [ ] §4 种子落 `data.sql`（等级/标签/字典/权限）+ 角色授权
- [ ] 新租户字典种子模板同步 4 类字典
- [ ] 新租户开通预置普通等级
- [ ] 7 个新 entity + `SalonMember.levelId` 改造
- [ ] Mapper XML：`getMemberPage` 加 levelName/tagId/levelId
- [ ] 5 组 Controller（level / tag / balance / point / member 改造 + profile）
- [ ] `MemberAssetService.changeBalance` / `changePoints` 通用方法（乐观锁 + 流水 + 冗余同步）
- [ ] `saveMember` 建档同步建 balance 记录 + 默认等级
- [ ] `MemberForm` 去 balance/points；VO/Query 补 levelId/levelName/tagNames/tags/profile
- [ ] 前端 `memberApi.ts` 拆分 + `memberTypes.ts` 新建
- [ ] `MemberPage` 改造（表单去余额积分、等级下拉、source 字典、详情抽屉）
- [ ] `MemberLevelPage` / `MemberTagPage` 新建 + 路由注册
- [ ] 每个对外方法 `@PreAuthorize` + `@Operation`；写接口 `@PreventDuplicateResubmit`
- [ ] VO 字段 `@Schema`；Entity 字段 Javadoc；含义与 SQL COMMENT 一致
- [ ] 验收：26.2 会员验收（余额分桶展示 + 每变动有流水 + 等级/标签/备注可用）
