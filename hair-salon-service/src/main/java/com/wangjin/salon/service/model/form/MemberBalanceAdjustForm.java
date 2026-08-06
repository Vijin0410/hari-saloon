package com.wangjin.salon.service.model.form;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

@Data
@Schema(description = "会员余额调整表单")
public class MemberBalanceAdjustForm {

    @Schema(description = "余额桶（1本金 2赠送 3冻结）")
    @NotNull(message = "余额桶不能为空")
    private Integer balanceType;

    @Schema(description = "变动金额（正=增加 负=减少）")
    @NotNull(message = "变动金额不能为空")
    private BigDecimal changeAmount;

    @Schema(description = "备注")
    @NotBlank(message = "备注不能为空")
    private String remark;
}
