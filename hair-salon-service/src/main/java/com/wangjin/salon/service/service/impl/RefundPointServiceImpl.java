package com.wangjin.salon.service.service.impl;

import com.wangjin.salon.service.service.MemberAssetService;
import com.wangjin.salon.service.service.RefundPointService;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.wangjin.common.exception.BizException;
import com.wangjin.common.security.util.SecurityUtils;
import com.wangjin.salon.service.mapper.*;
import com.wangjin.salon.service.model.entity.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/** 退款权益：定位原批次，累计分摊，原奖励不足时记录待追回。调用方先持有订单行锁。 */
@Service
@RequiredArgsConstructor
public class RefundPointServiceImpl implements RefundPointService {
    private final SalonMemberMapper memberMapper;
    private final SalonMemberPointLogMapper pointLogMapper;
    private final SalonRefundOrderMapper refundMapper;
    private final MemberAssetService assetService;

    public static int cumulative(int original, BigDecimal refunded, BigDecimal received) {
        if (received.signum() == 0 || refunded.compareTo(received) >= 0) return original;
        return BigDecimal.valueOf(original).multiply(refunded).divide(received, 0, RoundingMode.DOWN).intValueExact();
    }

    public void preview(SalonOrder order, SalonRefundOrder refund) {
        List<SalonRefundOrder> previous = refundMapper.selectList(Wrappers.<SalonRefundOrder>lambdaQuery()
                .eq(SalonRefundOrder::getOrderId, order.getId()).eq(SalonRefundOrder::getStatus, SalonRefundOrder.STATUS_SUCCESS)
                .ne(refund.getId() != null, SalonRefundOrder::getId, refund.getId()));
        BigDecimal cumulativeAmount = previous.stream().map(SalonRefundOrder::getRefundAmount)
                .reduce(refund.getRefundAmount(), BigDecimal::add);
        int returned = previous.stream().mapToInt(r -> value(r.getPointRefundPoints())).sum();
        int clawed = previous.stream().mapToInt(r -> value(r.getPointClawbackPoints())).sum();
        int earned = orderLogs(order, 1).stream().mapToInt(l -> value(l.getChangePoints())).sum();
        refund.setPointRefundPoints(Math.max(0, cumulative(value(order.getPointDeductPoints()), cumulativeAmount, order.getReceivedAmount()) - returned));
        refund.setPointClawbackPoints(Math.max(0, cumulative(earned, cumulativeAmount, order.getReceivedAmount()) - clawed));
        // 使用原订单金额快照，避免日后兑换比例改变影响历史退款。
        refund.setPointRefundAmount(value(order.getPointDeductPoints()) == 0 ? BigDecimal.ZERO
                : order.getPointDeductAmount().multiply(BigDecimal.valueOf(refund.getPointRefundPoints()))
                    .divide(BigDecimal.valueOf(order.getPointDeductPoints()), 2, RoundingMode.DOWN));
    }

