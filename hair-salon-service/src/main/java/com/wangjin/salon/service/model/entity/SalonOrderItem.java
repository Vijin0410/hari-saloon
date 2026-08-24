package com.wangjin.salon.service.model.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.wangjin.common.base.BaseTenantEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.math.BigDecimal;

/**
 * 订单明细（服务/商品行 + 服务人员绑定）。
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("salon_order_item")
public class SalonOrderItem extends BaseTenantEntity<Long> {

    /** 明细类型：1=服务项目 2=商品 */
    public static final int TYPE_SERVICE = 1;
    public static final int TYPE_GOODS = 2;

    /** 订单ID */
    private Long orderId;
    /** 明细类型（1=服务项目 2=商品） */
    private Integer itemType;
    /** 项目/商品ID */
    private Long itemId;
    /** 名称快照（下单时） */
    private String itemName;
    /** 原单价（服务=会员价或标准价，商品=销售价） */
    private BigDecimal unitPrice;
    /** 实际单价（收银可改价） */
    private BigDecimal price;
    /** 数量 */
    private Integer quantity;
    /** 行折扣率快照（会员等级折扣，1.00=未折；discountable=0 的行恒为1） */
    private BigDecimal discountRate;
    /** 行小计（price×quantity×discount_rate） */
    private BigDecimal subtotal;
    /** 主服务人员ID（关联sys_user） */
    private Long staffId;
    /** 助理ID（关联sys_user） */
    private Long assistantId;
    /** 备注 */
    private String remark;
}
