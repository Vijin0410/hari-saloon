package com.wangjin.salon.service.model.vo;

import com.fasterxml.jackson.annotation.JsonFormat;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.util.List;

@Data
@EqualsAndHashCode(callSuper = true)
@Schema(description = "订单详情")
public class OrderDetailVO extends OrderPageVO {

    @Schema(description = "开单门店ID")
    private Long storeId;
    @Schema(description = "积分抵扣使用的积分数")
    private Integer pointDeductPoints;
    @Schema(description = "订单明细")
    private List<OrderItemVO> items;
    @Schema(description = "支付明细（组合支付）")
    private List<OrderPaymentVO> payments;
}
