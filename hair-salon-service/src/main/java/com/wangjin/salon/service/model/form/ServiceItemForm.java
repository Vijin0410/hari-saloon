package com.wangjin.salon.service.model.form;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.math.BigDecimal;

@Data
@Schema(description = "服务项目表单")
public class ServiceItemForm {

    @Schema(description = "项目ID")
    private Long id;

    @Schema(description = "项目名称")
    @NotBlank(message = "项目名称不能为空")
    @Size(max = 64, message = "项目名称长度不能超过64")
    private String name;

    @Schema(description = "项目分类ID")
    private Long categoryId;

    @Schema(description = "标准价格")
    @NotNull(message = "标准价格不能为空")
    @DecimalMin(value = "0", message = "标准价格不能为负")
    private BigDecimal standardPrice;

    @Schema(description = "会员价格（空=无会员价）")
    @DecimalMin(value = "0", message = "会员价格不能为负")
    private BigDecimal memberPrice;

    @Schema(description = "服务时长（分钟）")
    @Min(value = 0, message = "服务时长不能为负")
    private Integer duration;

    @Schema(description = "是否参与折扣：1是 0否")
    private Integer discountable;

    @Schema(description = "是否计算提成：1是 0否")
    private Integer commissionable;

    @Schema(description = "排序")
    private Integer sort;

    @Schema(description = "状态：1启用 0禁用")
    private Integer status;

    @Schema(description = "备注")
    @Size(max = 255, message = "备注长度不能超过255")
    private String remark;
}