    @Transactional(rollbackFor = Exception.class)
    public void confirm(SalonOrder order, SalonRefundOrder refund) {
        if (order.getMemberId() == null) return;
        SalonMember member = memberMapper.selectOne(Wrappers.<SalonMember>lambdaQuery()
                .eq(SalonMember::getId, order.getMemberId()).last("FOR UPDATE"));
        if (member == null) throw new BizException("退款会员不存在");
        assetService.expireMemberPoints(member.getId(), LocalDateTime.now());
        member = memberMapper.selectById(member.getId());
        int need = value(refund.getPointRefundPoints());
        for (SalonMemberPointLog deduction : orderLogs(order, 5)) {
            if (need == 0) break;
            int take = Math.min(need, -deduction.getChangePoints() - value(deduction.getRefundProcessedPoints()));
            if (take <= 0) continue;
            SalonMemberPointLog original = pointLogMapper.selectById(deduction.getSourceLogId());
            if (original == null) throw new BizException("原积分批次不存在，无法确认退款");
            LocalDate expiry = original.getExpireTime();
            if (expiry != null && expiry.isBefore(LocalDate.now())) expiry = LocalDate.now().plusDays(30);
            SalonMemberPointLog back = log(member, refund, 9, take, original.getId(), "退款退回原抵扣积分");
            back.setExpireTime(expiry);
            back.setRemainingPoints(take);
            pointLogMapper.insert(back);
            markProcessed(deduction, take);
            need -= take;
        }
        if (need != 0) throw new BizException("原积分抵扣流水与订单不一致，无法确认退款");

        int deducted = 0, expired = 0, debt = 0;
        need = value(refund.getPointClawbackPoints());
        for (SalonMemberPointLog batch : orderLogs(order, 1)) {
            if (need == 0) break;
            int take = Math.min(need, batch.getChangePoints() - value(batch.getRefundProcessedPoints()));
            if (take <= 0) continue;
            int available = Math.min(take, value(batch.getRemainingPoints()));
            int expiredTotal = pointLogMapper.selectList(Wrappers.<SalonMemberPointLog>lambdaQuery()
                    .eq(SalonMemberPointLog::getSourceLogId, batch.getId()).eq(SalonMemberPointLog::getChangeType, 8))
                    .stream().mapToInt(l -> -l.getChangePoints()).sum();
            int expiredUsed = pointLogMapper.selectList(Wrappers.<SalonMemberPointLog>lambdaQuery()
                    .eq(SalonMemberPointLog::getSourceLogId, batch.getId()).eq(SalonMemberPointLog::getChangeType, 10))
                    .stream().mapToInt(l -> value(l.getRefundProcessedPoints()) + value(l.getChangePoints()) - value(l.getDebtChangePoints())).sum();
            int exempt = Math.min(take - available, Math.max(0, expiredTotal - expiredUsed));
            int missing = take - available - exempt;
            batch.setRemainingPoints(value(batch.getRemainingPoints()) - available);
            markProcessed(batch, take);
            SalonMemberPointLog reversal = log(member, refund, 10, -available, batch.getId(), "退款回收消费奖励：扣回" + available + "，过期免扣" + exempt + "，待追回" + missing);
            reversal.setRefundProcessedPoints(take);
            reversal.setDebtChangePoints(missing);
            pointLogMapper.insert(reversal);
            deducted += available; expired += exempt; debt += missing; need -= take;
        }
        if (need != 0) throw new BizException("消费奖励流水与退款权益不一致");
        member.setPointDebt(value(member.getPointDebt()) + debt);
        memberMapper.update(null, Wrappers.<SalonMember>lambdaUpdate().set(SalonMember::getPoints, member.getPoints())
                .set(SalonMember::getPointDebt, member.getPointDebt()).eq(SalonMember::getId, member.getId()));
        refund.setPointClawbackDeducted(deducted);
        refund.setPointClawbackExpired(expired);
        refund.setPointClawbackDebt(debt);
    }

    private List<SalonMemberPointLog> orderLogs(SalonOrder order, int type) {
        return pointLogMapper.selectList(Wrappers.<SalonMemberPointLog>lambdaQuery()
                .eq(SalonMemberPointLog::getMemberId, order.getMemberId()).eq(SalonMemberPointLog::getBizType, "ORDER")
                .eq(SalonMemberPointLog::getBizId, order.getId()).eq(SalonMemberPointLog::getChangeType, type)
                .orderByAsc(SalonMemberPointLog::getCreateTime, SalonMemberPointLog::getId));
    }

    private void markProcessed(SalonMemberPointLog source, int take) {
        source.setRefundProcessedPoints(value(source.getRefundProcessedPoints()) + take);
        pointLogMapper.updateById(source);
    }

    private SalonMemberPointLog log(SalonMember member, SalonRefundOrder refund, int type, int delta, Long sourceId, String remark) {
        SalonMemberPointLog row = new SalonMemberPointLog();
        row.setMemberId(member.getId()); row.setTenantId(member.getTenantId()); row.setStoreId(refund.getStoreId());
        row.setChangeType(type); row.setBeforePoints(value(member.getPoints())); row.setChangePoints(delta);
        member.setPoints(value(member.getPoints()) + delta); row.setAfterPoints(member.getPoints());
        row.setSourceLogId(sourceId); row.setBizType("REFUND"); row.setBizId(refund.getId()); row.setBizNo(refund.getRefundNo());
        row.setOperatorId(SecurityUtils.getUserId()); row.setRemark(remark);
        return row;
    }

    private static int value(Integer value) { return value == null ? 0 : value; }
}
