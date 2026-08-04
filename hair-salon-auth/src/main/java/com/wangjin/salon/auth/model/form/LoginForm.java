package com.wangjin.salon.auth.model.form;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * 登录入参。
 */
@Data
@Schema(description = "登入表单")
public class LoginForm {

    @Schema(description = "用户名")
    @NotBlank(message = "用户名不能为空")
    private String username;

    @Schema(description = "密码")
    @NotBlank(message = "密码不能为空")
    private String password;

    /**
     * 租户编码；空则默认租户（default / id=1）。
     */
    @Schema(description = "租户编码")
    private String tenantCode;
}
