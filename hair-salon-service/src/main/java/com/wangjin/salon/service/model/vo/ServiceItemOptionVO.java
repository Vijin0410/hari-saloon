package com.wangjin.salon.service.model.vo;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.math.BigDecimal;

@Data
@Schema(description = "服务项目下拉")
public class ServiceItemOptionVO {

    @Schema(description = "项目ID")
    private Long id;
    @Schema(description = "项目名称")
    private String name;
    @Schema(description = "项目分类ID")
    private Long categoryId;
    @Schema(description = "标准价格")
    private BigDecimal standardPrice;
    @Schema(description = "会员价格")
    private BigDecimal memberPrice;
    @Schema(description = "服务时长（分钟）")
    private Integer duration;
}
