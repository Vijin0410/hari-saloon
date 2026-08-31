package com.wangjin.salon.service.model.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.wangjin.common.base.BaseTenantEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 退款单（P6，docs/payment-design.md §9 阶段5）：一次退款动作一行。
 * <p>
 * 退款单是整体生效/失败的事务边界：发起时置 0 处理中（分摊明细见 {@link SalonRefundPayment}），
 * 渠道退款全部成功后由确认链路置 1（系统内退回/订单状态流转/支付流水 refunded 同事务生效），
 * 渠道退款失败置 2（系统内部分不生效，收银员重新发起）。
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("salon_refund_order")
public class SalonRefundOrder extends BaseTenantEntity<Long> {

    /** 退款单状态：处理中（渠道退款异步确认中） */
    public static final int STATUS_PROCESSING = 0;
    /** 退款单状态：成功（系统内退回与订单状态流转已生效） */
    public static final int STATUS_SUCCESS = 1;
    /** 退款单状态：失败（整体未生效） */
    public static final int STATUS_FAILED = 2;

    /** 原订单开单门店ID（冗余，门店权限校验） */
    private Long storeId;
    /** 退款单号（SR+时间+随机；渠道侧商户退款单号 out_refund_no 复用此号） */
    private String refundNo;
    /** 原订单ID */
    private Long orderId;
    /** 原订单号（冗余展示） */
    private String orderNo;
    /** 会员ID（NULL=散客） */
    private Long memberId;
    /** 退款总额（元，资金口径=退回顾客的钱，含退回会员余额部分，不含积分退回折算） */
    private BigDecimal refundAmount;
    /** 退回积分数（订单资金全额退光时一并退回积分抵扣） */
    private Integer pointRefundPoints;
    /** 退回积分折算金额（100积分=1元，留痕） */
    private BigDecimal pointRefundAmount;
    /** 其中退回会员余额的金额（先本后赠，分桶流水见 salon_member_balance_log） */
    private BigDecimal balanceRefundAmount;
    /** 退款原因（必填） */
    private String reason;
    /** 退款单状态（0=处理中 1=成功 2=失败；系统内退回与订单状态流转在置 1 时同事务生效） */
    private Integer status;
    /** 退款成功时间 */
    private LocalDateTime successTime;
    /** 备注（失败原因等） */
    private String remark;
}
