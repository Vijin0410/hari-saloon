package com.wangjin.salon.service.model.vo;

import com.wangjin.common.web.annotation.Dict;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.math.BigDecimal;

@Data
@Schema(description = "订单支付明细行")
public class OrderPaymentVO {

    @Schema(description = "支付明细ID")
    private Long id;
    @Schema(description = "支付方式（字典 pay_method）")
    @Dict(dictCode = "pay_method")
    private Integer payMethod;
    @Schema(description = "支付金额")
    private BigDecimal amount;
}
