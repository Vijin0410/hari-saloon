package com.wangjin.salon.service.pay;

import java.time.LocalDateTime;

/**
 * 渠道查单结果（按渠道语义归一，业务侧不感知各家 API）。
 *
 * @param tradeState    交易状态（渠道实现归一后的通用状态：SUCCESS 支付成功 / NOTPAY 待支付 / CLOSED 终态失败；REFUND 透传留痕）
 * @param transactionId 渠道交易单号
 * @param successTime   支付完成时间（渠道口径，未支付为 null）
 * @param totalFen      订单金额（分，渠道下单口径：微信 total / 支付宝 total_amount；**入账校验锚点**，平台补贴不影响）
 * @param payerTotalFen 用户实付金额（分：微信 payer_total / 支付宝 buyer_pay_amount；立减金等平台补贴时小于订单金额，仅记录）
 */
public record ChannelQueryResult(String tradeState, String transactionId, LocalDateTime successTime,
                                 Integer totalFen, Integer payerTotalFen) {

    public boolean isSuccess() {
        return "SUCCESS".equals(tradeState);
    }
}
