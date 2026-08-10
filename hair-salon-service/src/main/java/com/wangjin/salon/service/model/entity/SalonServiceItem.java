package com.wangjin.salon.service.model.entity;

import com.baomidou.mybatisplus.annotation.FieldStrategy;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;
import com.wangjin.common.base.BaseTenantEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.math.BigDecimal;

/**
 * 服务项目（租户级，收银开单可选；标准价/会员价/时长/是否折扣/是否提成）。
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("salon_service")
public class SalonServiceItem extends BaseTenantEntity<Long> {

    /** 项目名称 */
    private String name;
    /** 项目分类ID（关联salon_service_category） */
    private Long categoryId;
    /** 标准价格 */
    private BigDecimal standardPrice;
    /** 会员价格（NULL=无会员价，按标准价） */
    private BigDecimal memberPrice;
    /** 服务时长（分钟） */
    private Integer duration;
    /** 是否参与折扣（1=是 0=否） */
    private Integer discountable;
    /** 是否计算提成（1=是 0=否） */
    private Integer commissionable;
    /** 排序 */
    private Integer sort;
    /** 状态（1=启用 0=禁用） */
    private Integer status;
    /** 备注 */
    @TableField(updateStrategy = FieldStrategy.ALWAYS)
    private String remark;
}
