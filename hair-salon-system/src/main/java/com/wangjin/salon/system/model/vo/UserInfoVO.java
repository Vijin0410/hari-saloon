package com.wangjin.salon.system.model.vo;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.util.Set;

/**
 * 当前登录用户信息。
 */
@Data
@Schema(description = "当前用户信息")
public class UserInfoVO {

    private Long id;
    private String username;
    private String nickname;
    private String phone;
    private Long deptId;
    private Long tenantId;
    /** true=须强制改密（首次 NULL 或已过期） */
    private Boolean pwdResetRequired;
    private Set<String> roles;
    private Set<String> perms;
}
