# hair-salon

理发店管理系统（单体多模块），依赖外部底层包 `wj-framework`。

## 模块

```text
hair-salon/
├── hair-salon-boot      # 启动模块（唯一 main）
├── hair-salon-system    # 用户 / 角色 / 菜单 / 部门 / 字典
├── hair-salon-auth      # 登录 / 当前用户
└── hair-salon-service   # 业务（会员、门店、充值消费等）
```

| 模块 | 职责 |
|------|------|
| **boot** | 启动、yml、打包、schema/data |
| **system** | 系统管理：用户/角色/菜单/部门/字典 + Redis 缓存 |
| **auth** | 认证接口（登录灌入 roles/perms） |
| **service** | 业务功能（不是微服务，只是业务模块名） |

命名说明：业务模块用 `service`，避免 `biz`；也不同于整个「管理端应用」常叫的 admin。

## 前置

1. JDK 17+
2. 本地已 `mvn install` 安装 `wj-framework`（`1.0.0-SNAPSHOT`）

```bash
cd ../wj-framework
mvn clean install -DskipTests
```

## 环境依赖

| 组件 | 说明 |
|------|------|
| JDK 17+ | 编译运行 |
| PostgreSQL | 库名 `hair_salon`（需先创建） |
| Redis | localhost:6379，密码见 yml |
| MinIO | 对象存储；本地 Docker 见 `../wj-framework/docs/minio-deploy.md`（API 9000 / 控制台 9001） |
| wj-framework | 本地 `mvn install`（含 `common-minio`） |

## 启动

```bash
# 1. 创建数据库（仅一次）
# CREATE DATABASE hair_salon;

# 2. 编译
cd hair-salon
mvn clean package -DskipTests

# 3. 运行
java -jar hair-salon-boot/target/hair-salon-boot-1.0.0-SNAPSHOT.jar
```

或 IDE 运行 `com.wangjin.salon.HairSalonApplication`。

主配置文件为 `hair-salon-boot/src/main/resources/application.yml`
项目使用多环境配置，PostgreSQL与Redis 配置位于 application-{active}.yml（active 为 home 或 company）。
启动时通过 spring.profiles.active 指定环境
接口文档访问：http://localhost:8080/doc.html

## 默认账号

| 用户名 | 密码 |
|--------|------|
| admin | admin123 |

## 系统管理 API（P0）

| 模块 | 前缀 | 说明 |
|------|------|------|
| 文件 | `/api/v1/files` | MinIO 上传/删除/公有 URL/预签名；需登录；表存 `objectKey` |
| 租户 | `/api/v1/tenants` | 租户主数据 CRUD/下拉（全局表，无行级租户过滤） |
| 用户 | `/api/v1/users` | 分页/CRUD/改密/启停/`/me`；分页支持 `@QueryDict` |
| 角色 | `/api/v1/roles` | 分页/CRUD/分配菜单 `/menus/{roleId}/{type}` |
| 菜单 | `/api/v1/menus` | 树/下拉/路由 `/routes`/CRUD |
| 部门 | `/api/v1/dept` | 树/下拉/CRUD |
| 字典 | `/api/v1/dict` | 字典项 + 类型 CRUD；`/options?typeCode=` |

字典翻译：VO 字段标 `@Dict(dictCode="gender")`，Controller 方法标 `@QueryDict`，返回附加 `xxx_text` / `xxx_name`（实现在 `wj-framework` common-web）。

## 多租户与数据权限

| 能力 | 实现 |
|------|------|
| 租户主数据 | 表 `sys_tenant`，接口 `/api/v1/tenants`；默认租户 id=1 / code=`default` |
| 租户隔离 | MP `TenantLine` 自动拼 `tenant_id`；`sys_tenant` 在 ignore-tables |
| 数据权限 | Mapper 方法标 `@DataPermission`；按角色 `data_scope` 拼 WHERE |
| **管理员全量** | 角色编码 `ROOT` **或** `data_scope=1(ALL)` → **不加数据权限条件**（仍受租户隔离，即本店全量） |
| JWT | 写入 `tenantId` / `roles` / `dataScope` / `dataScopeDeptIds` |

配置：`wj.mybatis.tenant-enabled` / `data-permission-enabled` / `ignore-tables`。

示例（用户分页已标注）：

```java
@DataPermission(deptColumn = "dept_id", userColumn = "create_by", tableAlias = "u")
Page<UserBO> getUserPage(...);
```

业务表需继承 `BaseTenantEntity` 并有 `tenant_id` 列；列表要按部门/本人过滤时再加 `@DataPermission`。

## 接口示例

```bash
# 登录（JWT 含 roles / permissions）
curl -s -X POST http://localhost:8080/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"admin\",\"password\":\"admin123\"}"

# 当前用户
curl -s http://localhost:8080/auth/me \
  -H "Authorization: Bearer <token>"

# 用户分页（带字典翻译）
curl -s "http://localhost:8080/api/v1/users/page?pageNum=1&pageSize=10" \
  -H "Authorization: Bearer <token>"

# 字典下拉
curl -s "http://localhost:8080/api/v1/dict/options?typeCode=gender" \
  -H "Authorization: Bearer <token>"

# 业务 ping
curl -s http://localhost:8080/api/ping \
  -H "Authorization: Bearer <token>"
```

## SQL

- 表结构：`hair-salon-boot/src/main/resources/schema.sql`
- 种子数据：`data.sql`（admin/ROOT 角色/系统菜单/gender·status 字典）
- 当前 yml 默认 `spring.sql.init.mode=never`；**首次建表**可临时改为 `always`，或手工：

```bash
psql -U postgres -d hair_salon -f hair-salon-boot/src/main/resources/schema.sql
psql -U postgres -d hair_salon -f hair-salon-boot/src/main/resources/data.sql
```

- 已有仅 `sys_user` 的库需执行完整 schema 增量建其余表

## 依赖关系

```text
hair-salon-boot
  ├── hair-salon-auth
  │     └── hair-salon-system
  │           └── wj-starter-boot（wj-framework）
  └── hair-salon-service
        └── hair-salon-system
```
