package com.wangjin.salon.service.pay;

import java.time.LocalDateTime;

/**
 * 支付确认参数（回调/查单补偿统一口径，由 {@link PayConfirmDispatcher} 分发到业务确认链路）。
 *
 * @param transactionId 渠道交易单号
 * @param paidAt         支付完成时间（渠道口径，空则确认链路兜底当前时间）
 * @param totalFen       订单金额（分，渠道下单口径；与流水下单金额校验一致才入账）
 * @param payerTotalFen  用户实付金额（分；平台补贴优惠时小于订单金额，仅落 payer_amount 留痕）
 * @param source        确认来源（realtime_callback / query_compensate）
 * @param rawPayload    渠道原始报文（留痕）
 */
public record PayConfirmParams(String transactionId, LocalDateTime paidAt, Integer totalFen,
                               Integer payerTotalFen, String source, String rawPayload) {
}
