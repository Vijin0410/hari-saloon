package com.wangjin.salon.system.cache;

/**
 * 系统缓存刷新（字典 / 用户 / 部门）。
 */
public interface SystemCacheService {

    /** 刷新指定租户的字典缓存（key 按 tenantId 隔离）。 */
    void refreshDictCache(Long tenantId);

    void refreshUserCache();

    void refreshDeptCache();

    void refreshAll();
}
