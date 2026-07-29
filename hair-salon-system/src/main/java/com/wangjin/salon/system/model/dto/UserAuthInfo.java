package com.wangjin.salon.system.model.dto;

import lombok.Data;

import java.util.Set;

/**
 * 登录认证信息（含角色、权限、数据范围）。
 */
@Data
public class UserAuthInfo {

    private Long userId;
    private String username;
    private String nickname;
    private String password;
    private Integer status;
    private Long deptId;
    private Long tenantId;
    /** 1=须改密 */
    private Integer pwdResetRequired;
    private Set<String> roles;
    private Set<String> perms;
    /** 角色中最小 data_scope（权限最大） */
    private Integer maxDataScope;
    /** 数据权限可见部门（登录时解析） */
    private Set<Long> dataScopeDeptIds;
}
