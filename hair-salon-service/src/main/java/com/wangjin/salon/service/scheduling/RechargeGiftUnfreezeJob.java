package com.wangjin.salon.service.scheduling;

import com.wangjin.salon.service.service.RechargeOrderService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * 充值活动赠送解冻定时任务。
 * <p>
 * 活动赠送入冻结桶，次月 1 号后解冻至赠送桶（防"充值即退款"套利）。每天跑一次，
 * 只处理 create_time 早于本月 1 号且未解冻的单（本月新单不动，历史漏单自动补解）；
 * 单笔条件占坑更新幂等，多实例重复执行不会重复解冻。
 * <p>
 * 开关：wj.salon.recharge-unfreeze-enabled（默认启用）；cron：wj.salon.recharge-unfreeze-cron（默认每天 03:10）。
 */
@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(prefix = "wj.salon", name = "recharge-unfreeze-enabled", havingValue = "true", matchIfMissing = true)
public class RechargeGiftUnfreezeJob {

    private final RechargeOrderService rechargeOrderService;

    @Scheduled(cron = "${wj.salon.recharge-unfreeze-cron:0 10 3 * * ?}")
    public void unfreeze() {
        int count = rechargeOrderService.unfreezeDueAll();
        log.info("充值活动赠送解冻完成，处理笔数={}", count);
    }
}
