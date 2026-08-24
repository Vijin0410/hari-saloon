package com.wangjin.salon.service.model.vo;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.math.BigDecimal;

@Data
@Schema(description = "订单明细行")
public class OrderItemVO {

    @Schema(description = "明细ID")
    private Long id;
    @Schema(description = "明细类型：1服务项目 2商品")
    private Integer itemType;
    @Schema(description = "项目/商品ID")
    private Long itemId;
    @Schema(description = "名称快照")
    private String itemName;
    @Schema(description = "原单价")
    private BigDecimal unitPrice;
    @Schema(description = "实际单价")
    private BigDecimal price;
    @Schema(description = "数量")
    private Integer quantity;
    @Schema(description = "行折扣率快照（会员等级折扣）")
    private BigDecimal discountRate;
    @Schema(description = "行小计")
    private BigDecimal subtotal;
    @Schema(description = "主服务人员ID（取单回填用）")
    private Long staffId;
    @Schema(description = "助理ID（取单回填用）")
    private Long assistantId;
    @Schema(description = "主服务人员姓名")
    private String staffName;
    @Schema(description = "助理姓名")
    private String assistantName;
    @Schema(description = "行备注")
    private String remark;
}
