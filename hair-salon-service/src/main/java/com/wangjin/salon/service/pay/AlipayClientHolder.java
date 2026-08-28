package com.wangjin.salon.service.pay;

import cn.hutool.core.util.StrUtil;
import com.alipay.api.AlipayClient;
import com.alipay.api.AlipayConfig;
import com.alipay.api.DefaultAlipayClient;
import com.wangjin.common.exception.BizException;
import com.wangjin.salon.service.config.PayProperties;
import com.wangjin.salon.service.model.entity.SalonTenantPayConfig;
import com.wangjin.salon.service.util.Sm4Cipher;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.Objects;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 支付宝商户配置缓存（每租户一套 DefaultAlipayClient，公钥模式 RSA2）。
 * <p>
 * 网关取 {@link PayProperties#getAlipayGatewayUrl()}（正式/沙箱全局切换）；
 * 配置变更（updateTime 变化）后下次取用时自动重建。容忍并发下偶发重复构建（覆盖写，无害）。
 * 注意：必须在租户上下文内调用（salon_tenant_pay_config 走租户行级过滤）。
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class AlipayClientHolder {

    private final Sm4Cipher sm4Cipher;
    private final PayProperties payProperties;

    private final ConcurrentHashMap<Long, Cached> cache = new ConcurrentHashMap<>();

    private record Cached(LocalDateTime configVersion, AlipayClient client) {
    }

    /** 取支付宝 SDK Client（租户上下文内调用；缓存按配置版本失效） */
    public AlipayClient get(SalonTenantPayConfig cfg) {
        Cached cached = cache.get(cfg.getTenantId());
        if (cached != null && Objects.equals(cached.configVersion(), cfg.getUpdateTime())) {
            return cached.client();
        }
        AlipayClient client = build(cfg);
        cache.put(cfg.getTenantId(), new Cached(cfg.getUpdateTime(), client));
        return client;
    }

    /** 构建失败（密钥解密/参数错误）统一抛业务异常，上层按渠道失败处理 */
    private AlipayClient build(SalonTenantPayConfig cfg) {
        String privateKey = sm4Cipher.decrypt(cfg.getPrivateKey());
        String alipayPublicKey = sm4Cipher.decrypt(cfg.getPlatformPublicKey());
        if (StrUtil.hasBlank(privateKey, alipayPublicKey)
                || StrUtil.isBlank(cfg.getAppId()) || StrUtil.isBlank(cfg.getMchId())) {
            throw new BizException("支付宝配置不完整（AppID/合作者身份ID/应用私钥/支付宝公钥）");
        }
        try {
            return buildClient(cfg.getAppId(), privateKey, alipayPublicKey);
        } catch (BizException e) {
            throw e;
        } catch (Exception e) {
            log.error("支付宝配置构建失败 tenantId={} appId={}", cfg.getTenantId(), cfg.getAppId(), e);
            throw new BizException("支付宝配置初始化失败，请检查支付参数");
        }
    }

    /**
     * 构建支付宝 Client（公钥模式 RSA2；在线验参共用）。
     * <p>
     * 超时拉长到 connect 5s / read 30s（SDK 默认 3s/15s，沙箱环境波动时易踩线）；
     * 网关 http:// 自动升级 https://（防呆，支付宝网关全站支持 https）。
     */
    public AlipayClient buildClient(String appId, String privateKeyPlain, String alipayPublicKeyPlain)
            throws com.alipay.api.AlipayApiException {
        AlipayConfig config = new AlipayConfig();
        config.setAppId(appId);
        config.setPrivateKey(normalizeKey(privateKeyPlain));
        config.setAlipayPublicKey(normalizeKey(alipayPublicKeyPlain));
        config.setServerUrl(gatewayUrl());
        config.setFormat("json");
        config.setCharset("utf-8");
        config.setSignType("RSA2");
        // 超时拉长到 connect 5s / read 30s（SDK 默认 3s/15s，沙箱环境波动时易踩线）
        config.setConnectTimeout(5000);
        config.setReadTimeout(30000);
        return new DefaultAlipayClient(config);
    }

    /** 网关地址（http 防呆升级 https，正式/沙箱由 wj.salon.pay.alipay-gateway-url 切换） */
    public String gatewayUrl() {
        String url = payProperties.getAlipayGatewayUrl();
        if (url != null && url.startsWith("http://")) {
            log.warn("支付宝网关配置为 http，已自动升级为 https（wj.salon.pay.alipay-gateway-url={}）", url);
            url = "https://" + url.substring("http://".length());
        }
        return url;
    }

    /** 密钥归一（public 供回调验签复用同一口径）：剥 PEM 头尾/换行/空白，兼容「支付宝开放平台密钥工具」裸 Base64 与 PKCS#8 PEM 两种粘贴格式 */
    public String normalizeKey(String key) {
        String normalized = key.replaceAll("-----[A-Z ]+-----", "")
                .replaceAll("\\s+", "")
                .trim();
        if (StrUtil.isBlank(normalized)) {
            throw new BizException("支付密钥内容为空，请检查粘贴内容");
        }
        return normalized;
    }
}
