package com.wangjin.salon.service.pay;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.wangjin.common.exception.BizException;
import com.wangjin.salon.service.mapper.SalonPayRecordMapper;
import com.wangjin.salon.service.mapper.SalonRechargeOrderMapper;
import com.wangjin.salon.service.model.entity.SalonPayRecord;
import com.wangjin.salon.service.model.entity.SalonRechargeOrder;
import com.wangjin.salon.service.service.RechargeOrderService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;

/**
 * 扫码支付充值确认执行器（回调与查单补偿共用入账链路，渠道无关：微信/支付宝同链路）。
 * <p>
 * 独立 bean 保证 {@code @Transactional} 生效（占坑与入账须同事务，防自调用失效）；
 * 充值单条件更新 status 0->1 占坑防并发/重复回调，占坑失败即已处理过（幂等成功返回）；
 * 必须在租户上下文内调用（回调侧由 TenantContextRunner 切换）。
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class RechargePayConfirmExecutor {

    private final SalonPayRecordMapper payRecordMapper;
    private final SalonRechargeOrderMapper rechargeOrderMapper;
    private final RechargeOrderService rechargeOrderService;

    /**
     * 确认支付并入账（幂等：重复回调/回调与查单补偿竞争时只入账一次）。
     *
     * @param record        支付流水（pending）
     * @param transactionId 渠道交易单号
     * @param paidAt        支付完成时间（渠道口径，空则取当前时间）
     * @param payerTotalFen 渠道实付金额（分，与下单金额校验一致才入账）
     * @param source        确认来源（realtime_callback / query_compensate）
     * @param rawPayload    渠道原始报文（留痕）
     * @return true=本次完成入账；false=此前已处理（幂等跳过）
     */
    @Transactional(rollbackFor = Exception.class)
    public boolean confirm(SalonPayRecord record, String transactionId, LocalDateTime paidAt,
                           Integer payerTotalFen, String source, String rawPayload) {
        if (record.getBizType() == null || record.getBizType() != SalonPayRecord.BIZ_TYPE_RECHARGE) {
            throw new BizException("不支持的支付业务类型：" + record.getBizType());
        }
        // 金额校验：渠道实付须与下单金额一致（分）；不一致拒绝自动入账（告警人工介入，微信重试也无害）
        int expectedFen = record.getAmount().multiply(BigDecimal.valueOf(100))
                .setScale(0, RoundingMode.HALF_UP).intValueExact();
        if (payerTotalFen == null || payerTotalFen != expectedFen) {
            log.error("支付金额与下单金额不一致，拒绝自动入账 outTradeNo={} 下单分={} 实付分={}",
                    record.getOutTradeNo(), expectedFen, payerTotalFen);
            throw new BizException("支付金额与下单金额不一致，已拒绝自动入账");
        }
        // 充值单占坑：status 0->1 条件更新（并发/重试只成功一次）
        int claimed = rechargeOrderMapper.update(null, Wrappers.<SalonRechargeOrder>lambdaUpdate()
                .set(SalonRechargeOrder::getStatus, SalonRechargeOrder.STATUS_PAID)
                .set(SalonRechargeOrder::getPayTime, paidAt != null ? paidAt : LocalDateTime.now())
                .eq(SalonRechargeOrder::getId, record.getBizId())
                .eq(SalonRechargeOrder::getStatus, SalonRechargeOrder.STATUS_PENDING));
        if (claimed == 0) {
            log.info("充值单已确认过，幂等跳过入账 rechargeId={} outTradeNo={}", record.getBizId(), record.getOutTradeNo());
            markRecordPaid(record, transactionId, paidAt, source, rawPayload);
            return false;
        }
        SalonRechargeOrder order = rechargeOrderMapper.selectById(record.getBizId());
        // 入账：与手动确认共用链路（本金/赠送流水 + 累计充值 + 等级升级检查）
        rechargeOrderService.settleRecharge(order);
        markRecordPaid(record, transactionId, paidAt, source, rawPayload);
        log.info("扫码支付充值确认完成 rechargeId={} outTradeNo={} transactionId={} source={}",
                record.getBizId(), record.getOutTradeNo(), transactionId, source);
        return true;
    }

    /** 流水 pending->paid（条件更新兜底，已 paid 时无变化） */
    private void markRecordPaid(SalonPayRecord record, String transactionId, LocalDateTime paidAt,
                                String source, String rawPayload) {
        payRecordMapper.update(null, Wrappers.<SalonPayRecord>lambdaUpdate()
                .set(SalonPayRecord::getStatus, SalonPayRecord.STATUS_PAID)
                .set(SalonPayRecord::getTransactionId, transactionId)
                .set(SalonPayRecord::getSource, source)
                .set(SalonPayRecord::getPaidAt, paidAt)
                .set(SalonPayRecord::getRawPayload, rawPayload)
                .eq(SalonPayRecord::getId, record.getId())
                .eq(SalonPayRecord::getStatus, SalonPayRecord.STATUS_PENDING));
    }
}
