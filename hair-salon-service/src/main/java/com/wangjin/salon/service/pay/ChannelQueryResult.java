package com.wangjin.salon.service.pay;

import java.time.LocalDateTime;

/**
 * 渠道查单结果（按渠道语义归一，业务侧不感知各家 API）。
 *
 * @param tradeState    交易状态（渠道实现归一后的通用状态：SUCCESS 支付成功 / NOTPAY 待支付 / CLOSED 终态失败；REFUND 透传留痕）
 * @param transactionId 渠道交易单号
 * @param successTime   支付完成时间（渠道口径，未支付为 null）
 * @param payerTotalFen 实付金额（分，未支付为 null；微信 payer_total、支付宝 total_amount 口径）
 */
public record ChannelQueryResult(String tradeState, String transactionId, LocalDateTime successTime, Integer payerTotalFen) {

    public boolean isSuccess() {
        return "SUCCESS".equals(tradeState);
    }
}
