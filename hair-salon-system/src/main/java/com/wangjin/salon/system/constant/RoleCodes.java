package com.wangjin.salon.system.constant;

/**
 * 预置角色编码（各租户开通时复制）。
 */
public final class RoleCodes {

    private RoleCodes() {
    }

    /** 租户超级管理员（本租户全部数据） */
    public static final String ROOT = "ROOT";

    /** 店长：本部门及子部门 */
    public static final String STORE_MANAGER = "STORE_MANAGER";

    /** 店员：仅本人 */
    public static final String STORE_STAFF = "STORE_STAFF";
}
