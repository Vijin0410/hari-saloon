package com.wangjin.salon.service.model.form;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.math.BigDecimal;

@Data
@Schema(description = "会员充值表单")
public class RechargeCreateForm {

    @Schema(description = "会员ID")
    @NotNull(message = "会员不能为空")
    private Long memberId;

    @Schema(description = "充值金额（本金，现金实收）")
    @NotNull(message = "充值金额不能为空")
    @DecimalMin(value = "0.01", message = "充值金额必须大于0")
    private BigDecimal amount;

    @Schema(description = "支付方式（字典 pay_method：1现金 2微信 3支付宝 4银行卡 8其他，不允许余额/积分）")
    @NotNull(message = "支付方式不能为空")
    private Integer payMethod;

    @Schema(description = "备注")
    @Size(max = 255, message = "备注长度不能超过255")
    private String remark;
}
