package com.wangjin.salon.system.model.form;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Schema(description = "角色表单")
@Data
public class RoleForm {

    private Long id;

    @NotBlank(message = "角色名称不能为空")
    private String name;

    @NotBlank(message = "角色编码不能为空")
    private String code;

    private Integer sort;
    private Integer status;
    private Integer dataScope;
    private String deptIds;
}
