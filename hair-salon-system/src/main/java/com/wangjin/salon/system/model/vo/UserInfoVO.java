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

    @Schema(description = "用户ID")
    private Long id;
    @Schema(description = "用户名")
    private String username;
    @Schema(description = "昵称")
    private String nickname;
    @Schema(description = "手机号")
    private String phone;
    /** 头像文件 objectKey（私有桶，前端展示需换预签名 URL） */
    @Schema(description = "头像（对象键）")
    private String avatar;
    @Schema(description = "部门ID")
    private Long deptId;
    @Schema(description = "租户ID")
    private Long tenantId;
    /** true=须强制改密（首次 NULL 或已过期） */
    @Schema(description = "是否须强制改密")
    private Boolean pwdResetRequired;
    @Schema(description = "角色编码集合")
    private Set<String> roles;
    @Schema(description = "权限标识集合")
    private Set<String> perms;
}
