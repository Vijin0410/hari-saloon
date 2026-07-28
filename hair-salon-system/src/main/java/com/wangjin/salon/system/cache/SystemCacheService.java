package com.wangjin.salon.system.cache;

/**
 * 系统缓存刷新（字典 / 用户 / 部门）。
 */
public interface SystemCacheService {

    void refreshDictCache();

    void refreshUserCache();

    void refreshDeptCache();

    void refreshAll();
}
