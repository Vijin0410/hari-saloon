package com.wangjin.salon.service.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 会员资产领域服务：余额/积分变动的通用入口。
 * <p>
 * P4 充值 / P5 消费 / P6 退款均调用本服务，保证每笔变动有流水、并发安全、member 冗余字段同步。
 */
public interface MemberAssetService {

    /**
     * 余额变动（通用）。changeAmount 正增负减。
     * <p>
     * 事务内：更新 balance（乐观锁重试）+ 插 balance_log + 同步 member.balance（可用总余额）+ 更新最近充值/消费时间。
     *
     * @param memberId      会员ID
     * @param balanceType   余额桶（1本金 2赠送 3冻结）
     * @param changeAmount  变动金额（正=增加 负=减少）
     * @param changeType    业务类型（1充值 2充值赠送 3消费扣款 4退款退回 5手工调整 6转入 7转出 8冻结 9解冻）
     * @param bizType       关联业务类型（RECHARGE/ORDER/REFUND/MANUAL/TRANSFER）
     * @param bizId         关联业务单据ID
     * @param bizNo         关联业务单号
     * @param remark        备注
     */
    void changeBalance(Long memberId, int balanceType, BigDecimal changeAmount,
                       int changeType, String bizType, Long bizId, String bizNo, String remark);

    /**
     * 积分变动（通用）。changePoints 正增负减。
     * <p>
     * 获得类（&gt;0）写入批次流水（remainingPoints=changePoints，可选 expireTime）；扣减类（&lt;0）按 FIFO 扣减最早可用批次；
     * 事务内：插 point_log + 同步 member.points。
     *
     * @param memberId     会员ID
     * @param changePoints 变动积分（正=增加 负=减少）
     * @param changeType   变动类型（1消费获得 2充值获得 3活动赠送 4手工调整 5抵扣消费 6兑换商品 7手工扣减 8过期清零）
     * @param bizType      关联业务类型（ORDER/RECHARGE/ACTIVITY/MANUAL/EXCHANGE）
     * @param bizId        关联业务单据ID
     * @param bizNo        关联业务单号
     * @param expireTime   过期时间（仅获得类有效）
     * @param remark       备注
     */
    void changePoints(Long memberId, int changePoints, int changeType,
                      String bizType, Long bizId, String bizNo,
                      LocalDate expireTime, String remark);

    /**
     * 清零指定会员已到期的积分批次，生成过期清零流水（changeType=8）。
     * <p>
     * 定时任务逐租户调用：扫描 expireTime 早于 now 对应日期（即过期日期 &lt; 今天，选当天则在当天24:00后过期）且 remainingPoints &gt; 0 的获得类批次（expireTime 为空表示永不过期），
     * 条件置零批次 remainingPoints（幂等，防并发/重复执行重复扣减），逐批写一条过期清零流水（sourceLogId 指向源批次），
     * 原子扣减 member.points。须在目标租户上下文（{@link com.wangjin.salon.system.util.TenantContextRunner}）内调用。
     *
     * @param memberId 会员ID
     * @param now      截止时间（一般 {@code LocalDateTime.now()}）
     * @return 实际清零的积分总数（0 表示无到期批次）
     */
    int expireMemberPoints(Long memberId, LocalDateTime now);
}
