package com.wangjin.salon.auth.model.vo;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 登录出参。
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "登录出参")
public class LoginVO {

    @Schema(description = "访问令牌")
    private String token;
    @Schema(description = "用户ID")
    private Long userId;
    @Schema(description = "用户名")
    private String username;
    @Schema(description = "昵称")
    private String nickname;
    /** 是否须强制改密 */
    @Schema(description = "是否须强制改密")
    private Boolean pwdResetRequired;
}
