# hair-salon

理发店管理系统（单体多模块），依赖外部底层包 `wj-framework`。

## 模块

```text
hair-salon/
├── hair-salon-boot      # 启动模块（唯一 main）
├── hair-salon-system    # 用户 / 角色 / 菜单 / 部门
├── hair-salon-auth      # 登录 / 当前用户
└── hair-salon-service   # 业务（会员、门店、充值消费等）
```

| 模块 | 职责 |
|------|------|
| **boot** | 启动、yml、打包 |
| **system** | 系统管理数据与服务 |
| **auth** | 认证接口 |
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
| wj-framework | 本地 `mvn install` |

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

配置见 `hair-salon-boot/src/main/resources/application.yml`（PostgreSQL + Redis）。  
接口文档：http://localhost:8080/doc.html  

## 默认账号

| 用户名 | 密码 |
|--------|------|
| admin | admin123 |

## 接口示例

```bash
# 登录
curl -s -X POST http://localhost:8080/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"admin\",\"password\":\"admin123\"}"

# 当前用户（Header 带 Bearer token）
curl -s http://localhost:8080/auth/me \
  -H "Authorization: Bearer <token>"

# 业务 ping
curl -s http://localhost:8080/api/ping \
  -H "Authorization: Bearer <token>"
```

## SQL

- 启动时默认 `spring.sql.init.mode=always` 执行 `schema.sql` / `data.sql`
- 也可手工：`sql/init-pgsql.sql`
- 表稳定后可将 `mode` 改为 `never`

## 依赖关系

```text
hair-salon-boot
  ├── hair-salon-auth
  │     └── hair-salon-system
  │           └── wj-starter-boot（wj-framework）
  └── hair-salon-service
        └── hair-salon-system
```
