package com.wangjin.salon.service.pay;

import cn.hutool.core.util.StrUtil;
import cn.hutool.json.JSONUtil;
import com.alipay.api.AlipayApiException;
import com.alipay.api.AlipayClient;
import com.alipay.api.request.AlipayTradePrecreateRequest;
import com.alipay.api.request.AlipayTradeQueryRequest;
import com.alipay.api.response.AlipayTradePrecreateResponse;
import com.alipay.api.response.AlipayTradeQueryResponse;
import com.wangjin.common.exception.BizException;
import com.wangjin.salon.service.model.entity.SalonTenantPayConfig;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Date;

/**
 * 支付宝直连渠道实现（当面付扫码，alipay-sdk-java 官方 SDK，公钥模式 RSA2）。
 * <p>
 * Native 扫码对应「当面付 precreate」（顾客支付宝 App 扫商家二维码），返回 qr_code 渲染二维码；
 * 查单 trade.query，trade_status 归一为 {@link ChannelQueryResult} 通用状态（业务侧不感知支付宝枚举）。
 * 金额校验口径=total_amount（订单实收总额；买家红包抵扣部分不影响商家实收）。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AlipayChannelService implements PayChannel {

    public static final String CHANNEL = "alipay";

    private final AlipayClientHolder clientHolder;

    @Override
    public String channel() {
        return CHANNEL;
    }

    @Override
    public String nativePrepay(PayPrepayCommand command, SalonTenantPayConfig config) {
        try {
            AlipayClient client = clientHolder.get(config);
            AlipayTradePrecreateRequest request = new AlipayTradePrecreateRequest();
            request.setBizContent(JSONUtil.createObj()
                    .set("out_trade_no", command.outTradeNo())
                    .set("total_amount", toAmountYuan(command.amount()))
                    .set("subject", command.description())
                    .toString());
            request.setNotifyUrl(command.notifyUrl());
            AlipayTradePrecreateResponse response = client.execute(request);
            if (!response.isSuccess()) {
                log.error("支付宝当面付下单失败 outTradeNo={} code={} subCode={} subMsg={} bizContent={} notifyUrl={}",
                        command.outTradeNo(), response.getCode(), response.getSubCode(), response.getSubMsg(),
                        request.getBizContent(), request.getNotifyUrl());
                throw new BizException("支付宝下单失败：" + subMessage(response));
            }
            log.info("支付宝当面付下单成功 outTradeNo={} appId={}", command.outTradeNo(), config.getAppId());
            return response.getQrCode();
        } catch (BizException e) {
            throw e;
        } catch (AlipayApiException e) {
            log.error("支付宝当面付下单异常 outTradeNo={}", command.outTradeNo(), e);
            throw new BizException("支付宝支付下单失败：" + e.getErrMsg());
        } catch (Exception e) {
            log.error("支付宝当面付下单异常 outTradeNo={}", command.outTradeNo(), e);
            throw new BizException("支付宝支付下单失败：" + e.getMessage());
        }
    }

    @Override
    public ChannelQueryResult queryByOutTradeNo(String outTradeNo, SalonTenantPayConfig config) {
        try {
            AlipayClient client = clientHolder.get(config);
            AlipayTradeQueryRequest request = new AlipayTradeQueryRequest();
            request.setBizContent(JSONUtil.createObj()
                    .set("out_trade_no", outTradeNo)
                    .toString());
            AlipayTradeQueryResponse response = client.execute(request);
            if (!response.isSuccess()) {
                // 40004/ACQ.TRADE_NOT_EXIST：支付宝侧无此单（未支付且已过期清理）——按渠道查单失败处理，超时由补偿任务关闭
                throw new BizException("支付宝查单：" + subMessage(response));
            }
            return new ChannelQueryResult(
                    normalizeTradeState(response.getTradeStatus()),
                    response.getTradeNo(),
                    toLocalDateTime(response.getSendPayDate()),
                    toFen(response.getTotalAmount()),
                    toFen(response.getBuyerPayAmount()));
        } catch (BizException e) {
            throw e;
        } catch (AlipayApiException e) {
            log.error("支付宝查单异常 outTradeNo={}", outTradeNo, e);
            throw new BizException("支付宝查单失败：" + e.getErrMsg());
        } catch (Exception e) {
            log.error("支付宝查单异常 outTradeNo={}", outTradeNo, e);
            throw new BizException("支付宝查单失败：" + e.getMessage());
        }
    }

    /** 支付宝 trade_status -> 通用状态：成功归一 SUCCESS（isSuccess 兼容两渠道），等待买家付款 NOTPAY，已关闭 CLOSED */
    private String normalizeTradeState(String tradeStatus) {
        if (StrUtil.isBlank(tradeStatus)) {
            return null;
        }
        return switch (tradeStatus) {
            case "TRADE_SUCCESS", "TRADE_FINISHED" -> "SUCCESS";
            case "WAIT_BUYER_PAY" -> "NOTPAY";
            case "TRADE_CLOSED" -> "CLOSED";
            default -> tradeStatus;
        };
    }

    /** 金额（元，BigDecimal）-> 支付宝金额串（两位小数） */
    private String toAmountYuan(BigDecimal yuan) {
        return yuan.setScale(2, RoundingMode.HALF_UP).toPlainString();
    }

    /** 金额串（元，如 "100.00"）-> 分；空返回 null（未支付） */
    private Integer toFen(String totalAmountYuan) {
        if (StrUtil.isBlank(totalAmountYuan)) {
            return null;
        }
        return new BigDecimal(totalAmountYuan).movePointRight(2).intValueExact();
    }

    /** SDK Date -> LocalDateTime；空/异常返回 null */
    private LocalDateTime toLocalDateTime(Date date) {
        return date == null ? null : LocalDateTime.ofInstant(date.toInstant(), ZoneId.systemDefault());
    }

    /** 错误信息拼装（subMsg 优先，附 subCode 便于排查） */
    private String subMessage(com.alipay.api.AlipayResponse response) {
        String msg = StrUtil.isNotBlank(response.getSubMsg()) ? response.getSubMsg() : response.getMsg();
        return StrUtil.isNotBlank(response.getSubCode()) ? msg + "（" + response.getSubCode() + "）" : msg;
    }
}
