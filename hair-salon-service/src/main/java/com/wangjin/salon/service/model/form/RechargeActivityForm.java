package com.wangjin.salon.service.model.form;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Schema(description = "充值活动表单")
public class RechargeActivityForm {

    @Schema(description = "活动ID")
    private Long id;

    @Schema(description = "活动名称")
    @NotBlank(message = "活动名称不能为空")
    @Size(max = 64, message = "活动名称长度不能超过64")
    private String name;

    @Schema(description = "充值门槛（单笔充值金额>=该值可享）")
    @NotNull(message = "充值门槛不能为空")
    @DecimalMin(value = "0.01", message = "充值门槛必须大于0")
    private BigDecimal thresholdAmount;

    @Schema(description = "赠送金额")
    @NotNull(message = "赠送金额不能为空")
    @DecimalMin(value = "0.01", message = "赠送金额必须大于0")
    private BigDecimal giftAmount;

    @Schema(description = "生效时间（空=立即生效）")
    private LocalDateTime startTime;

    @Schema(description = "失效时间（空=长期有效）")
    private LocalDateTime endTime;

    @Schema(description = "排序")
    private Integer sort;

    @Schema(description = "状态：1启用 0禁用")
    private Integer status;

    @Schema(description = "备注")
    @Size(max = 255, message = "备注长度不能超过255")
    private String remark;
}
