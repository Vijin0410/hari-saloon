package com.wangjin.salon.service.model.form;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
@Schema(description = "订单结算表单（组合支付）")
public class OrderPayForm {

    @Schema(description = "积分抵扣使用的积分数（0=不使用；须会员订单）")
    @NotNull(message = "积分抵扣数不能为空")
    @Min(value = 0, message = "积分抵扣数不能为负")
    private Integer usePoints;

    @Schema(description = "现金投入金额（用于计算找零；无现金支付传0）")
    @NotNull(message = "现金投入不能为空")
    @DecimalMin(value = "0", message = "现金投入不能为负")
    private BigDecimal cashReceived;

    @Schema(description = "支付方式明细（组合支付，至少一行）")
    @NotNull(message = "支付方式不能为空")
    @Size(max = 8, message = "支付方式最多8行")
    @Valid
    private List<OrderPaymentForm> payments;

    @Data
    @Schema(description = "支付方式行")
    public static class OrderPaymentForm {

        @Schema(description = "支付方式（字典 pay_method：1现金 2微信 3支付宝 4银行卡 5会员余额 7积分抵扣 8其他）")
        @NotNull(message = "支付方式不能为空")
        private Integer payMethod;

        @Schema(description = "支付金额")
        @NotNull(message = "支付金额不能为空")
        @DecimalMin(value = "0.01", message = "支付金额必须大于0")
        private BigDecimal amount;
    }
}
