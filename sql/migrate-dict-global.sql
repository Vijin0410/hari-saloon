-- ===== 字典改为全局共享（方向 X）=====
-- 背景：sys_dict/sys_dict_type 已加入 wj.mybatis.ignore-tables，字典全局共享、不走租户隔离；
--       缓存 key 回退为 system:core:dict:{typeCode}（不含 tenantId）。
-- 作用：清理历史为第二租户（2084880957290426370）单独种子的冗余字典，避免下拉/翻译出现重复项。
-- 注意：DELETE 直接按 tenant_id 过滤，不受 TenantLine 拦截器影响；仅清理第二租户字典，保留默认租户 1 的全局字典。

DELETE FROM sys_dict WHERE tenant_id = 2084880957290426370;
DELETE FROM sys_dict_type WHERE tenant_id = 2084880957290426370;

-- 历史按租户隔离的 Redis 缓存 key（system:core:dict:{tenantId}:{typeCode}）需清掉，
-- 重启服务后 DevDataInitializer.refreshAll 会以无租户 key 重建。
-- 如不想重启，可手动执行：redis-cli --scan --pattern 'system:core:dict:*' | xargs redis-cli del
