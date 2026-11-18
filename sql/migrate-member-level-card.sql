-- PostgreSQL：会员等级自选贴图。已有数据库执行本脚本；内置卡面无需初始化图片数据。
BEGIN;
ALTER TABLE salon_member_level ADD COLUMN IF NOT EXISTS card_image varchar(255);
COMMENT ON COLUMN salon_member_level.card_image IS '会员卡自选贴图对象键，NULL=使用内置卡面';
COMMIT;
