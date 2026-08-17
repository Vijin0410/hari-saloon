-- ============================================================
-- migrate-dict-tenant-overlay.sql
-- 作用：字典从「全局共享」回到「通用（默认租户1）+ 租户覆盖」模式（对齐 wj-framework f3b3931 DictAspect：
--       翻译时合并通用键 system:core:dict:{typeCode} 与租户键 system:core:dict:{typeCode}:{tenantId}，同 value 租户覆盖通用）。
--       为租户 2084880957290426370 补齐字典类型与字典项副本（从租户 1 复制，id + 1000）。
-- 幂等：NOT EXISTS 守卫，可重复执行。
-- 执行后须重启应用（DevDataInitializer.refreshAll 会按租户分键重建字典缓存），或手动触发缓存刷新。
-- 约定：后续每次新增字典种子，data.sql 必须同步加一份本租户（2084880957290426370）的副本。
-- ============================================================

-- 字典类型副本
INSERT INTO sys_dict_type (id, name, code, status, remark, group_code, tenant_id, create_by, create_time, update_by, update_time, deleted)
SELECT d.id + 1000, d.name, d.code, d.status, d.remark, d.group_code, 2084880957290426370, 0, CURRENT_TIMESTAMP, 0, CURRENT_TIMESTAMP, 0
FROM sys_dict_type d
WHERE d.tenant_id = 1 AND d.deleted = 0
  AND NOT EXISTS (SELECT 1 FROM sys_dict_type t WHERE t.code = d.code AND t.tenant_id = 2084880957290426370);

-- 字典项副本（同 value 与租户 1 一致，租户可在自己副本上调整名称/排序）
INSERT INTO sys_dict (id, type_code, name, value, sort, status, defaulted, remark, tenant_id)
SELECT d.id + 1000, d.type_code, d.name, d.value, d.sort, d.status, d.defaulted, d.remark, 2084880957290426370
FROM sys_dict d
WHERE d.tenant_id = 1
  AND NOT EXISTS (SELECT 1 FROM sys_dict t WHERE t.type_code = d.type_code AND t.value = d.value AND t.tenant_id = 2084880957290426370);
