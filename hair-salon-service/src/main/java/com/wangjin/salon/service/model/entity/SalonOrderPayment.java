package com.wangjin.salon.service.model.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.wangjin.common.base.BaseTenantEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.math.BigDecimal;

/**
 * 订单支付明细（组合支付，每方式一行）。
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("salon_order_payment")
public class SalonOrderPayment extends BaseTenantEntity<Long> {

    /** 支付方式：1现金 2微信 3支付宝 4银行卡 5会员余额 6赠送余额 7积分抵扣 8其他 */
    public static final int METHOD_BALANCE = 5;
    public static final int METHOD_POINT = 7;

    /** 订单ID */
    private Long orderId;
    /** 支付方式（字典 pay_method：1现金 2微信 3支付宝 4银行卡 5会员余额 6赠送余额 7积分抵扣 8其他） */
    private Integer payMethod;
    /** 支付金额 */
    private BigDecimal amount;
    /** 备注 */
    private String remark;
}
