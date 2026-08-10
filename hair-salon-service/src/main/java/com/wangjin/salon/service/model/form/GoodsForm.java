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
@Schema(description = "商品表单")
public class GoodsForm {

    @Schema(description = "商品ID")
    private Long id;

    @Schema(description = "商品名称")
    @NotBlank(message = "商品名称不能为空")
    @Size(max = 64, message = "商品名称长度不能超过64")
    private String name;

    @Schema(description = "商品分类ID")
    private Long categoryId;

    @Schema(description = "商品条码")
    @Size(max = 64, message = "条码长度不能超过64")
    private String barcode;

    @Schema(description = "销售价格")
    @NotNull(message = "销售价格不能为空")
    @DecimalMin(value = "0", message = "销售价格不能为负")
    private BigDecimal salePrice;

    @Schema(description = "成本价")
    @DecimalMin(value = "0", message = "成本价不能为负")
    private BigDecimal costPrice;

    @Schema(description = "库存数量")
    @Min(value = 0, message = "库存数量不能为负")
    private Integer stockQuantity;

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
