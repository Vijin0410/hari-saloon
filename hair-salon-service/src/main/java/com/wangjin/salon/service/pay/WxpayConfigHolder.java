package com.wangjin.salon.service.pay;

import cn.hutool.core.util.StrUtil;
import com.wechat.pay.java.core.RSAAutoCertificateConfig;
import com.wangjin.common.exception.BizException;
import com.wangjin.salon.service.model.entity.SalonTenantPayConfig;
import com.wangjin.salon.service.util.Sm4Cipher;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.Objects;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 微信支付 V3 商户配置缓存（每租户一套，wechatpay-java RSAAutoCertificateConfig）。
 * <p>
 * RSAAutoCertificateConfig 构建时会拉取并缓存微信平台证书（供回调验签），代价较高，按租户缓存；
 * 配置变更（updateTime 变化）后下次取用时自动重建。容忍并发下偶发重复构建（覆盖写，无害）。
 * 注意：必须在租户上下文内调用（salon_tenant_pay_config 走租户行级过滤）。
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class WxpayConfigHolder {

    private final Sm4Cipher sm4Cipher;

    private final ConcurrentHashMap<Long, Cached> cache = new ConcurrentHashMap<>();

    private record Cached(LocalDateTime configVersion, RSAAutoCertificateConfig config) {
    }

    /**
     * 取微信 SDK Config（租户上下文内调用；缓存按配置版本失效）。RSAAutoCertificateConfig 同时实现 Config 与回调验签 NotificationConfig。
     * <p>
     * 激活配置的获取统一走 {@code TenantPayConfigService.requireActiveConfig(channel)}。
     */
    public RSAAutoCertificateConfig get(SalonTenantPayConfig cfg) {
        Cached cached = cache.get(cfg.getTenantId());
        if (cached != null && Objects.equals(cached.configVersion(), cfg.getUpdateTime())) {
            return cached.config();
        }
        RSAAutoCertificateConfig config = build(cfg);
        cache.put(cfg.getTenantId(), new Cached(cfg.getUpdateTime(), config));
        return config;
    }

    /** 构建失败（密钥解密/参数错误/网络拉证书失败）统一抛业务异常，微信会按失败重试回调 */
    private RSAAutoCertificateConfig build(SalonTenantPayConfig cfg) {
        String privateKey = sm4Cipher.decrypt(cfg.getPrivateKey());
        String apiV3Key = sm4Cipher.decrypt(cfg.getApiV3Key());
        if (StrUtil.hasBlank(privateKey, apiV3Key) || StrUtil.isBlank(cfg.getMchId())
                || StrUtil.isBlank(cfg.getCertSerialNo()) || StrUtil.isBlank(cfg.getAppId())) {
            throw new BizException("微信支付配置不完整（AppID/商户号/证书序列号/APIv3密钥/私钥）");
        }
        try {
            return new RSAAutoCertificateConfig.Builder()
                    .merchantId(cfg.getMchId())
                    .privateKey(privateKey)
                    .merchantSerialNumber(cfg.getCertSerialNo())
                    .apiV3Key(apiV3Key)
                    .build();
        } catch (Exception e) {
            log.error("微信支付配置构建失败 tenantId={} mchId={}", cfg.getTenantId(), cfg.getMchId(), e);
            throw new BizException("微信支付配置初始化失败，请检查支付参数");
        }
    }
}

