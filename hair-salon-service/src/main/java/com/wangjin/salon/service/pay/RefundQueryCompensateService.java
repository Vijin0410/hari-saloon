package com.wangjin.salon.service.pay;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.wangjin.salon.service.mapper.SalonRefundPaymentMapper;
import com.wangjin.salon.service.mapper.SalonTenantPayConfigMapper;
import com.wangjin.salon.service.model.entity.SalonRefundPayment;
import com.wangjin.salon.service.model.entity.SalonTenantPayConfig;
import com.wangjin.salon.system.model.entity.SysTenant;
import com.wangjin.salon.system.service.SysTenantService;
import com.wangjin.salon.system.util.TenantContextRunner;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 退款查单兜底（P6，防微信退款回调丢失卡死退款单；渠道无关编排）。
 * <p>
 * 定时逐渠道扫本租户 processing 退款分摊行（渠道行）主动查退款状态：成功走与回调同一确认链路（幂等），
 * 渠道终态失败置退款单失败（系统内未生效，可重新发起）。与 {@link PayQueryCompensateService} 支付查单同模式。
 * 仅退款异步确认的渠道（微信）会产生 processing 行；支付宝同步退款不会出现在扫描集中。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class RefundQueryCompensateService {

    /** 发起后等待回调的静默期（分钟）：期内不查单，优先等实时回调 */
    private static final int QUERY_AFTER_MINUTES = 2;
    /** 单租户单渠道单轮最大处理条数（防积压拖慢调度） */
    private static final int BATCH_LIMIT = 100;

    private final SalonTenantPayConfigMapper payConfigMapper;
    private final SalonRefundPaymentMapper refundPaymentMapper;
    private final List<PayChannel> payChannels;
    private final OrderRefundConfirmExecutor confirmExecutor;
    private final SysTenantService sysTenantService;

    /**
     * 跨租户编排（定时任务入口）：逐启用租户切换上下文执行 {@link #compensateTenant()}。
     *
     * @return 全租户本轮生效退款笔数
     */
    public int compensateAll() {
        List<Long> tenantIds = sysTenantService.lambdaQuery()
                .select(SysTenant::getId)
                .eq(SysTenant::getStatus, 1)
                .list()
                .stream().map(SysTenant::getId).toList();
        int total = 0;
        for (Long tenantId : tenantIds) {
            try {
                total += TenantContextRunner.run(tenantId, this::compensateTenant);
            } catch (Exception e) {
                log.warn("退款查单兜底租户处理异常 tenantId={}", tenantId, e);
            }
        }
        return total;
    }

    /**
     * 本租户退款查单补偿（须在租户上下文内）：逐渠道扫 processing 渠道退款行查状态。
     *
     * @return 本轮生效退款笔数
     */
    public int compensateTenant() {
        int confirmed = 0;
        for (PayChannel channel : payChannels) {
            try {
                confirmed += compensateChannel(channel);
            } catch (Exception e) {
                log.warn("退款查单兜底渠道处理异常 channel={}", channel.channel(), e);
            }
        }
        return confirmed;
    }

    /** 单渠道补偿：租户启用该渠道且有 processing 渠道退款行才逐笔查状态 */
    private int compensateChannel(PayChannel channel) {
        SalonTenantPayConfig cfg = payConfigMapper.selectOne(Wrappers.<SalonTenantPayConfig>lambdaQuery()
                .eq(SalonTenantPayConfig::getChannel, channel.channel())
                .eq(SalonTenantPayConfig::getEnabled, 1)
                .eq(SalonTenantPayConfig::getStatus, "active")
                .last("LIMIT 1"));
        if (cfg == null) {
            return 0;
        }
        List<SalonRefundPayment> pendings = refundPaymentMapper.selectList(
                Wrappers.<SalonRefundPayment>lambdaQuery()
                        .eq(SalonRefundPayment::getChannel, channel.channel())
                        .eq(SalonRefundPayment::getChannelStatus, SalonRefundPayment.CHANNEL_STATUS_PROCESSING)
                        .lt(SalonRefundPayment::getUpdateTime, LocalDateTime.now().minusMinutes(QUERY_AFTER_MINUTES))
                        .orderByAsc(SalonRefundPayment::getUpdateTime)
                        .last("LIMIT " + BATCH_LIMIT));
        int confirmed = 0;
        for (SalonRefundPayment row : pendings) {
            try {
                ChannelRefundResult result = channel.queryRefundStatus(row.getOutRefundNo(), cfg);
                if (ChannelRefundResult.SUCCESS.equals(result.status())) {
                    if (result.channelRefundNo() != null) {
                        refundPaymentMapper.update(null, Wrappers.<SalonRefundPayment>lambdaUpdate()
                                .set(SalonRefundPayment::getChannelRefundNo, result.channelRefundNo())
                                .set(SalonRefundPayment::getRawPayload, result.rawPayload())
                                .eq(SalonRefundPayment::getId, row.getId()));
                    }
                    confirmExecutor.confirm(row.getRefundId());
                    confirmed++;
                    log.info("退款查单补偿确认生效 channel={} outRefundNo={} refundId={}",
                            channel.channel(), row.getOutRefundNo(), row.getRefundId());
                } else if (ChannelRefundResult.FAILED.equals(result.status())) {
                    confirmExecutor.fail(row.getRefundId(), "渠道查单：" + result.status());
                }
                // PROCESSING：渠道仍在处理，下一轮再查
            } catch (UnsupportedOperationException e) {
                // 同步退款渠道不支持查单（支付宝等）：理论不出现 processing 行，防御性跳过
                log.warn("退款查单兜底跳过不支持查单的渠道 channel={} outRefundNo={}",
                        channel.channel(), row.getOutRefundNo());
            } catch (Exception e) {
                log.warn("退款查单失败，下轮重试 channel={} outRefundNo={}",
                        channel.channel(), row.getOutRefundNo(), e);
            }
        }
        return confirmed;
    }
}
