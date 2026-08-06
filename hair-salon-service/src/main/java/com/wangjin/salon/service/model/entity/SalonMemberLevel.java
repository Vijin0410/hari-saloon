package com.wangjin.salon.service.model.entity;

import com.baomidou.mybatisplus.annotation.FieldStrategy;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;
import com.wangjin.common.base.BaseTenantEntity;
import com.wangjin.salon.service.handler.JsonbStringTypeHandler;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.math.BigDecimal;

/**
 * 会员等级配置（租户级，影响折扣/积分倍率/充值优惠/权益）。
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName(value = "salon_member_level", autoResultMap = true)
public class SalonMemberLevel extends BaseTenantEntity<Long> {

    /** 等级名称（如普通/银卡/金卡/钻石） */
    private String name;
    /** 等级序号（0=普通，数值越大等级越高，用于比较） */
    private Integer levelNo;
    /** 服务折扣（0.00-1.00，1=不打折，NULL=不参与折扣） */
    private BigDecimal serviceDiscount;
    /** 商品折扣（0.00-1.00，1=不打折，NULL=不参与折扣） */
    private BigDecimal goodsDiscount;
    /** 积分倍率（1.00=正常，1.50=1.5倍） */
    private BigDecimal pointRate;
    /** 充值赠送率（0.10=充100送10），等级默认值，P4充值活动可叠加 */
    private BigDecimal rechargeGiftRate;
    /** 升级门槛（累计消费金额），NULL=不自动升级 */
    private BigDecimal upgradeThreshold;
    /** 专属权益（JSON，如生日礼包、专属项目） */
    @TableField(value = "rights", typeHandler = JsonbStringTypeHandler.class)
    private String rights;
    /** 排序 */
    private Integer sort;
    /** 状态（1=启用 0=禁用） */
    private Integer status;
    /** 备注 */
    @TableField(updateStrategy = FieldStrategy.ALWAYS)
    private String remark;
}
