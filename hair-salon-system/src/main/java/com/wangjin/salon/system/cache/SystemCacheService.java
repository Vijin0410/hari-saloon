package com.wangjin.salon.system.cache;

/**
 * 系统缓存刷新（字典 / 用户 / 部门）。
 */
public interface SystemCacheService {

    /** 刷新通用字典和各租户覆盖缓存，覆盖键包含 tenantId。 */
    void refreshDictCache();

    void refreshUserCache();

    void refreshDeptCache();

    void refreshAll();
}
