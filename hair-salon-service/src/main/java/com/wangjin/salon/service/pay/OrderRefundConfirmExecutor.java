package com.wangjin.salon.service.pay;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.wangjin.salon.service.mapper.SalonMemberBalanceLogMapper;
import com.wangjin.salon.service.mapper.SalonOrderMapper;
import com.wangjin.salon.service.mapper.SalonPayRecordMapper;
import com.wangjin.salon.service.mapper.SalonRefundOrderMapper;
import com.wangjin.salon.service.mapper.SalonRefundPaymentMapper;
import com.wangjin.salon.service.model.entity.SalonMemberBalanceLog;
import com.wangjin.salon.service.model.entity.SalonOrder;
import com.wangjin.salon.service.model.entity.SalonOrderPayment;
import com.wangjin.salon.service.model.entity.SalonPayRecord;
import com.wangjin.salon.service.model.entity.SalonRefundOrder;
import com.wangjin.salon.service.model.entity.SalonRefundPayment;
import com.wangjin.salon.service.service.MemberAssetService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;

/**
 * 订单退款确认执行器（P6，微信退款回调 / 渠道退款查单兜底 / 同步退款发起共用，渠道无关）。
 * <p>
 * 独立 bean 保证 {@code @Transactional} 生效（退款单占坑与系统内生效须同事务，防自调用失效）；
 * 退款单是整体生效/失败的事务边界：条件更新 status 0->1 占坑防并发/重复回调，占坑失败即已处理（幂等）；
 * 确认时系统内退回（积分/余额先本后赠）+ 订单状态流转（2 部分退款/3 已退款）+ 渠道支付流水 refunded 同事务生效。
 * 须在租户上下文内调用。
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class OrderRefundConfirmExecutor {

    /** 余额桶：1本金 2赠送 */
    private static final int BUCKET_PRINCIPAL = 1;
    private static final int BUCKET_GIFT = 2;
    /** 余额变动类型 3=消费扣款 4=退款退回；积分变动 9=退款退回 */
    private static final int CT_CONSUME = 3;
    private static final int CT_REFUND_BACK = 4;
    private static final int PT_REFUND_BACK = 9;

    private final SalonRefundOrderMapper refundOrderMapper;
    private final SalonRefundPaymentMapper refundPaymentMapper;
    private final SalonOrderMapper orderMapper;
    private final SalonPayRecordMapper payRecordMapper;
    private final SalonMemberBalanceLogMapper balanceLogMapper;
    private final MemberAssetService memberAssetService;

    /**
     * 确认退款并生效（幂等：重复回调/回调与查单竞争时只生效一次）。
     *
     * @param refundId 退款单ID
     * @return true=本次生效；false=此前已处理（幂等跳过）
     */
    @Transactional(rollbackFor = Exception.class)
    public boolean confirm(Long refundId) {
        SalonRefundOrder refund = refundOrderMapper.selectById(refundId);
        if (refund == null) {
            throw new IllegalArgumentException("退款单不存在：" + refundId);
        }
        // 占坑：status 0->1 条件更新（并发/重试只成功一次）
        int claimed = refundOrderMapper.update(null, Wrappers.<SalonRefundOrder>lambdaUpdate()
                .set(SalonRefundOrder::getStatus, SalonRefundOrder.STATUS_SUCCESS)
                .set(SalonRefundOrder::getSuccessTime, LocalDateTime.now())
                .eq(SalonRefundOrder::getId, refundId)
                .eq(SalonRefundOrder::getStatus, SalonRefundOrder.STATUS_PROCESSING));
        if (claimed == 0) {
            log.info("退款单已确认过，幂等跳过 refundId={} refundNo={}", refundId, refund.getRefundNo());
            return false;
        }
        // 分摊行统一置 success（渠道行回填渠道单号在发起/回调侧，系统内行此处生效）
        refundPaymentMapper.update(null, Wrappers.<SalonRefundPayment>lambdaUpdate()
                .set(SalonRefundPayment::getChannelStatus, SalonRefundPayment.CHANNEL_STATUS_SUCCESS)
                .eq(SalonRefundPayment::getRefundId, refundId)
                .eq(SalonRefundPayment::getChannelStatus, SalonRefundPayment.CHANNEL_STATUS_PROCESSING));

        SalonOrder order = orderMapper.selectById(refund.getOrderId());
        List<SalonRefundPayment> rows = refundPaymentMapper.selectList(
                Wrappers.<SalonRefundPayment>lambdaQuery().eq(SalonRefundPayment::getRefundId, refundId));

        // 1) 积分退回（订单资金全额退光时一并退回，散客订单无积分）
        if (refund.getPointRefundPoints() != null && refund.getPointRefundPoints() > 0 && refund.getMemberId() != null) {
            memberAssetService.changePoints(refund.getMemberId(), refund.getPointRefundPoints(),
                    PT_REFUND_BACK, "REFUND", refundId, refund.getRefundNo(), null, "订单退款退回积分");
        }

        // 2) 余额退回：先本后赠（与扣款先赠后本对称，见 OrderServiceImpl.payWithBalance）
        for (SalonRefundPayment row : rows) {
            if (Objects.equals(row.getPayMethod(), SalonOrderPayment.METHOD_BALANCE)
                    && row.getAmount() != null && row.getAmount().compareTo(BigDecimal.ZERO) > 0) {
                refundBalance(refund, order, row.getAmount());
            }
        }

        // 3) 订单状态流转：累计退款（成功退款单汇总，含本次）达 received 即已退款，否则部分退款
        BigDecimal refundedTotal = sumRefunded(order.getId());
        int newStatus = refundedTotal.compareTo(order.getReceivedAmount()) >= 0
                ? SalonOrder.STATUS_REFUNDED : SalonOrder.STATUS_PART_REFUNDED;
        orderMapper.update(null, Wrappers.<SalonOrder>lambdaUpdate()
                .set(SalonOrder::getStatus, newStatus)
                .eq(SalonOrder::getId, order.getId())
                .in(SalonOrder::getStatus, SalonOrder.STATUS_PAID, SalonOrder.STATUS_PART_REFUNDED));

        // 4) 渠道支付流水 refunded：该流水累计成功退款达下单金额时置 refunded（部分退保持 paid，P8 对账区分）
        for (SalonRefundPayment row : rows) {
            if (row.getPayRecordId() != null) {
                markRecordRefunded(row.getPayRecordId(), refundId);
            }
        }
        log.info("订单退款确认生效 refundId={} refundNo={} orderId={} 退款总额={} 积分退回={} 订单状态={}",
                refundId, refund.getRefundNo(), order.getId(), refund.getRefundAmount(),
                refund.getPointRefundPoints(), newStatus);
        return true;
    }

    /**
     * 退款失败落地（渠道 ABNORMAL/CLOSED 或查单确认失败）：退款单整体置失败，系统内不生效（余额/积分未退、订单状态不动）。
     *
     * @param refundId 退款单ID
     * @param reason   失败原因（留痕 remark）
     * @return true=本次置失败；false=此前已处理（幂等跳过）
     */
    @Transactional(rollbackFor = Exception.class)
    public boolean fail(Long refundId, String reason) {
        SalonRefundOrder refund = refundOrderMapper.selectById(refundId);
        if (refund == null) {
            throw new IllegalArgumentException("退款单不存在：" + refundId);
        }
        int claimed = refundOrderMapper.update(null, Wrappers.<SalonRefundOrder>lambdaUpdate()
                .set(SalonRefundOrder::getStatus, SalonRefundOrder.STATUS_FAILED)
                .set(SalonRefundOrder::getRemark, "渠道退款失败：" + reason)
                .eq(SalonRefundOrder::getId, refundId)
                .eq(SalonRefundOrder::getStatus, SalonRefundOrder.STATUS_PROCESSING));
        if (claimed == 0) {
            return false;
        }
        refundPaymentMapper.update(null, Wrappers.<SalonRefundPayment>lambdaUpdate()
                .set(SalonRefundPayment::getChannelStatus, SalonRefundPayment.CHANNEL_STATUS_FAILED)
                .eq(SalonRefundPayment::getRefundId, refundId)
                .eq(SalonRefundPayment::getChannelStatus, SalonRefundPayment.CHANNEL_STATUS_PROCESSING));
        log.warn("退款单置失败（系统内未生效，可重新发起）refundId={} refundNo={} 原因={}", refundId, refund.getRefundNo(), reason);
        return true;
    }

    /** 余额退回先本后赠：支付先扣赠后扣本（OrderServiceImpl.payWithBalance），退回逆序--先退本金再退赠送 */
    private void refundBalance(SalonRefundOrder refund, SalonOrder order, BigDecimal amount) {
        Long memberId = refund.getMemberId();
        // 支付时该订单的桶扣减（bizType=ORDER changeType=3，两行流水：桶2/桶1）
        BigDecimal principalPaid = sumBalanceChange(memberId, order.getId(), BUCKET_PRINCIPAL, CT_CONSUME, "ORDER");
        // 该订单已退回的本金（bizType=REFUND，bizId=该订单的退款单集合）
        BigDecimal principalRefunded = sumRefundedBalance(memberId, order.getId(), BUCKET_PRINCIPAL);
        BigDecimal restPrincipal = principalPaid.subtract(principalRefunded).max(BigDecimal.ZERO);
        BigDecimal principalBack = amount.min(restPrincipal);
        BigDecimal giftBack = amount.subtract(principalBack);
        if (principalBack.compareTo(BigDecimal.ZERO) > 0) {
            memberAssetService.changeBalance(memberId, BUCKET_PRINCIPAL, principalBack,
                    CT_REFUND_BACK, "REFUND", refund.getId(), refund.getRefundNo(), "订单退款退回（本金）");
        }
        if (giftBack.compareTo(BigDecimal.ZERO) > 0) {
            memberAssetService.changeBalance(memberId, BUCKET_GIFT, giftBack,
                    CT_REFUND_BACK, "REFUND", refund.getId(), refund.getRefundNo(), "订单退款退回（赠送）");
        }
    }

    /** 汇总会员在某订单上的某桶余额扣减（取绝对值）：bizType + changeType + bizId 定位 */
    private BigDecimal sumBalanceChange(Long memberId, Long orderId, int bucket, int changeType, String bizType) {
        List<SalonMemberBalanceLog> logs = balanceLogMapper.selectList(
                Wrappers.<SalonMemberBalanceLog>lambdaQuery()
                        .eq(SalonMemberBalanceLog::getMemberId, memberId)
                        .eq(SalonMemberBalanceLog::getBizType, bizType)
                        .eq(SalonMemberBalanceLog::getBizId, orderId)
                        .eq(SalonMemberBalanceLog::getBalanceType, bucket)
                        .eq(SalonMemberBalanceLog::getChangeType, changeType));
        return logs.stream()
                .map(SalonMemberBalanceLog::getChangeAmount)
                .filter(Objects::nonNull)
                .map(BigDecimal::abs)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    /** 汇总该订单已退回的某桶余额（REFUND 流水 bizId=退款单ID，先取该订单退款单集合再汇总） */
    private BigDecimal sumRefundedBalance(Long memberId, Long orderId, int bucket) {
        List<Long> refundIds = refundOrderMapper.selectList(Wrappers.<SalonRefundOrder>lambdaQuery()
                        .select(SalonRefundOrder::getId)
                        .eq(SalonRefundOrder::getOrderId, orderId)
                        .eq(SalonRefundOrder::getStatus, SalonRefundOrder.STATUS_SUCCESS))
                .stream().map(SalonRefundOrder::getId).toList();
        if (refundIds.isEmpty()) {
            return BigDecimal.ZERO;
        }
        List<SalonMemberBalanceLog> logs = balanceLogMapper.selectList(
                Wrappers.<SalonMemberBalanceLog>lambdaQuery()
                        .eq(SalonMemberBalanceLog::getMemberId, memberId)
                        .eq(SalonMemberBalanceLog::getBizType, "REFUND")
                        .in(SalonMemberBalanceLog::getBizId, refundIds)
                        .eq(SalonMemberBalanceLog::getBalanceType, bucket)
                        .eq(SalonMemberBalanceLog::getChangeType, CT_REFUND_BACK));
        return logs.stream()
                .map(SalonMemberBalanceLog::getChangeAmount)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    /** 订单累计成功退款总额（refund_amount 汇总，资金口径） */
    private BigDecimal sumRefunded(Long orderId) {
        List<SalonRefundOrder> refunds = refundOrderMapper.selectList(Wrappers.<SalonRefundOrder>lambdaQuery()
                .select(SalonRefundOrder::getRefundAmount)
                .eq(SalonRefundOrder::getOrderId, orderId)
                .eq(SalonRefundOrder::getStatus, SalonRefundOrder.STATUS_SUCCESS));
        return refunds.stream()
                .map(SalonRefundOrder::getRefundAmount)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    /** 渠道支付流水退款全额退光时置 refunded（关联首次触发的退款单；精确分摊见 salon_refund_payment.pay_record_id） */
    private void markRecordRefunded(Long payRecordId, Long refundId) {
        SalonPayRecord record = payRecordMapper.selectById(payRecordId);
        if (record == null || !SalonPayRecord.STATUS_PAID.equals(record.getStatus())) {
            return;
        }
        List<SalonRefundPayment> rowsOnRecord = refundPaymentMapper.selectList(
                Wrappers.<SalonRefundPayment>lambdaQuery()
                        .select(SalonRefundPayment::getAmount)
                        .eq(SalonRefundPayment::getPayRecordId, payRecordId)
                        .eq(SalonRefundPayment::getChannelStatus, SalonRefundPayment.CHANNEL_STATUS_SUCCESS));
        BigDecimal refundedOnRecord = rowsOnRecord.stream()
                .map(SalonRefundPayment::getAmount)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        if (refundedOnRecord.compareTo(record.getAmount()) >= 0) {
            payRecordMapper.update(null, Wrappers.<SalonPayRecord>lambdaUpdate()
                    .set(SalonPayRecord::getStatus, SalonPayRecord.STATUS_REFUNDED)
                    .set(SalonPayRecord::getRefundId, refundId)
                    .eq(SalonPayRecord::getId, payRecordId)
                    .eq(SalonPayRecord::getStatus, SalonPayRecord.STATUS_PAID));
        }
    }
}
