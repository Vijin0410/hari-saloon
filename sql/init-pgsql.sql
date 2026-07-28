-- 手工初始化（库 hair_salon 已创建后执行）
-- 推荐直接执行 boot 模块下的 schema / data：
--   psql -U postgres -d hair_salon -f hair-salon-boot/src/main/resources/schema.sql
--   psql -U postgres -d hair_salon -f hair-salon-boot/src/main/resources/data.sql
--
-- 或启动时将 application.yml 中 spring.sql.init.mode 临时改为 always

-- 以下为精简入口提示，完整 DDL 以 schema.sql 为准。
SELECT 'Please run schema.sql and data.sql under hair-salon-boot/src/main/resources' AS tip;
