package com.wangjin.salon.service.model.form;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
@Schema(description = "服务项目分类表单")
public class ServiceCategoryForm {

    @Schema(description = "分类ID")
    private Long id;

    @Schema(description = "分类名称")
    @NotBlank(message = "分类名称不能为空")
    @Size(max = 64, message = "分类名称长度不能超过64")
    private String name;

    @Schema(description = "排序")
    private Integer sort;

    @Schema(description = "状态：1启用 0禁用")
    private Integer status;

    @Schema(description = "备注")
    @Size(max = 255, message = "备注长度不能超过255")
    private String remark;
}
