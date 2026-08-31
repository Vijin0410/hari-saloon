package com.wangjin.salon.service.pay;

import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.wechat.pay.java.core.notification.NotificationParser;
import com.wechat.pay.java.core.notification.RequestParam;
import com.wechat.pay.java.service.payments.model.Transaction;
import com.wangjin.common.exception.BizException;
import com.wangjin.salon.service.mapper.SalonPayRecordMapper;
import com.wangjin.salon.service.mapper.SalonTenantPayConfigMapper;
import com.wangjin.salon.service.model.entity.SalonPayRecord;
import com.wangjin.salon.service.model.entity.SalonTenantPayConfig;
import com.wangjin.salon.system.util.TenantContextRunner;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;

/**
 * 微信支付回调处理（验签 + 解密 + 确认入账）。
 * <p>
 * 回调 URL 按租户带参（notify_url 拼接 tenantId），到达后切租户上下文定位商户配置，
 * 用 NotificationParser（平台证书验签 + APIv3 key 解密）解析出 Transaction；
 * 验签即保证 tenantId 参数不可伪造。确认入账见 {@link PayConfirmDispatcher}（幂等）。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class WxpayNotifyService {

    private final WxpayConfigHolder configHolder;
    private final SalonTenantPayConfigMapper payConfigMapper;
    private final SalonPayRecordMapper payRecordMapper;
    private final PayConfirmDispatcher confirmDispatcher;

    /**
     * 处理微信支付结果回调。
     *
     * @param tenantId     回调 URL 携带的租户参数（下单时拼入）
     * @param requestParam 微信回调请求参数（序列号/时间戳/随机串/签名/报文体）
     * @throws BizException 验签失败/配置异常/入账失败（Controller 应答 FAIL，微信按失败重试）
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
            log.warn("微信回调到达但租户未启用微信渠道 tenantId={}", tenantId);
            throw new BizException("租户未启用微信支付渠道");
        }
        NotificationParser parser = new NotificationParser(configHolder.get(cfg));
        Transaction transaction = parser.parse(requestParam, Transaction.class);
        log.info("微信回调解析成功 tenantId={} outTradeNo={} tradeState={}",
                tenantId, transaction.getOutTradeNo(),
                transaction.getTradeState() == null ? null : transaction.getTradeState().name());

        // 只处理支付成功；非终态（NOTPAY/USERPAYING 等）交由查单兜底任务跟进
        if (transaction.getTradeState() != Transaction.TradeStateEnum.SUCCESS) {
            log.info("微信回调非支付成功态，忽略等待查单兜底 outTradeNo={} tradeState={}",
                    transaction.getOutTradeNo(), transaction.getTradeState());
            return;
        }
        SalonPayRecord record = payRecordMapper.selectOne(Wrappers.<SalonPayRecord>lambdaQuery()
                .eq(SalonPayRecord::getOutTradeNo, transaction.getOutTradeNo())
                .eq(SalonPayRecord::getStatus, SalonPayRecord.STATUS_PENDING)
                .last("LIMIT 1"));
        if (record == null) {
            // 已支付过（幂等重试）或未知单号：应答成功避免微信无限重试
            log.info("微信回调无待处理流水（已处理或未知单号），应答成功 outTradeNo={}", transaction.getOutTradeNo());
            return;
        }
        confirmDispatcher.confirm(record, new PayConfirmParams(
                transaction.getTransactionId(),
                parseSuccessTime(transaction.getSuccessTime()),
                transaction.getAmount() == null ? null : transaction.getAmount().getTotal(),
                transaction.getAmount() == null ? null : transaction.getAmount().getPayerTotal(),
                SalonPayRecord.SOURCE_REALTIME_CALLBACK,
                requestParam.getBody()));
    }

    /** RFC3339 时间串（如 2018-06-08T10:34:56+08:00）转本地时间；空返回 null */
    private LocalDateTime parseSuccessTime(String rfc3339) {
        if (StrUtil.isBlank(rfc3339)) {
            return null;
        }
        try {
            return OffsetDateTime.parse(rfc3339, DateTimeFormatter.ISO_OFFSET_DATE_TIME)
                    .atZoneSameInstant(ZoneId.systemDefault())
                    .toLocalDateTime();
        } catch (Exception e) {
            log.warn("微信回调支付完成时间解析失败：{}", rfc3339);
            return null;
        }
    }
}
