package com.wangjin.salon.service.model.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.wangjin.common.base.BaseTenantEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDate;

/**
 * 会员积分流水（获得类带 expireTime/remainingPoints 兼作批次，支持过期清零）。
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("salon_member_point_log")
public class SalonMemberPointLog extends BaseTenantEntity<Long> {

    /** 会员ID */
    private Long memberId;
    /** 发生门店ID（冗余，便于门店维度查询） */
    private Long storeId;
    /** 变动类型（1=消费获得 2=充值获得 3=活动赠送 4=手工调整 5=抵扣消费 6=兑换商品 7=手工扣减 8=过期清零） */
    private Integer changeType;
    /** 变动前积分 */
    private Integer beforePoints;
    /** 变动积分（正=增加 负=减少） */
    private Integer changePoints;
    /** 变动后积分 */
    private Integer afterPoints;
    /** 过期时间（仅获得类有效，按天；选当天则在当天24:00后过期。DB 为 timestamp，按天存当天 00:00:00） */
    private LocalDate expireTime;
    /** 批次剩余可扣积分（仅获得类有效，FIFO消费/过期时递减） */
    private Integer remainingPoints;
    /** 被扣减的获得批次流水ID（消费/过期类指向源批次） */
    private Long sourceLogId;
    /** 关联业务类型（ORDER/RECHARGE/ACTIVITY/MANUAL/EXCHANGE） */
    private String bizType;
    /** 关联业务单据ID */
    private Long bizId;
    /** 关联业务单号 */
    private String bizNo;
    /** 操作人ID */
    private Long operatorId;
    /** 备注 */
    private String remark;
}
