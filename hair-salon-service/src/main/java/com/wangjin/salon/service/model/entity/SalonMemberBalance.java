package com.wangjin.salon.service.model.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.baomidou.mybatisplus.annotation.Version;
import com.wangjin.common.base.BaseTenantEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 会员余额（1:1 salon_member；本金/赠送/冻结分桶 + 乐观锁）。
 * <p>
 * 可用总余额 = principalBalance + giftBalance - frozenBalance（不落库，冗余到 salon_member.balance）。
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("salon_member_balance")
public class SalonMemberBalance extends BaseTenantEntity<Long> {

    /** 会员ID */
    private Long memberId;
    /** 本金余额 */
    private BigDecimal principalBalance;
    /** 赠送余额 */
    private BigDecimal giftBalance;
    /** 冻结金额（可用=本金+赠送-冻结） */
    private BigDecimal frozenBalance;
    /** 最近充值时间 */
    private LocalDateTime lastRechargeTime;
    /** 最近消费时间 */
    private LocalDateTime lastConsumeTime;
    /** 乐观锁版本号 */
    @Version
    private Integer version;
}
