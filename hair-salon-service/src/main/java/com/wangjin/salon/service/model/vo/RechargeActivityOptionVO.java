package com.wangjin.salon.service.model.vo;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.math.BigDecimal;

@Data
@Schema(description = "充值活动下拉（生效中档位，充值弹窗展示）")
public class RechargeActivityOptionVO {

    @Schema(description = "活动ID")
    private Long id;
    @Schema(description = "活动名称")
    private String name;
    @Schema(description = "充值门槛")
    private BigDecimal thresholdAmount;
    @Schema(description = "赠送金额")
    private BigDecimal giftAmount;
}
