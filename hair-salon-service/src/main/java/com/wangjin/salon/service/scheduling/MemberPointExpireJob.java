package com.wangjin.salon.service.scheduling;

import com.wangjin.salon.service.service.MemberPointService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * 会员积分过期清零定时任务。
 * <p>
 * 扫描所有启用租户下 expireTime 已到期且 remainingPoints &gt; 0 的获得类积分批次，
 * 生成过期清零流水（changeType=8）并扣减 member.points。批次条件置零、points 原子扣减，天然幂等；
 * 多实例部署重复执行不会重复扣减（仅多一次空扫），如需严格互斥可再叠加分布式锁。
 * <p>
 * 开关：wj.salon.point-expire-enabled（默认启用）；cron：wj.salon.point-expire-cron（默认每天 02:00）。
 */
@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(prefix = "wj.salon", name = "point-expire-enabled", havingValue = "true", matchIfMissing = true)
public class MemberPointExpireJob {

    private final MemberPointService memberPointService;

    @Scheduled(cron = "${wj.salon.point-expire-cron:0 0 2 * * ?}")
    public void expirePoints() {
        int count = memberPointService.expireDuePoints();
        log.info("积分过期清零完成，处理会员数={}", count);
    }
}
