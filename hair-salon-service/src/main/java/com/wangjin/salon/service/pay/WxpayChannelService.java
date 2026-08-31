package com.wangjin.salon.service.pay;

import com.wechat.pay.java.core.Config;
import com.wechat.pay.java.service.payments.model.Transaction;
import com.wechat.pay.java.service.payments.nativepay.NativePayService;
import com.wechat.pay.java.service.payments.nativepay.model.Amount;
import com.wechat.pay.java.service.payments.nativepay.model.PrepayRequest;
import com.wechat.pay.java.service.payments.nativepay.model.PrepayResponse;
import com.wechat.pay.java.service.payments.nativepay.model.QueryOrderByOutTradeNoRequest;
import com.wangjin.common.exception.BizException;
import com.wangjin.salon.service.model.entity.SalonTenantPayConfig;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;

/**
 * 微信支付直连渠道实现（Native 扫码，wechatpay-java 官方 SDK）。
 * <p>
 * 每次调用按租户配置构建/复用 {@link NativePayService}（Config 见 {@link WxpayConfigHolder} 缓存）；
 * 金额元转分；查单结果归一为 {@link ChannelQueryResult}，业务侧不感知微信枚举。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class WxpayChannelService implements PayChannel {

    public static final String CHANNEL = "wxpay";

    private final WxpayConfigHolder configHolder;

    @Override
    public String channel() {
        return CHANNEL;
    }

    @Override
    public String nativePrepay(PayPrepayCommand command, SalonTenantPayConfig config) {
        try {
            NativePayService service = nativePayService(config);
            PrepayRequest request = new PrepayRequest();
            request.setAppid(config.getAppId());
            request.setMchid(config.getMchId());
            request.setDescription(command.description());
            request.setOutTradeNo(command.outTradeNo());
            request.setNotifyUrl(command.notifyUrl());
            Amount amount = new Amount();
            amount.setTotal(toFen(command.amount()));
            request.setAmount(amount);
            PrepayResponse response = service.prepay(request);
            log.info("微信Native下单成功 outTradeNo={} mchId={}", command.outTradeNo(), config.getMchId());
            return response.getCodeUrl();
        } catch (BizException e) {
            throw e;
        } catch (Exception e) {
            log.error("微信Native下单失败 outTradeNo={}", command.outTradeNo(), e);
            throw new BizException("微信支付下单失败：" + e.getMessage());
        }
    }

    @Override
    public ChannelQueryResult queryByOutTradeNo(String outTradeNo, SalonTenantPayConfig config) {
        try {
            NativePayService service = nativePayService(config);
            QueryOrderByOutTradeNoRequest request = new QueryOrderByOutTradeNoRequest();
            request.setMchid(config.getMchId());
            request.setOutTradeNo(outTradeNo);
            Transaction transaction = service.queryOrderByOutTradeNo(request);
            return new ChannelQueryResult(
                    normalizeTradeState(transaction.getTradeState()),
                    transaction.getTransactionId(),
                    parseSuccessTime(transaction.getSuccessTime()),
                    transaction.getAmount() == null ? null : transaction.getAmount().getTotal(),
                    transaction.getAmount() == null ? null : transaction.getAmount().getPayerTotal());
        } catch (BizException e) {
            throw e;
        } catch (Exception e) {
            log.error("微信查单失败 outTradeNo={}", outTradeNo, e);
            throw new BizException("微信支付查单失败：" + e.getMessage());
        }
    }

    private NativePayService nativePayService(SalonTenantPayConfig config) {
        Config sdkConfig = configHolder.get(config);
        return new NativePayService.Builder().config(sdkConfig).build();
    }

    /** 元转分（支付金额两位小数，四舍五入兜底） */
    private int toFen(BigDecimal yuan) {
        return yuan.multiply(BigDecimal.valueOf(100)).setScale(0, RoundingMode.HALF_UP).intValueExact();
    }

    /** 微信 trade_state -> 通用状态（与支付宝归一口径一致）：支付中 NOTPAY，终态失败 CLOSED；REFUND 等其余透传（pending 流水不出现，异常留痕排查） */
    private String normalizeTradeState(Transaction.TradeStateEnum state) {
        if (state == null) {
            return null;
        }
        return switch (state) {
            case SUCCESS -> "SUCCESS";
            case NOTPAY, USERPAYING -> "NOTPAY";
            case CLOSED, REVOKED, PAYERROR -> "CLOSED";
            default -> state.name();
        };
    }

    /** RFC3339 时间串（如 2018-06-08T10:34:56+08:00）转本地时间；空/异常返回 null */
    private LocalDateTime parseSuccessTime(String rfc3339) {
        if (rfc3339 == null || rfc3339.isBlank()) {
            return null;
        }
        try {
            return OffsetDateTime.parse(rfc3339, DateTimeFormatter.ISO_OFFSET_DATE_TIME)
                    .atZoneSameInstant(ZoneId.systemDefault())
                    .toLocalDateTime();
        } catch (Exception e) {
            log.warn("微信支付完成时间解析失败：{}", rfc3339);
            return null;
        }
    }
}
