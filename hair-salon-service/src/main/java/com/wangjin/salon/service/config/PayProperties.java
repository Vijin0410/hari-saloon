package com.wangjin.salon.service.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * 支付域配置（渠道密钥加密、回调地址、查单兜底任务）。
 */
@Data
@Component
@ConfigurationProperties(prefix = "wj.salon.pay")
public class PayProperties {

    /**
     * SM4 密钥（32 位 hex = 128bit，CBC + 随机 IV）。
     * <p>
     * 加密对象：微信 APIv3 密钥 / 商户私钥 / 支付宝应用私钥与公钥 / 聚合授权 token。
     * 生产必须覆盖默认值并妥善保管；密钥变更会导致存量密文无法解密，需提前规划换钥重灌。
     */
    private String sm4Key;

    /**
     * 支付回调基地址（须公网可达的 HTTPS 域名；本地开发可用内网穿透）。
     * <p>
     * 渠道下单时拼接成回调地址：{base}/api/v1/pay/notify/{channel}/{tenantId}
     * （路径式携带租户标识——支付宝/微信均要求 notify_url 为可直接访问地址、不允许携带查询串自定义参数）。
     * 回调按路径段定位租户商户配置（验签兜底防伪造），空值时发起直连下单将报错。
     */
    private String notifyBaseUrl;

    /**
     * 支付宝开放平台网关。
     * <p>
     * 默认正式环境；沙箱联调时切 {@code https://openapi-sandbox.dl.alipaydev.com/gateway.do}
     * （沙箱控制台的 APPID/密钥须与网关配套，扫码须用「支付宝沙箱钱包」App）。
     */
    private String alipayGatewayUrl = "https://openapi-sandbox.dl.alipaydev.com/gateway.do";

    /** 查单兜底任务开关（默认启用；扫各渠道 pending 支付流水主动查渠道，防回调丢失卡死订单） */
    private boolean queryEnabled = true;

    /** 查单兜底任务 cron（默认每 2 分钟） */
    private String queryCron = "0 */2 * * * ?";
}
