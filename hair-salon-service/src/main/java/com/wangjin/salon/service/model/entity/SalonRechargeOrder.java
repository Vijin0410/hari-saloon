package com.wangjin.salon.service.model.entity;

import com.baomidou.mybatisplus.annotation.FieldStrategy;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;
import com.wangjin.common.base.BaseTenantEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 充值订单（本金计预收款不计营业收入；赠送单独记录）。
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("salon_recharge_order")
public class SalonRechargeOrder extends BaseTenantEntity<Long> {

    /** 赠送来源：1=充值活动 2=等级赠送率兜底 3=无赠送 */
    public static final int GIFT_SOURCE_ACTIVITY = 1;
    public static final int GIFT_SOURCE_LEVEL = 2;
    public static final int GIFT_SOURCE_NONE = 3;

    /** 支付状态：0=待支付（渠道扫码中） 1=已支付 2=已取消（超时关闭或人工取消，未入账） */
    public static final int STATUS_PENDING = 0;
    public static final int STATUS_PAID = 1;
    public static final int STATUS_CANCELLED = 2;

    /** 充值门店ID */
    private Long storeId;
    /** 充值单号 */
    private String rechargeNo;
    /** 会员ID */
    private Long memberId;
    /** 命中的充值活动ID（NULL=未命中活动，走等级兜底或无赠送） */
    private Long activityId;
    /** 本金金额（实收，计入预收款） */
    private BigDecimal principalAmount;
    /** 赠送金额（不计营业收入，与本金分流水） */
    private BigDecimal giftAmount;
    /** 赠送来源（1=充值活动 2=等级赠送率兜底 3=无赠送） */
    private Integer giftSource;
    /** 赠送是否冻结至次月（1=活动赠送冻结，次月1日后解冻；0=不冻结） */
    private Integer giftFrozen;
    /** 赠送解冻时间（NULL=未解冻或无需解冻） */
    @TableField(updateStrategy = FieldStrategy.ALWAYS)
    private LocalDateTime unfrozenTime;
    /** 支付方式（字典 pay_method：1现金 2微信 3支付宝 4银行卡 8其他） */
    private Integer payMethod;
    /** 支付状态（0=待支付（渠道扫码中） 1=已支付 2=已取消（超时关闭或人工取消）；默认1兼容一期手动确认即入账） */
    private Integer status;
    /** 支付确认时间 */
    private LocalDateTime payTime;
    /** 操作人ID */
    private Long operatorId;
    /** 备注 */
    private String remark;
}
