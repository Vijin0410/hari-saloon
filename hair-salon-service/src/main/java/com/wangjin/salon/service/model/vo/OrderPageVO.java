package com.wangjin.salon.service.model.vo;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.wangjin.common.web.annotation.Dict;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Schema(description = "订单分页")
public class OrderPageVO {

    @Schema(description = "订单ID")
    private Long id;
    @Schema(description = "订单号")
    private String orderNo;
    @Schema(description = "会员ID（空=散客）")
    private Long memberId;
    @Schema(description = "会员姓名")
    private String memberName;
    @Schema(description = "会员手机号")
    private String memberPhone;
    @Schema(description = "原价合计")
    private BigDecimal itemAmount;
    @Schema(description = "优惠总额（会员等级折扣）")
    private BigDecimal discountAmount;
    @Schema(description = "应收金额（折后）")
    private BigDecimal payableAmount;
    @Schema(description = "积分抵扣金额")
    private BigDecimal pointDeductAmount;
    @Schema(description = "实收金额")
    private BigDecimal receivedAmount;
    @Schema(description = "累计已退款金额（成功退款单汇总；可退=实收-已退）")
    private BigDecimal refundedAmount;
    @Schema(description = "找零金额")
    private BigDecimal changeAmount;
    @Schema(description = "状态（字典 order_status）")
    @Dict(dictCode = "order_status")
    private Integer status;
    @Schema(description = "开单门店名称")
    private String storeName;
    @Schema(description = "订单备注")
    private String remark;
    @Schema(description = "开单时间")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime createTime;
    @Schema(description = "支付完成时间")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime paidTime;
}
