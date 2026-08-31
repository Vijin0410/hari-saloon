package com.wangjin.salon.service.model.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.wangjin.common.base.BaseTenantEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 收银订单（挂单=status 0）。
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("salon_order")
public class SalonOrder extends BaseTenantEntity<Long> {

    /** 订单状态：0=挂单 1=已支付 2=部分退款 3=已退款 4=已取消 */
    public static final int STATUS_PENDING = 0;
    public static final int STATUS_PAID = 1;
    public static final int STATUS_PART_REFUNDED = 2;
    public static final int STATUS_REFUNDED = 3;
    public static final int STATUS_CANCELLED = 4;

    /** 开单门店ID */
    private Long storeId;
    /** 订单号 */
    private String orderNo;
    /** 会员ID（NULL=散客） */
    private Long memberId;
    /** 原价合计（明细原单价×数量，未折） */
    private BigDecimal itemAmount;
    /** 优惠总额（会员等级折扣减免=原价合计-折后合计） */
    private BigDecimal discountAmount;
    /** 应收金额（折后-积分抵扣前） */
    private BigDecimal payableAmount;
    /** 积分抵扣使用的积分数 */
    private Integer pointDeductPoints;
    /** 积分抵扣金额 */
    private BigDecimal pointDeductAmount;
    /** 实收金额（应收-积分抵扣；含会员余额支付部分） */
    private BigDecimal receivedAmount;
    /** 找零金额（现金投入-现金应收，>=0） */
    private BigDecimal changeAmount;
    /** 状态（0=挂单 1=已支付 2=部分退款 3=已退款 4=已取消） */
    private Integer status;
    /** 支付完成时间 */
    private LocalDateTime paidTime;
    /** 备注 */
    private String remark;
}
