package com.wangjin.salon.system.model.form;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;

@Schema(description = "用户表单")
@Data
public class UserForm {

    private Long id;

    @NotBlank(message = "用户名不能为空")
    private String username;

    @NotBlank(message = "昵称不能为空")
    private String nickname;

    private String phone;
    private Integer gender;
    private String avatar;
    private String email;
    private Integer status;

    @NotNull(message = "所属部门不能为空")
    private Long deptId;

    @NotEmpty(message = "用户角色不能为空")
    private List<Long> roleIds;
}
