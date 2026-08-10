package com.wangjin.salon.service.model.vo;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.math.BigDecimal;

@Data
@Schema(description = "商品下拉")
public class GoodsOptionVO {

    @Schema(description = "商品ID")
    private Long id;
    @Schema(description = "商品名称")
    private String name;
    @Schema(description = "商品分类ID")
    private Long categoryId;
    @Schema(description = "销售价格")
    private BigDecimal salePrice;
    @Schema(description = "库存数量")
    private Integer stockQuantity;
}
