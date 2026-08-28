package com.wangjin.salon.service.pay;

import cn.hutool.core.util.StrUtil;
import com.alipay.api.AlipayApiException;
import com.alipay.api.AlipayClient;
import com.alipay.api.request.AlipayTradeQueryRequest;
import com.alipay.api.response.AlipayTradeQueryResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

/**
 * 支付宝直连在线验参（租户支付配置保存自检用，docs/payment-design.md §9）。
 * <p>
 * 调只读接口 {@code alipay.trade.query} 查询一个不可能存在的哑单号：
 * 返回 ACQ.TRADE_NOT_EXIST（交易不存在）即证明 网关+AppID+应用私钥签名+支付宝公钥验签 全链路匹配
 * （不产生交易）。签名/密钥类错误按 invalid，网络异常保持 pending（沙箱环境波动常见，自动重试一次）。
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class AlipayParamVerifier {

    /** 交易不存在（验参预期结果：参数全通但查不到该哑单） */
    private static final String SUB_CODE_TRADE_NOT_EXIST = "ACQ.TRADE_NOT_EXIST";

    /** 网络类失败自动重试次数（沙箱网关偶发 504/超时，重试一次可消化大部分波动） */
    private static final int NETWORK_RETRY = 1;

    private final AlipayClientHolder clientHolder;

    /**
     * 验参结果（与 {@link WxpayV3Verifier.VerifyOutcome} 语义一致）。
     *
     * @param pass         true = 渠道确认参数有效
     * @param networkError true = 网络/未知异常，参数未能确认（不算 invalid，状态保持 pending）
     * @param message      面向用户的结果说明
     */
    public record VerifyOutcome(boolean pass, boolean networkError, String message) {
    }

    /**
     * 验参（支付宝直连公钥模式四元组）。
     *
     * @param appId               支付宝应用 AppID
     * @param privateKeyPlain     应用私钥明文（密钥工具生成，裸 Base64 或 PKCS#8 PEM）
     * @param alipayPublicKeyPlain 支付宝公钥明文
     */
    public VerifyOutcome verify(String appId, String privateKeyPlain, String alipayPublicKeyPlain) {
        AlipayClient client;
        try {
            client = clientHolder.buildClient(appId, privateKeyPlain, alipayPublicKeyPlain);
        } catch (Exception e) {
            log.warn("支付宝验参构建客户端失败 appId={}", appId, e);
            return new VerifyOutcome(false, false, "应用私钥/支付宝公钥解析失败，请检查密钥内容");
        }
        // 哑单号：真实充值单号不会以 VERIFY 开头，查询必然「交易不存在」
        String dummyOutTradeNo = "VERIFY" + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"));
        AlipayTradeQueryRequest request = new AlipayTradeQueryRequest();
        request.setBizContent("{\"out_trade_no\":\"" + dummyOutTradeNo + "\"}");

        AlipayTradeQueryResponse response = null;
        String lastNetworkError = null;
        for (int attempt = 0; attempt <= NETWORK_RETRY; attempt++) {
            try {
                response = client.execute(request);
                break;
            } catch (AlipayApiException e) {
                // AlipayApiException=HTTP 层/网络层失败（连接超时/网关 5xx HTML 等）；业务参数错误走 response 分支
                lastNetworkError = StrUtil.blankToDefault(e.getErrMsg(), e.getMessage());
                log.warn("支付宝验参网络异常（第{}次）appId={} err={}", attempt + 1, appId, lastNetworkError);
            }
        }
        if (response == null) {
            String hint = isGatewayTimeout(lastNetworkError)
                    ? "支付宝网关超时（沙箱环境波动常见，请稍后重试）"
                    : "无法连接支付宝开放平台（" + lastNetworkError + "），请稍后重试";
            return new VerifyOutcome(false, true, hint + "，参数未能确认");
        }
        if (response.isSuccess()) {
            // 哑单号查到交易=异常数据（不可能出现），按参数全通处理
            return new VerifyOutcome(true, false, "支付宝参数验证通过（网关/AppID/应用私钥/支付宝公钥匹配）");
        }
        String subCode = response.getSubCode();
        if (SUB_CODE_TRADE_NOT_EXIST.equals(subCode)) {
            return new VerifyOutcome(true, false, "支付宝参数验证通过（网关/AppID/应用私钥/支付宝公钥匹配）");
        }
        // 参数被支付宝拒绝：签名错误（密钥不匹配）/无效AppID等
        log.warn("支付宝验参被拒绝 appId={} code={} subCode={} subMsg={}",
                appId, response.getCode(), subCode, response.getSubMsg());
        String message = StrUtil.isNotBlank(response.getSubMsg())
                ? response.getSubMsg() : StrUtil.nullToDefault(response.getMsg(), "参数被支付宝拒绝");
        String subCodeSuffix = StrUtil.isBlank(subCode) ? "" : "（" + subCode + "）";
        return new VerifyOutcome(false, false, "支付宝拒绝该参数：" + message + subCodeSuffix);
    }

    /** 网关超时特征（支付宝 Tengine 返回的 504 HTML 报文等），给出针对性提示 */
    private boolean isGatewayTimeout(String errMsg) {
        return errMsg != null && (errMsg.contains("504") || errMsg.contains("502") || errMsg.contains("Gateway"));
    }
}
