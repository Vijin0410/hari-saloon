package com.wangjin.salon.auth.model.form;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * 当前用户修改密码。
 */
@Data
public class ChangePasswordForm {

    @NotBlank(message = "原密码不能为空")
    private String oldPassword;

    @NotBlank(message = "新密码不能为空")
    @Size(min = 6, message = "新密码至少 6 位")
    private String newPassword;
}
