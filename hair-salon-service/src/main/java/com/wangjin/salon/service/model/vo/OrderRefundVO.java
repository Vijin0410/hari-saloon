package com.wangjin.salon.service.model.vo;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.wangjin.common.web.annotation.Dict;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * 退款记录（P6，订单维度查询）。
 */
@Data
@Schema(description = "退款记录")
public class OrderRefundVO {

    @Schema(description = "退款单ID")
    private Long id;
    @Schema(description = "退款单号")
    private String refundNo;
    @Schema(description = "原订单ID")
    private Long orderId;
    @Schema(description = "原订单号")
    private String orderNo;
    @Schema(description = "退款总额（资金口径，含退回余额部分）")
    private BigDecimal refundAmount;
    @Schema(description = "退回积分数（订单资金全额退光时一并退回）")
    private Integer pointRefundPoints;
    @Schema(description = "退回积分折算金额")
    private BigDecimal pointRefundAmount;
    @Schema(description = "其中退回会员余额的金额")
    private BigDecimal balanceRefundAmount;
    @Schema(description = "退款原因")
    private String reason;
    @Schema(description = "退款单状态（0=处理中 1=成功 2=失败）")
    private Integer status;
    @Schema(description = "退款成功时间")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime successTime;
    @Schema(description = "备注（失败原因等）")
    private String remark;
    @Schema(description = "退款申请人")
    private Long createBy;
    @Schema(description = "发起时间")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime createTime;
    @Schema(description = "退款分摊明细（每支付方式一行）")
    private List<Payment> payments;

    /**
     * 退款分摊明细行。
     */
    @Data
    @Schema(description = "退款分摊明细行")
    public static class Payment {

        @Schema(description = "分摊行ID")
        private Long id;
        @Schema(description = "退回支付方式（字典 pay_method）")
        @Dict(dictCode = "pay_method")
        private Integer payMethod;
        @Schema(description = "本行退款金额")
        private BigDecimal amount;
        @Schema(description = "退款渠道（wxpay/alipay 原路退回；空=系统内退回/线下退款）")
        @Dict(dictCode = "pay_channel")
        private String channel;
        @Schema(description = "渠道退款单号（微信 refund_id / 支付宝 trade_no）")
        private String channelRefundNo;
        @Schema(description = "退款处理状态（processing=处理中 success=已生效 failed=失败）")
        private String channelStatus;
        @Schema(description = "渠道退款手续费（P8 对账回填）")
        private BigDecimal feeAmount;
        @Schema(description = "手续费是否返还（0=否 1=是）")
        private Integer feeReturned;
        @Schema(description = "备注")
        private String remark;
    }
}
