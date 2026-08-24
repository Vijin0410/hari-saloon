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
@Schema(description = "开单/挂单表单（服务+商品明细）")
public class OrderSaveForm {

    @Schema(description = "订单ID（结算挂单订单时传；新开单不传）")
    private Long id;

    @Schema(description = "会员ID（空=散客）")
    private Long memberId;

    @Schema(description = "开单门店ID")
    @NotNull(message = "开单门店不能为空")
    private Long storeId;

    @Schema(description = "订单备注")
    @Size(max = 255, message = "备注长度不能超过255")
    private String remark;

    @Schema(description = "订单明细（至少一行）")
    @NotNull(message = "订单明细不能为空")
    @Size(min = 1, message = "订单明细不能为空")
    @Valid
    private List<OrderItemForm> items;

    @Data
    @Schema(description = "订单明细行")
    public static class OrderItemForm {

        @Schema(description = "明细类型：1服务项目 2商品")
        @NotNull(message = "明细类型不能为空")
        private Integer itemType;

        @Schema(description = "项目/商品ID")
        @NotNull(message = "项目/商品不能为空")
        private Long itemId;

        @Schema(description = "实际单价（收银可改价）")
        @NotNull(message = "单价不能为空")
        @DecimalMin(value = "0", message = "单价不能为负")
        private BigDecimal price;

        @Schema(description = "数量")
        @NotNull(message = "数量不能为空")
        @Min(value = 1, message = "数量至少为1")
        @Max(value = 999, message = "数量不能超过999")
        private Integer quantity;

        @Schema(description = "主服务人员ID")
        private Long staffId;

        @Schema(description = "助理ID")
        private Long assistantId;

        @Schema(description = "行备注")
        @Size(max = 255, message = "备注长度不能超过255")
        private String remark;
    }
}
