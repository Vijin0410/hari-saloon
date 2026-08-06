package com.wangjin.salon.service.model.form;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
@Schema(description = "会员标签表单")
public class MemberTagForm {

    @Schema(description = "标签ID")
    private Long id;

    @Schema(description = "标签名称")
    @NotBlank(message = "标签名称不能为空")
    private String name;

    @Schema(description = "标签颜色（前端展示）")
    private String color;

    @Schema(description = "排序")
    private Integer sort;

    @Schema(description = "状态：1启用 0禁用")
    private Integer status;

    @Schema(description = "备注")
    private String remark;
}
