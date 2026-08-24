package com.wangjin.salon.service.model.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.wangjin.common.base.BaseTenantEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 充值活动（租户级，充 X 送 Y 档位）。
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("salon_recharge_activity")
public class SalonRechargeActivity extends BaseTenantEntity<Long> {

    /** 活动名称（如充500送50） */
    private String name;
    /** 充值门槛（单笔充值金额>=该值可享） */
    private BigDecimal thresholdAmount;
    /** 赠送金额 */
    private BigDecimal giftAmount;
    /** 生效时间（NULL=立即生效） */
    private LocalDateTime startTime;
    /** 失效时间（NULL=长期有效） */
    private LocalDateTime endTime;
    /** 排序 */
    private Integer sort;
    /** 状态（1=启用 0=禁用） */
    private Integer status;
    /** 备注 */
    private String remark;
}
