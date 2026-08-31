package com.wangjin.salon.service.pay;

import cn.hutool.core.util.StrUtil;
import cn.hutool.json.JSONUtil;
import com.alipay.api.AlipayApiException;
import com.alipay.api.internal.util.AlipaySignature;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.wangjin.common.exception.BizException;
import com.wangjin.salon.service.mapper.SalonPayRecordMapper;
import com.wangjin.salon.service.mapper.SalonTenantPayConfigMapper;
import com.wangjin.salon.service.model.entity.SalonPayRecord;
import com.wangjin.salon.service.model.entity.SalonTenantPayConfig;
import com.wangjin.salon.service.util.Sm4Cipher;
import com.wangjin.salon.system.util.TenantContextRunner;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.Map;

/**
 * 支付宝支付回调处理（验签 + 确认入账）。
 * <p>
 * 回调为 form 表单明文参数（非微信的加密报文），租户标识由回调路径段携带（支付宝不允许
 * notify_url 携带查询串，Controller 的 /{tenantId} 传入），到达后切租户上下文定位商户配置，
 * 再用支付宝公钥 rsaCheckV1 验签（tenantId 伪造会导致验签失败）；
 * 仅 trade_status=TRADE_SUCCESS/TRADE_FINISHED 入账，确认链路见 {@link PayConfirmDispatcher}（幂等）。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AlipayNotifyService {

    /** 支付宝通知支付时间格式（gmt_payment） */
    private static final DateTimeFormatter PAY_TIME_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    private final AlipayClientHolder clientHolder;
    private final SalonTenantPayConfigMapper payConfigMapper;
    private final SalonPayRecordMapper payRecordMapper;
    private final PayConfirmDispatcher confirmDispatcher;
    private final Sm4Cipher sm4Cipher;

    /**
     * 处理支付宝异步通知。
     *
     * @param tenantId 回调 URL 路径段携带的租户标识（下单时拼入）
     * @param params   支付宝 form 参数集（含 sign/sign_type）
     * @throws BizException 验签失败/配置异常/入账失败（Controller 应答 failure，支付宝按失败重试）
     */
    public void handle(Long tenantId, Map<String, String> params) {
        TenantContextRunner.run(tenantId, () -> doHandle(tenantId, params));
    }

    private void doHandle(Long tenantId, Map<String, String> params) {
        String outTradeNo = params.get("out_trade_no");
        String tradeStatus = params.get("trade_status");
        log.info("支付宝回调到达 tenantId={} outTradeNo={} tradeStatus={}", tenantId, outTradeNo, tradeStatus);

        SalonTenantPayConfig cfg = payConfigMapper.selectOne(Wrappers.<SalonTenantPayConfig>lambdaQuery()
                .eq(SalonTenantPayConfig::getChannel, AlipayChannelService.CHANNEL)
                .eq(SalonTenantPayConfig::getEnabled, 1)
                .last("LIMIT 1"));
        if (cfg == null) {
            log.warn("支付宝回调到达但租户未启用支付宝渠道 tenantId={}", tenantId);
            throw new BizException("租户未启用支付宝支付渠道");
        }
        verifySignature(cfg, params);

        // 只处理支付成功（TRADE_FINISHED=交易结束不可退款，同为已收款）；其余终态应答成功避免无限重试，交由查单兜底跟进
        if (!"TRADE_SUCCESS".equals(tradeStatus) && !"TRADE_FINISHED".equals(tradeStatus)) {
            log.info("支付宝回调非支付成功态，忽略等待查单兜底 outTradeNo={} tradeStatus={}", outTradeNo, tradeStatus);
            return;
        }
        SalonPayRecord record = payRecordMapper.selectOne(Wrappers.<SalonPayRecord>lambdaQuery()
                .eq(SalonPayRecord::getOutTradeNo, outTradeNo)
                .eq(SalonPayRecord::getStatus, SalonPayRecord.STATUS_PENDING)
                .last("LIMIT 1"));
        if (record == null) {
            // 已支付过（幂等重试）或未知单号：应答成功避免支付宝无限重试
            log.info("支付宝回调无待处理流水（已处理或未知单号），应答成功 outTradeNo={}", outTradeNo);
            return;
        }
        confirmDispatcher.confirm(record, new PayConfirmParams(
                params.get("trade_no"),
                parsePayTime(params.get("gmt_payment")),
                toFen(params.get("total_amount")),
                toFen(params.get("buyer_pay_amount")),
                SalonPayRecord.SOURCE_REALTIME_CALLBACK,
                JSONUtil.toJsonStr(params)));
    }

    /** 支付宝公钥验签（RSA2）；防御性剔除 tenantId（路径式回调本不含，防 URL 被附加 query 参数破坏验签） */
    private void verifySignature(SalonTenantPayConfig cfg, Map<String, String> params) {
        Map<String, String> signParams = new HashMap<>(params);
        signParams.remove("tenantId");
        String alipayPublicKey;
        try {
            alipayPublicKey = clientHolder.normalizeKey(sm4Cipher.decrypt(cfg.getPlatformPublicKey()));
        } catch (BizException e) {
            throw e;
        } catch (Exception e) {
            log.error("支付宝回调验签解密公钥失败 tenantId={}", cfg.getTenantId(), e);
            throw new BizException("支付宝公钥解密失败");
        }
        try {
            if (!AlipaySignature.rsaCheckV1(signParams, alipayPublicKey, "utf-8", "RSA2")) {
                log.warn("支付宝回调验签失败 tenantId={} outTradeNo={}", cfg.getTenantId(), params.get("out_trade_no"));
                throw new BizException("支付宝回调验签失败");
            }
        } catch (AlipayApiException e) {
            throw new BizException("支付宝回调验签异常：" + e.getMessage());
        }
    }

    /** 金额串（元，如 "100.00"）-> 分；空返回 null */
    private Integer toFen(String totalAmountYuan) {
        if (StrUtil.isBlank(totalAmountYuan)) {
            return null;
        }
        return new BigDecimal(totalAmountYuan).movePointRight(2).intValueExact();
    }

    /** 支付完成时间（yyyy-MM-dd HH:mm:ss）解析；空/异常返回 null（confirm 链路兜底当前时间） */
    private LocalDateTime parsePayTime(String gmtPayment) {
        if (StrUtil.isBlank(gmtPayment)) {
            return null;
        }
        try {
            return LocalDateTime.parse(gmtPayment, PAY_TIME_FORMATTER);
        } catch (Exception e) {
            log.warn("支付宝回调支付完成时间解析失败：{}", gmtPayment);
            return null;
        }
    }
}
