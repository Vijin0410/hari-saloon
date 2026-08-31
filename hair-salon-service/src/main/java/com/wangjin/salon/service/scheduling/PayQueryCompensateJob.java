package com.wangjin.salon.service.scheduling;

import com.wangjin.salon.service.pay.PayQueryCompensateService;
import com.wangjin.salon.service.pay.RefundQueryCompensateService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * 支付查单兜底定时任务（防回调丢失卡死待支付单/处理中退款单；微信/支付宝等渠道统一覆盖）。
 * <p>
 * 逐启用租户扫各渠道 pending 支付流水主动查渠道：支付成功走与回调同一确认链路（幂等占坑），
 * 渠道关闭/超时的流水置 failed；另扫 processing 渠道退款分摊行（微信退款异步确认），
 * 成功走退款确认链路、渠道终态失败置退款单失败。单实例语义，多实例重复执行无害（条件更新幂等）。
 * <p>
 * 开关：wj.salon.pay.query-enabled（默认启用）；cron：wj.salon.pay.query-cron（默认每 2 分钟）。
 */
@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(prefix = "wj.salon.pay", name = "query-enabled", havingValue = "true", matchIfMissing = true)
public class PayQueryCompensateJob {

    private final PayQueryCompensateService compensateService;
    private final RefundQueryCompensateService refundCompensateService;

    @Scheduled(cron = "${wj.salon.pay.query-cron:0 */2 * * * ?}")
    public void compensate() {
        int count = compensateService.compensateAll();
        if (count > 0) {
            log.info("支付查单兜底完成，本轮确认支付笔数={}", count);
        }
        int refundCount = refundCompensateService.compensateAll();
        if (refundCount > 0) {
            log.info("退款查单兜底完成，本轮生效退款笔数={}", refundCount);
        }
    }
}
