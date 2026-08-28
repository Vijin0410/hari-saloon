package com.wangjin.salon.service.pay;

import cn.hutool.core.util.RandomUtil;
import cn.hutool.core.util.StrUtil;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.KeyFactory;
import java.security.PrivateKey;
import java.security.Signature;
import java.security.spec.InvalidKeySpecException;
import java.security.spec.PKCS8EncodedKeySpec;
import java.time.Duration;
import java.util.Base64;

/**
 * 微信支付 V3 只读验参客户端（租户支付配置保存自检用，docs/payment-design.md §9）。
 * <p>
 * 调 {@code GET /v3/certificates}：以商户私钥对签名串做 SHA256withRSA，
 * HTTP 200 即证明 mch_id + 商户证书序列号 + 商户私钥 三元组匹配（不依赖 SDK、不下单、不产生交易）。
 * 二期引 wechatpay-java 后可替换本类，业务侧只依赖 {@link #verify} 语义。
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class WxpayV3Verifier {

    private static final String CERTIFICATES_URL = "https://api.mch.weixin.qq.com/v3/certificates";
    private static final String SIGN_PATH = "/v3/certificates";

    private final ObjectMapper objectMapper;

    /**
     * 验参结果。
     *
     * @param pass         true = 渠道确认参数有效
     * @param networkError true = 网络/未知异常，参数未能确认（不算 invalid，状态保持 pending）
     * @param message      面向用户的结果说明
     */
    public record VerifyOutcome(boolean pass, boolean networkError, String message) {
    }

    /**
     * 验参（微信直连三元组）。
     *
     * @param mchId        商户号
     * @param certSerialNo 商户证书序列号
     * @param privateKeyPem 商户私钥 PEM 全文（PKCS#8，即 apiclient_key.pem）
     */
    public VerifyOutcome verify(String mchId, String certSerialNo, String privateKeyPem) {
        try {
            String authorization = buildAuthorization(mchId, certSerialNo, privateKeyPem);
            HttpClient client = HttpClient.newBuilder()
                    .connectTimeout(Duration.ofSeconds(5))
                    .build();
            HttpRequest request = HttpRequest.newBuilder(URI.create(CERTIFICATES_URL))
                    .timeout(Duration.ofSeconds(10))
                    .header("Authorization", authorization)
                    .header("Accept", "application/json")
                    .header("User-Agent", "hair-salon-pay-config-verify")
                    .GET()
                    .build();
            HttpResponse<String> response =
                    client.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            if (response.statusCode() == 200) {
                return new VerifyOutcome(true, false, "微信支付参数验证通过（商户号/证书序列号/私钥匹配）");
            }
            log.warn("微信V3验参被拒绝 mchId={} status={} body={}", mchId, response.statusCode(), response.body());
            return new VerifyOutcome(false, false,
                    "微信支付拒绝该参数（HTTP " + response.statusCode() + "）：" + extractMessage(response.body()));
        } catch (IllegalArgumentException e) {
            return new VerifyOutcome(false, false, e.getMessage());
        } catch (Exception e) {
            log.warn("微信V3验参网络异常 mchId={}", mchId, e);
            return new VerifyOutcome(false, true, "无法连接微信支付（" + e.getMessage() + "），参数未能确认，请稍后重试");
        }
    }

    /** 构造 Authorization 头：WECHATPAY2-SHA256-RSA2048（签名串 = 方法\n路径\n时间戳\n随机串\n报文\n，GET 报文为空） */
    private String buildAuthorization(String mchId, String certSerialNo, String privateKeyPem) throws Exception {
        long timestamp = System.currentTimeMillis() / 1000;
        String nonce = RandomUtil.randomString(32);
        String message = "GET\n" + SIGN_PATH + "\n" + timestamp + "\n" + nonce + "\n\n";
        PrivateKey privateKey = parsePrivateKey(privateKeyPem);
        Signature signature = Signature.getInstance("SHA256withRSA");
        signature.initSign(privateKey);
        signature.update(message.getBytes(StandardCharsets.UTF_8));
        String sign = Base64.getEncoder().encodeToString(signature.sign());
        return "WECHATPAY2-SHA256-RSA2048 mchid=\"" + mchId + "\",nonce_str=\"" + nonce
                + "\",timestamp=\"" + timestamp + "\",serial_no=\"" + certSerialNo
                + "\",signature=\"" + sign + "\"";
    }

    /** 解析 PKCS#8 私钥 PEM（微信 apiclient_key.pem 格式） */
    private PrivateKey parsePrivateKey(String pem) {
        if (StrUtil.isBlank(pem) || !pem.contains("PRIVATE KEY")) {
            throw new IllegalArgumentException("商户私钥格式不正确（须为 apiclient_key.pem 的 PEM 全文）");
        }
        String base64 = pem
                .replace("-----BEGIN PRIVATE KEY-----", "")
                .replace("-----END PRIVATE KEY-----", "")
                .replaceAll("\\s", "");
        byte[] der;
        try {
            der = Base64.getDecoder().decode(base64);
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("商户私钥不是有效的 Base64 编码");
        }
        try {
            return KeyFactory.getInstance("RSA").generatePrivate(new PKCS8EncodedKeySpec(der));
        } catch (InvalidKeySpecException e) {
            throw new IllegalArgumentException("商户私钥须为 PKCS#8 格式（微信 apiclient_key.pem）");
        } catch (Exception e) {
            throw new IllegalArgumentException("商户私钥解析失败");
        }
    }

    /** 提取微信错误响应的 message 字段，便于用户定位（如证书序列号不匹配） */
    private String extractMessage(String body) {
        if (StrUtil.isBlank(body)) {
            return "无响应说明";
        }
        try {
            JsonNode node = objectMapper.readTree(body);
            String message = node.path("message").asText(null);
            return StrUtil.isBlank(message) ? body : message;
        } catch (Exception e) {
            return body;
        }
    }
}
