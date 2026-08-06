package com.wangjin.salon.service.service.impl;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.wangjin.common.exception.BizException;
import com.wangjin.common.security.util.SecurityUtils;
import com.wangjin.salon.service.mapper.SalonMemberBalanceLogMapper;
import com.wangjin.salon.service.mapper.SalonMemberBalanceMapper;
import com.wangjin.salon.service.mapper.SalonMemberMapper;
import com.wangjin.salon.service.mapper.SalonMemberPointLogMapper;
import com.wangjin.salon.service.model.entity.SalonMember;
import com.wangjin.salon.service.model.entity.SalonMemberBalance;
import com.wangjin.salon.service.model.entity.SalonMemberBalanceLog;
import com.wangjin.salon.service.model.entity.SalonMemberPointLog;
import com.wangjin.salon.service.service.MemberAssetService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class MemberAssetServiceImpl implements MemberAssetService {

    private final SalonMemberMapper memberMapper;
    private final SalonMemberBalanceMapper balanceMapper;
    private final SalonMemberBalanceLogMapper balanceLogMapper;
    private final SalonMemberPointLogMapper pointLogMapper;

    /** 余额桶：1本金 2赠送 3冻结 */
    private static final int BUCKET_PRINCIPAL = 1;
    private static final int BUCKET_GIFT = 2;
    /** 业务类型：1充值 2充值赠送 3消费扣款 */
    private static final int CT_RECHARGE = 1;
    private static final int CT_RECHARGE_GIFT = 2;
    private static final int CT_CONSUME = 3;

    /** 积分变动类型：8=过期清零 */
    private static final int CHANGE_TYPE_EXPIRE = 8;

    private static final int MAX_RETRY = 3;

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void changeBalance(Long memberId, int balanceType, BigDecimal changeAmount,
                              int changeType, String bizType, Long bizId, String bizNo, String remark) {
        if (changeAmount == null || changeAmount.compareTo(BigDecimal.ZERO) == 0) {
            return;
        }
        Long operatorId = SecurityUtils.getUserId();
        for (int attempt = 0; attempt < MAX_RETRY; attempt++) {
            SalonMember member = memberMapper.selectById(memberId);
            if (member == null) {
                throw new BizException("会员不存在");
            }
            SalonMemberBalance balance = balanceMapper.selectOne(
                    Wrappers.<SalonMemberBalance>lambdaQuery()
                            .eq(SalonMemberBalance::getMemberId, memberId));
            if (balance == null) {
                throw new BizException("会员余额档案不存在");
            }
            BigDecimal before = getBucket(balance, balanceType);
            BigDecimal after = before.add(changeAmount);
            if (after.compareTo(BigDecimal.ZERO) < 0) {
                throw new BizException("余额不足");
            }
            setBucket(balance, balanceType, after);
            LocalDateTime now = LocalDateTime.now();
            if (changeType == CT_RECHARGE || changeType == CT_RECHARGE_GIFT) {
                balance.setLastRechargeTime(now);
            } else if (changeType == CT_CONSUME) {
                balance.setLastConsumeTime(now);
            }
            int rows = balanceMapper.updateById(balance); // @Version 乐观锁
            if (rows == 0) {
                if (attempt == MAX_RETRY - 1) {
                    throw new BizException("余额变动并发冲突，请重试");
                }
                continue; // 版本冲突，重试
            }
            // 插流水
            SalonMemberBalanceLog log = new SalonMemberBalanceLog();
            log.setMemberId(memberId);
            log.setTenantId(member.getTenantId());
            log.setStoreId(member.getStoreId());
            log.setBalanceType(balanceType);
            log.setChangeType(changeType);
            log.setBeforeAmount(before);
            log.setChangeAmount(changeAmount);
            log.setAfterAmount(after);
            log.setBizType(bizType);
            log.setBizId(bizId);
            log.setBizNo(bizNo);
            log.setOperatorId(operatorId);
            log.setRemark(remark);
            balanceLogMapper.insert(log);
            // 同步 member.balance（可用总余额 = 本金 + 赠送 - 冻结）
            BigDecimal available = getBucket(balance, BUCKET_PRINCIPAL)
                    .add(getBucket(balance, BUCKET_GIFT))
                    .subtract(getBucket(balance, 3));
            memberMapper.update(null, Wrappers.<SalonMember>lambdaUpdate()
                    .set(SalonMember::getBalance, available)
                    .eq(SalonMember::getId, memberId));
            return;
        }
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void changePoints(Long memberId, int changePoints, int changeType,
                             String bizType, Long bizId, String bizNo,
                             LocalDate expireTime, String remark) {
        if (changePoints == 0) {
            return;
        }
        Long operatorId = SecurityUtils.getUserId();
        SalonMember member = memberMapper.selectById(memberId);
        if (member == null) {
            throw new BizException("会员不存在");
        }
        int before = member.getPoints() == null ? 0 : member.getPoints();
        int after = before + changePoints;
        if (after < 0) {
            throw new BizException("积分不足");
        }
        if (changePoints > 0) {
            // 获得类：写批次流水
            SalonMemberPointLog log = newPointLog(member, changeType, bizType, bizId, bizNo, operatorId, remark);
            log.setBeforePoints(before);
            log.setChangePoints(changePoints);
            log.setAfterPoints(after);
            log.setExpireTime(expireTime);
            log.setRemainingPoints(changePoints);
            pointLogMapper.insert(log);
        } else {
            // 扣减类：FIFO 扣减最早可用批次
            int need = -changePoints;
            List<SalonMemberPointLog> batches = pointLogMapper.selectList(
                    Wrappers.<SalonMemberPointLog>lambdaQuery()
                            .eq(SalonMemberPointLog::getMemberId, memberId)
                            .gt(SalonMemberPointLog::getRemainingPoints, 0)
                            .orderByAsc(SalonMemberPointLog::getCreateTime));
            int available = batches.stream()
                    .mapToInt(b -> b.getRemainingPoints() == null ? 0 : b.getRemainingPoints())
                    .sum();
            if (available < need) {
                throw new BizException("积分不足");
            }
            int runningBefore = before;
            int remaining = need;
            for (SalonMemberPointLog batch : batches) {
                if (remaining <= 0) {
                    break;
                }
                int deduct = Math.min(batch.getRemainingPoints(), remaining);
                batch.setRemainingPoints(batch.getRemainingPoints() - deduct);
                pointLogMapper.updateById(batch);
                SalonMemberPointLog log = newPointLog(member, changeType, bizType, bizId, bizNo, operatorId, remark);
                log.setBeforePoints(runningBefore);
                log.setChangePoints(-deduct);
                log.setAfterPoints(runningBefore - deduct);
                log.setSourceLogId(batch.getId());
                pointLogMapper.insert(log);
                runningBefore -= deduct;
                remaining -= deduct;
            }
        }
        // 同步 member.points
        memberMapper.update(null, Wrappers.<SalonMember>lambdaUpdate()
                .set(SalonMember::getPoints, after)
                .eq(SalonMember::getId, memberId));
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public int expireMemberPoints(Long memberId, LocalDateTime now) {
        SalonMember member = memberMapper.selectById(memberId);
        if (member == null) {
            return 0;
        }
        // 过期判定：expireDate < today（选当天则在当天24:00后过期，次日才清零）
        List<SalonMemberPointLog> dueBatches = pointLogMapper.selectList(
                Wrappers.<SalonMemberPointLog>lambdaQuery()
                        .eq(SalonMemberPointLog::getMemberId, memberId)
                        .gt(SalonMemberPointLog::getRemainingPoints, 0)
                        .isNotNull(SalonMemberPointLog::getExpireTime)
                        .lt(SalonMemberPointLog::getExpireTime, now.toLocalDate())
                        .orderByAsc(SalonMemberPointLog::getExpireTime));
        if (dueBatches.isEmpty()) {
            return 0;
        }
        Long operatorId = SecurityUtils.getUserId(); // 租户上下文内=0L（系统操作）
        int runningBefore = member.getPoints() == null ? 0 : member.getPoints();
        int totalDeduct = 0;
        for (SalonMemberPointLog batch : dueBatches) {
            int deduct = batch.getRemainingPoints();
            // 条件置零：幂等，防并发/重复执行时重复扣减（rows=0 表示已被其他事务清零，跳过）
            int rows = pointLogMapper.update(null, Wrappers.<SalonMemberPointLog>lambdaUpdate()
                    .set(SalonMemberPointLog::getRemainingPoints, 0)
                    .eq(SalonMemberPointLog::getId, batch.getId())
                    .eq(SalonMemberPointLog::getRemainingPoints, deduct));
            if (rows == 0) {
                continue;
            }
            SalonMemberPointLog log = newPointLog(member, CHANGE_TYPE_EXPIRE, null, null, null, operatorId, "积分到期清零");
            log.setBeforePoints(runningBefore);
            log.setChangePoints(-deduct);
            log.setAfterPoints(runningBefore - deduct);
            log.setSourceLogId(batch.getId());
            pointLogMapper.insert(log);
            runningBefore -= deduct;
            totalDeduct += deduct;
        }
        if (totalDeduct > 0) {
            // 原子扣减 member.points，避免与并发的积分变动互相覆盖（流水 before/after 为事务内快照）
            memberMapper.update(null, Wrappers.<SalonMember>lambdaUpdate()
                    .setSql("points = points - " + totalDeduct)
                    .eq(SalonMember::getId, memberId));
        }
        return totalDeduct;
    }

    private SalonMemberPointLog newPointLog(SalonMember member, int changeType, String bizType, Long bizId,
                                            String bizNo, Long operatorId, String remark) {
        SalonMemberPointLog log = new SalonMemberPointLog();
        log.setMemberId(member.getId());
        log.setTenantId(member.getTenantId());
        log.setStoreId(member.getStoreId());
        log.setChangeType(changeType);
        log.setBizType(bizType);
        log.setBizId(bizId);
        log.setBizNo(bizNo);
        log.setOperatorId(operatorId);
        log.setRemark(remark);
        return log;
    }

    private BigDecimal getBucket(SalonMemberBalance balance, int balanceType) {
        BigDecimal v = switch (balanceType) {
            case BUCKET_PRINCIPAL -> balance.getPrincipalBalance();
            case BUCKET_GIFT -> balance.getGiftBalance();
            case 3 -> balance.getFrozenBalance();
            default -> throw new BizException("非法余额桶类型");
        };
        return v == null ? BigDecimal.ZERO : v;
    }

    private void setBucket(SalonMemberBalance balance, int balanceType, BigDecimal value) {
        switch (balanceType) {
            case BUCKET_PRINCIPAL -> balance.setPrincipalBalance(value);
            case BUCKET_GIFT -> balance.setGiftBalance(value);
            case 3 -> balance.setFrozenBalance(value);
            default -> throw new BizException("非法余额桶类型");
        }
    }
}
