package com.wangjin.salon.system.cache;

/**
 * 系统缓存刷新（字典 / 用户 / 部门）。
 */
public interface SystemCacheService {

    /** 刷新字典缓存（字典全局共享，key 不含 tenantId）。 */
    void refreshDictCache();

    void refreshUserCache();

    void refreshDeptCache();

    void refreshAll();
}
