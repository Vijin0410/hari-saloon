package com.wangjin.salon.service.model.vo;

import com.wangjin.common.web.annotation.Dict;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.math.BigDecimal;

@Data
@Schema(description = "收款方式汇总")
public class FinanceChannelVO {

    @Schema(description = "支付方式（字典 pay_method）")
    @Dict(dictCode = "pay_method")
    private Integer payMethod;

    @Schema(description = "消费支付金额")
    private BigDecimal orderAmount;

    @Schema(description = "充值本金收款")
    private BigDecimal rechargeAmount;

    @Schema(description = "成功退款金额")
    private BigDecimal refundAmount;

    @Schema(description = "收款减退款（积分折算单列，不属于资金）")
    private BigDecimal netAmount;
}
