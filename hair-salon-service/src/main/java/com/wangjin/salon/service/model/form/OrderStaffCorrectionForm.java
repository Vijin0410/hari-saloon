package com.wangjin.salon.service.model.form;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.List;

@Data
@Schema(description = "订单人员更正表单（完整人员分配，不修改金额与消费项目）")
public class OrderStaffCorrectionForm {
    @Schema(description = "更正原因")
    @NotBlank(message = "更正原因不能为空")
    @Size(max = 255, message = "更正原因最多255字")
    private String reason;

    @Schema(description = "完整订单明细人员分配")
    @NotNull(message = "订单明细不能为空")
    @Size(min = 1, max = 500, message = "订单明细须为1至500项")
    @Valid
    private List<@NotNull(message = "订单明细不能为空") Item> items;

    @Data
    @Schema(description = "订单明细人员更正")
    public static class Item {
        @Schema(description = "订单明细ID")
        @NotNull(message = "订单明细ID不能为空")
        @Positive(message = "订单明细ID不正确")
        private Long orderItemId;

        @Schema(description = "主服务人员ID")
        @NotNull(message = "服务人员不能为空")
        @Positive(message = "服务人员ID不正确")
        private Long staffId;

        @Schema(description = "助理ID（空值表示不配置助理）")
        @Positive(message = "助理ID不正确")
        private Long assistantId;

        @Schema(description = "更正前主服务人员ID（用于并发校验）")
        @Positive(message = "原服务人员ID不正确")
        private Long expectedStaffId;

        @Schema(description = "更正前助理ID（用于并发校验）")
        @Positive(message = "原助理ID不正确")
        private Long expectedAssistantId;
    }
}
