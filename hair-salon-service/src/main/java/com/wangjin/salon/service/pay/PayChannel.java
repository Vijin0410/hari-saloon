package com.wangjin.salon.service.pay;

import com.wangjin.salon.service.model.entity.SalonTenantPayConfig;

/**
 * 直连渠道 SPI（docs/payment-design.md §6）。
 * <p>
 * 每个渠道一个实现（channel() 即 salon_tenant_pay_config.channel 值）；
 * 退款（refund）/退款状态查询（queryRefundStatus）随 P6 落地，同步退款的渠道（支付宝）无需实现查询。
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

    /**
     * 渠道退款（原路退回，P6）。out_refund_no 为幂等键（重复请求同单号渠道侧幂等处理）；
     * 支付宝同步返回终态，微信返回 SUCCESS/PROCESSING（PROCESSING 由回调/查单兜底跟进）。
     * <p>
     * 退款调用抛异常视为发起失败（调用方整体回滚，无脏数据）。
     */
    ChannelRefundResult refund(RefundCommand command, SalonTenantPayConfig config);

    /**
     * 按商户退款单号查退款状态（查单兜底，防退款回调丢失卡死退款单）。
     * <p>
     * 默认不支持：仅退款异步确认的渠道（微信）覆写；同步退款渠道（支付宝）不产生 processing 态行，不会被扫到。
     */
    default ChannelRefundResult queryRefundStatus(String outRefundNo, SalonTenantPayConfig config) {
        throw new UnsupportedOperationException("渠道不支持退款状态查询：" + channel());
    }
}
