package com.wangjin.salon.service.pay;

import com.wangjin.salon.service.model.entity.SalonTenantPayConfig;

/**
 * 直连渠道 SPI（docs/payment-design.md §6）。
 * <p>
 * 每个渠道一个实现（channel() 即 salon_tenant_pay_config.channel 值）；
 * 退款（refund）/回调验签（verifyNotify）随对应阶段扩展。
 */
public interface PayChannel {

    /** 渠道标识（wxpay/alipay…，与字典 pay_channel 一致） */
    String channel();

    /**
     * Native 扫码预下单，返回二维码链接（code_url），收银台渲染成二维码。
     */
    String nativePrepay(PayPrepayCommand command, SalonTenantPayConfig config);

    /**
     * 按 out_trade_no 查单（回调兜底/状态确认）。
     */
    ChannelQueryResult queryByOutTradeNo(String outTradeNo, SalonTenantPayConfig config);
}
