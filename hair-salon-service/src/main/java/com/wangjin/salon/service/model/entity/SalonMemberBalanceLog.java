package com.wangjin.salon.service.model.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.wangjin.common.base.BaseTenantEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.math.BigDecimal;

/**
 * 会员余额流水（每次变动必记；按桶分行：一次充值产生本金/赠送两条）。
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("salon_member_balance_log")
public class SalonMemberBalanceLog extends BaseTenantEntity<Long> {

    /** 会员ID */
    private Long memberId;
    /** 发生门店ID（冗余，便于门店维度查询） */
    private Long storeId;
    /** 余额桶（1=本金 2=赠送 3=冻结） */
    private Integer balanceType;
    /** 业务类型（1=充值 2=充值赠送 3=消费扣款 4=退款退回 5=手工调整 6=余额转入 7=余额转出 8=冻结 9=解冻） */
    private Integer changeType;
    /** 变动前金额（该桶） */
    private BigDecimal beforeAmount;
    /** 变动金额（正=增加 负=减少） */
    private BigDecimal changeAmount;
    /** 变动后金额（该桶） */
    private BigDecimal afterAmount;
    /** 关联业务类型（RECHARGE/ORDER/REFUND/MANUAL/TRANSFER） */
    private String bizType;
    /** 关联业务单据ID（充值单/订单/退款单） */
    private Long bizId;
    /** 关联业务单号 */
    private String bizNo;
    /** 操作人ID */
    private Long operatorId;
    /** 备注 */
    private String remark;
}
