package com.wangjin.salon.service.pay;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.wechat.pay.java.core.notification.NotificationParser;
import com.wechat.pay.java.core.notification.RequestParam;
import com.wechat.pay.java.service.refund.model.RefundNotification;
import com.wangjin.common.exception.BizException;
import com.wangjin.salon.service.mapper.SalonRefundPaymentMapper;
import com.wangjin.salon.service.mapper.SalonTenantPayConfigMapper;
import com.wangjin.salon.service.model.entity.SalonRefundPayment;
import com.wangjin.salon.service.model.entity.SalonTenantPayConfig;
import com.wangjin.salon.system.util.TenantContextRunner;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

/**
 * 微信退款结果回调处理（P6，验签 + 确认生效）。
 * <p>
 * 回调 URL 路径式携带租户标识（/{tenantId}，退款请求 notify_url 拼入），到达后切租户上下文定位商户配置，
 * NotificationParser（平台证书验签 + APIv3 key 解密）解析出 {@link RefundNotification}；
 * refund_status=SUCCESS 走退款确认链路（幂等），ABNORMAL/CLOSED 置退款单失败（系统内未生效，可重新发起）。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class WxpayRefundNotifyService {

    private final WxpayConfigHolder configHolder;
    private final SalonTenantPayConfigMapper payConfigMapper;
    private final SalonRefundPaymentMapper refundPaymentMapper;
    private final OrderRefundConfirmExecutor confirmExecutor;

    /**
     * 处理微信退款结果回调。
     *
     * @param tenantId     回调 URL 路径段携带的租户标识（退款请求时拼入）
     * @param requestParam 微信回调请求参数（序列号/时间戳/随机串/签名/报文体）
     * @throws BizException 验签失败/配置异常/确认失败（Controller 应答 FAIL，微信按失败重试）
     */
    public void handle(Long tenantId, RequestParam requestParam) {
        TenantContextRunner.run(tenantId, () -> doHandle(tenantId, requestParam));
    }

    private void doHandle(Long tenantId, RequestParam requestParam) {
        SalonTenantPayConfig cfg = payConfigMapper.selectOne(Wrappers.<SalonTenantPayConfig>lambdaQuery()
                .eq(SalonTenantPayConfig::getChannel, WxpayChannelService.CHANNEL)
                .eq(SalonTenantPayConfig::getEnabled, 1)
                .last("LIMIT 1"));
        if (cfg == null) {
            log.warn("微信退款回调到达但租户未启用微信渠道 tenantId={}", tenantId);
            throw new BizException("租户未启用微信支付渠道");
        }
        NotificationParser parser = new NotificationParser(configHolder.get(cfg));
        RefundNotification notify = parser.parse(requestParam, RefundNotification.class);
        String outRefundNo = notify.getOutRefundNo();
        log.info("微信退款回调解析成功 tenantId={} outRefundNo={} refundStatus={}",
                tenantId, outRefundNo,
                notify.getRefundStatus() == null ? null : notify.getRefundStatus().name());

        SalonRefundPayment row = refundPaymentMapper.selectOne(Wrappers.<SalonRefundPayment>lambdaQuery()
                .eq(SalonRefundPayment::getChannel, WxpayChannelService.CHANNEL)
                .eq(SalonRefundPayment::getOutRefundNo, outRefundNo)
                .eq(SalonRefundPayment::getChannelStatus, SalonRefundPayment.CHANNEL_STATUS_PROCESSING)
                .last("LIMIT 1"));
        if (row == null) {
            // 已处理过（幂等重试）或未知单号：应答成功避免微信无限重试
            log.info("微信退款回调无待处理分摊行（已处理或未知单号），应答成功 outRefundNo={}", outRefundNo);
            return;
        }
        if (notify.getRefundStatus() == null) {
            log.warn("微信退款回调缺少退款状态，忽略等待查单兜底 outRefundNo={}", outRefundNo);
            return;
        }
        // 渠道退款单号与回调报文留痕（发起响应之外补充回调口径）
        refundPaymentMapper.update(null, Wrappers.<SalonRefundPayment>lambdaUpdate()
                .set(SalonRefundPayment::getChannelRefundNo, notify.getRefundId())
                .set(SalonRefundPayment::getRawPayload, notify.toString())
                .eq(SalonRefundPayment::getId, row.getId()));
        switch (notify.getRefundStatus()) {
            case SUCCESS -> confirmExecutor.confirm(row.getRefundId());
            case ABNORMAL, CLOSED -> confirmExecutor.fail(row.getRefundId(),
                    "微信退款" + notify.getRefundStatus().name());
            case PROCESSING -> log.info("微信退款渠道处理中，等待终态回调/查单兜底 outRefundNo={}", outRefundNo);
        }
    }
}
