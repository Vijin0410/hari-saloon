package com.wangjin.salon.service.model.form;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.math.BigDecimal;

/**
 * 订单退款发起表单（P6）。
 */
@Data
@Schema(description = "订单退款发起表单")
public class OrderRefundForm {

    @Schema(description = "退款金额（元，资金口径；<= 可退余额=实收-已退-处理中）")
    @NotNull(message = "退款金额不能为空")
    @DecimalMin(value = "0.01", message = "退款金额必须大于0")
    @Digits(integer = 9, fraction = 2, message = "退款金额最多两位小数")
    private BigDecimal refundAmount;

    @Schema(description = "退款原因")
    @NotBlank(message = "退款原因不能为空")
    @Size(max = 255, message = "退款原因最多255字")
    private String reason;
}
