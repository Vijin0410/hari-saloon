package com.wangjin.salon.service.model.vo;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.math.BigDecimal;

@Data
@Schema(description = "趋势及排行")
public class FinanceGroupVO {

    @Schema(description = "日期或名称")
    private String label;

    @Schema(description = "门店或项目或会员ID")
    private Long entityId;

    @Schema(description = "租户ID")
    private Long tenantId;

    @Schema(description = "订单数或销售数量")
    private Long count;

    @Schema(description = "消费实收或项目折后金额（项目排行为退款前）")
    private BigDecimal amount;

    @Schema(description = "当期成功退款")
    private BigDecimal refundAmount;

    @Schema(description = "充值本金")
    private BigDecimal rechargeAmount;
}
