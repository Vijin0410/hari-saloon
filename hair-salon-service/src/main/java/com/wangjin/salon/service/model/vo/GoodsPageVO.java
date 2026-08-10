package com.wangjin.salon.service.model.vo;

import com.fasterxml.jackson.annotation.JsonFormat;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Schema(description = "商品分页")
public class GoodsPageVO {

    @Schema(description = "商品ID")
    private Long id;
    @Schema(description = "商品名称")
    private String name;
    @Schema(description = "商品分类ID")
    private Long categoryId;
    @Schema(description = "商品条码")
    private String barcode;
    @Schema(description = "销售价格")
    private BigDecimal salePrice;
    @Schema(description = "成本价")
    private BigDecimal costPrice;
    @Schema(description = "库存数量")
    private Integer stockQuantity;
    @Schema(description = "是否参与折扣：1是 0否")
    private Integer discountable;
    @Schema(description = "是否计算提成：1是 0否")
    private Integer commissionable;
    @Schema(description = "排序")
    private Integer sort;
    @Schema(description = "状态：1启用 0禁用")
    private Integer status;
    @Schema(description = "创建时间")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime createTime;
}
