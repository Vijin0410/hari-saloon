package com.wangjin.salon.system.constant;

import cn.hutool.core.util.StrUtil;

/**
 * 预置角色编码（各租户开通时复制；ROOT 仅默认租户系统种子）。
 * <p>
 * 预置角色编码受保护：编辑时不可修改其编码，亦不可新建为 ROOT 系统管理员。
 */
public enum RoleCodes {

    ROOT("ROOT", "系统管理员"),
    TENANT_ADMIN("TENANT_ADMIN", "租户管理员"),
    STORE_MANAGER("STORE_MANAGER", "店长"),
    STORE_STAFF("STORE_STAFF", "店员");

    private final String code;
    private final String label;

    RoleCodes(String code, String label) {
        this.code = code;
        this.label = label;
    }

    public String getCode() {
        return code;
    }

    public String getLabel() {
        return label;
    }

    /** 是否为系统预置角色编码（大小写不敏感）。 */
    public static boolean isPreset(String code) {
        if (StrUtil.isBlank(code)) {
            return false;
        }
        for (RoleCodes r : values()) {
            if (r.code.equalsIgnoreCase(code)) {
                return true;
            }
        }
        return false;
    }
}
