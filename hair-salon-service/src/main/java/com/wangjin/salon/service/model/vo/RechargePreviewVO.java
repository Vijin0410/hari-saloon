package com.wangjin.salon.service.model.vo;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.math.BigDecimal;

@Data
@Schema(description = "充值赠送预览（输入金额实时计算，服务端口径）")
public class RechargePreviewVO {

    @Schema(description = "命中的充值活动ID（空=未命中活动）")
    private Long activityId;
    @Schema(description = "命中的充值活动名称")
    private String activityName;
    @Schema(description = "赠送金额")
    private BigDecimal giftAmount;
    @Schema(description = "赠送来源（1充值活动 2等级赠送率 3无赠送）")
    private Integer giftSource;
    @Schema(description = "赠送是否冻结至次月：1是 0否")
    private Integer giftFrozen;
}
