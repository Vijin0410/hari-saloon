package com.wangjin.salon.service.model.vo;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.math.BigDecimal;

@Data
@Schema(description = "会员等级下拉")
public class MemberLevelOptionVO {

    @Schema(description = "等级ID")
    private Long id;
    @Schema(description = "等级名称")
    private String name;
    @Schema(description = "等级序号")
    private Integer levelNo;
    @Schema(description = "服务折扣")
    private BigDecimal serviceDiscount;
    @Schema(description = "商品折扣")
    private BigDecimal goodsDiscount;
    @Schema(description = "积分倍率")
    private BigDecimal pointRate;
}
