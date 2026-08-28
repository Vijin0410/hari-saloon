package com.wangjin.salon.service.controller;

import com.wangjin.common.exception.BizException;
import com.wangjin.salon.service.pay.AlipayNotifyService;
import com.wangjin.salon.service.pay.WxpayNotifyService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * 渠道支付回调入口（免鉴权：已加入 wj.security.jwt.ignore-urls，靠各渠道验签防伪造）。
 * <p>
 * 应答协议按渠道规范而非统一 Result：微信要求成功 200 + {"code":"SUCCESS"}、
 * 失败 4xx/5xx + {"code":"FAIL","message":...}（失败会触发微信重试，业务幂等由确认链路保证）；
 * 支付宝要求成功应答纯文本 success、失败应答 failure（失败触发支付宝按 4m/10m/1h/6h… 重试）。
 */
@Slf4j
@Tag(name = "21.渠道支付回调")
@RestController
@RequestMapping("/api/v1/pay")
@RequiredArgsConstructor
public class PayNotifyController {

    private final WxpayNotifyService wxpayNotifyService;
    private final AlipayNotifyService alipayNotifyService;

    /**
     * 微信支付结果回调。
     * <p>
     * notify_url 下单时按租户拼路径段（/{tenantId}，微信不允许 notify_url 携带查询串），
     * 到达后切租户上下文定位商户配置，NotificationParser 平台证书验签（tenantId 伪造会导致验签失败）。
     */
    @Operation(summary = "微信支付回调（免鉴权，验签兜底）")
    @PostMapping("/notify/wxpay/{tenantId}")
    public ResponseEntity<Map<String, String>> wxpayNotify(
            @PathVariable("tenantId") Long tenantId,
            @RequestHeader(value = "Wechatpay-Serial", required = false) String serial,
            @RequestHeader(value = "Wechatpay-Nonce", required = false) String nonce,
            @RequestHeader(value = "Wechatpay-Timestamp", required = false) String timestamp,
            @RequestHeader(value = "Wechatpay-Signature", required = false) String signature,
            @RequestBody String body) {
        if (tenantId == null || serial == null || nonce == null || timestamp == null || signature == null) {
            return fail(HttpStatus.BAD_REQUEST, "回调参数缺失");
        }
        try {
            // 与 Spring @RequestParam 同名冲突，wechatpay 的回调参数用全限定名构造
            com.wechat.pay.java.core.notification.RequestParam requestParam =
                    new com.wechat.pay.java.core.notification.RequestParam.Builder()
                            .serialNumber(serial)
                            .nonce(nonce)
                            .timestamp(timestamp)
                            .signature(signature)
                            .body(body)
                            .build();
            wxpayNotifyService.handle(tenantId, requestParam);
            return ResponseEntity.ok(Map.of("code", "SUCCESS", "message", "成功"));
        } catch (BizException e) {
            log.warn("微信回调处理失败 tenantId={}：{}", tenantId, e.getMessage());
            return fail(HttpStatus.INTERNAL_SERVER_ERROR, e.getMessage());
        } catch (Exception e) {
            // 验签失败/解密失败等：微信按失败重试，确认链路幂等兜底
            log.error("微信回调处理异常 tenantId={}", tenantId, e);
            return fail(HttpStatus.UNAUTHORIZED, "回调验签或处理失败");
        }
    }

    /**
     * 支付宝支付结果异步通知（form 表单参数）。
     * <p>
     * notify_url 下单时按租户拼路径段（/{tenantId}，支付宝不允许 notify_url 携带查询串自定义参数，
     * 原 ?tenantId= 触发 ACQ.INVALID_PARAMETER），到达后切租户上下文定位商户配置，
     * 支付宝公钥 RSA2 验签（tenantId 伪造会导致验签失败）；成功应答纯文本 success。
     */
    @Operation(summary = "支付宝支付回调（免鉴权，验签兜底）")
    @PostMapping(value = "/notify/alipay/{tenantId}", produces = org.springframework.http.MediaType.TEXT_PLAIN_VALUE)
    public String alipayNotify(@PathVariable("tenantId") Long tenantId, @RequestParam Map<String, String> params) {
        if (tenantId == null) {
            log.warn("支付宝回调缺少租户参数");
            return "failure";
        }
        try {
            alipayNotifyService.handle(tenantId, params);
            return "success";
        } catch (BizException e) {
            log.warn("支付宝回调处理失败 tenantId={}：{}", tenantId, e.getMessage());
            return "failure";
        } catch (Exception e) {
            // 验签失败/入账异常等：支付宝按失败重试，确认链路幂等兜底
            log.error("支付宝回调处理异常 tenantId={}", tenantId, e);
            return "failure";
        }
    }

    private ResponseEntity<Map<String, String>> fail(HttpStatus status, String message) {
        return ResponseEntity.status(status).body(Map.of("code", "FAIL", "message", message));
    }
}
