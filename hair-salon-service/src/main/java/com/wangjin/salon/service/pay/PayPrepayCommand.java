package com.wangjin.salon.service.pay;

import java.math.BigDecimal;

/**
 * 渠道支付下单参数。
 *
 * @param outTradeNo  系统内部交易单号（回调反查键）
 * @param amount      金额（元）
 * @param description 商品描述（展示在顾客账单）
 * @param notifyUrl   支付结果回调地址（按租户带参，验签兜底）
 */
public record PayPrepayCommand(String outTradeNo, BigDecimal amount, String description, String notifyUrl) {
}
