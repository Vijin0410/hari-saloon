package com.wangjin.salon.system.model.form;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Schema(description = "部门表单")
@Data
public class DeptForm {

    private Long id;

    @NotBlank(message = "部门名称不能为空")
    private String name;

    @NotNull(message = "父部门ID不能为空")
    private Long parentId;

    private Integer status;
    private Integer sort;
    private Long leaderId;
}
