package com.wangjin.salon.service.pay;

import cn.hutool.json.JSONUtil;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.wangjin.salon.service.mapper.SalonPayRecordMapper;
import com.wangjin.salon.service.mapper.SalonRechargeOrderMapper;
import com.wangjin.salon.service.mapper.SalonTenantPayConfigMapper;
import com.wangjin.salon.service.model.entity.SalonPayRecord;
import com.wangjin.salon.service.model.entity.SalonRechargeOrder;
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
 * 支付查单兜底（防回调丢失卡死订单，docs/payment-design.md §3.4；渠道无关）。
 * <p>
 * 定时逐渠道（{@link PayChannel} 实现）扫本租户 pending 支付流水（下单满 {@link #QUERY_AFTER_MINUTES} 分钟
 * 仍未回调）主动查渠道：支付成功 -> 走与回调同一确认链路（幂等）；渠道侧已关闭/支付失败或超时（二维码过期）-> 流水置 failed。
 * 确认与查单在同一事务语义下由 {@link RechargePayConfirmExecutor} 占坑幂等。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PayQueryCompensateService {

    /** 下单后等待回调的静默期（分钟）：期内不查单，优先等实时回调 */
    private static final int QUERY_AFTER_MINUTES = 5;
    /** 支付超时（分钟）：超过后视为放弃（微信 code_url / 支付宝 qr_code 有效期均 2 小时），流水关闭 */
    private static final int TIMEOUT_MINUTES = 120;
    /** 单租户单渠道单轮最大处理条数（防积压拖慢调度） */
    private static final int BATCH_LIMIT = 100;

    private final SalonTenantPayConfigMapper payConfigMapper;
    private final SalonPayRecordMapper payRecordMapper;
    private final SalonRechargeOrderMapper rechargeOrderMapper;
    private final List<PayChannel> payChannels;
    private final PayConfirmDispatcher confirmDispatcher;
    private final SysTenantService sysTenantService;

    /**
     * 跨租户编排（定时任务入口）：逐启用租户切换上下文执行 {@link #compensateTenant()}。
     *
     * @return 全租户本轮确认支付笔数
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
                log.warn("查单兜底租户处理异常 tenantId={}", tenantId, e);
            }
        }
        return total;
    }

    /**
     * 本租户查单补偿（须在租户上下文内）：逐渠道扫 pending 流水查渠道确认。
     *
     * @return 本轮确认支付笔数
     */
    public int compensateTenant() {
        int confirmed = 0;
        for (PayChannel channel : payChannels) {
            try {
                confirmed += compensateChannel(channel);
            } catch (Exception e) {
                log.warn("查单兜底渠道处理异常 channel={}", channel.channel(), e);
            }
        }
        return confirmed;
    }

    /** 单渠道补偿：租户启用该渠道且有 pending 流水才逐笔查单 */
    private int compensateChannel(PayChannel channel) {
        SalonTenantPayConfig cfg = payConfigMapper.selectOne(Wrappers.<SalonTenantPayConfig>lambdaQuery()
                .eq(SalonTenantPayConfig::getChannel, channel.channel())
                .eq(SalonTenantPayConfig::getEnabled, 1)
                .eq(SalonTenantPayConfig::getStatus, "active")
                .last("LIMIT 1"));
        if (cfg == null) {
            return 0;
        }
        LocalDateTime threshold = LocalDateTime.now().minusMinutes(QUERY_AFTER_MINUTES);
        List<SalonPayRecord> pendings = payRecordMapper.selectList(Wrappers.<SalonPayRecord>lambdaQuery()
                .eq(SalonPayRecord::getChannel, channel.channel())
                .eq(SalonPayRecord::getStatus, SalonPayRecord.STATUS_PENDING)
                .lt(SalonPayRecord::getCreateTime, threshold)
                .orderByAsc(SalonPayRecord::getCreateTime)
                .last("LIMIT " + BATCH_LIMIT));
        int confirmed = 0;
        for (SalonPayRecord record : pendings) {
            try {
                ChannelQueryResult result = channel.queryByOutTradeNo(record.getOutTradeNo(), cfg);
                if (result.isSuccess()) {
                    confirmDispatcher.confirm(record, new PayConfirmParams(
                            result.transactionId(), result.successTime(),
                            result.totalFen(), result.payerTotalFen(),
                            SalonPayRecord.SOURCE_QUERY_COMPENSATE,
                            JSONUtil.toJsonStr(result)));
                    confirmed++;
                    log.info("查单补偿确认支付 channel={} outTradeNo={} transactionId={}",
                            channel.channel(), record.getOutTradeNo(), result.transactionId());
                } else if (isClosed(result.tradeState()) || isTimeout(record)) {
                    closeRecord(record, "渠道状态：" + result.tradeState());
                }
            } catch (Exception e) {
                // 查单异常（含渠道侧订单不存在）：超时的关闭，否则下一轮再查
                if (isTimeout(record)) {
                    closeRecord(record, "查单异常：" + e.getMessage());
                } else {
                    log.warn("查单失败，下轮重试 channel={} outTradeNo={}", channel.channel(), record.getOutTradeNo(), e);
                }
            }
        }
        return confirmed;
    }

    /** 渠道侧终态失败（渠道实现归一后的 CLOSED；非超时轮次即关闭） */
    private boolean isClosed(String tradeState) {
        return "CLOSED".equals(tradeState);
    }

    /** 超过支付超时窗口（二维码已过期，顾客不会再付） */
    private boolean isTimeout(SalonPayRecord record) {
        return record.getCreateTime() != null
                && record.getCreateTime().isBefore(LocalDateTime.now().minusMinutes(TIMEOUT_MINUTES));
    }

    /** 流水关闭：pending -> failed；充值单同步 0->2 已取消（顾客未支付放弃，重新充值会生成新单）；订单保持挂单（收银员可重新发起支付）。若渠道侧后续仍支付成功，回调无 pending 流水不入账，P8 对账处理 */
    private void closeRecord(SalonPayRecord record, String reason) {
        payRecordMapper.update(null, Wrappers.<SalonPayRecord>lambdaUpdate()
                .set(SalonPayRecord::getStatus, SalonPayRecord.STATUS_FAILED)
                .set(SalonPayRecord::getRemark, "超时关闭：" + reason)
                .eq(SalonPayRecord::getId, record.getId())
                .eq(SalonPayRecord::getStatus, SalonPayRecord.STATUS_PENDING));
        if (record.getBizType() != null && record.getBizType() == SalonPayRecord.BIZ_TYPE_RECHARGE) {
            rechargeOrderMapper.update(null, Wrappers.<SalonRechargeOrder>lambdaUpdate()
                    .set(SalonRechargeOrder::getStatus, SalonRechargeOrder.STATUS_CANCELLED)
                    .eq(SalonRechargeOrder::getId, record.getBizId())
                    .eq(SalonRechargeOrder::getStatus, SalonRechargeOrder.STATUS_PENDING));
        }
        log.info("支付流水超时关闭 outTradeNo={} 原因={}", record.getOutTradeNo(), reason);
    }
}
