package com.wangjin.salon.service.pay;

import java.math.BigDecimal;

/**
 * 渠道退款命令（P6）：out_refund_no 为渠道幂等键，totalAmount 为原支付下单金额（微信必传校验）。
 *
 * @param outTradeNo  原支付商户单号（下单时的 out_trade_no）
 * @param outRefundNo 商户退款单号（=退款单号；微信 out_refund_no / 支付宝 out_request_no）
 * @param amount      退款金额（元）
 * @param totalAmount 原支付金额（元；微信 amount.total）
 * @param reason      退款原因（透传渠道）
 * @param notifyUrl   退款结果回调地址（微信；支付宝退款为同步接口无回调）
 */
public record RefundCommand(String outTradeNo, String outRefundNo, BigDecimal amount,
                            BigDecimal totalAmount, String reason, String notifyUrl) {
}
