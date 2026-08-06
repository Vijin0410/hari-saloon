package com.wangjin.salon.service.model.entity;

import com.baomidou.mybatisplus.annotation.FieldStrategy;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;
import com.wangjin.common.base.BaseTenantEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Salon member. Store range is controlled by storeId.
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("salon_member")
public class SalonMember extends BaseTenantEntity<Long> {

    /** 会员姓名 */
    private String name;
    /** 手机号 */
    @TableField(updateStrategy = FieldStrategy.ALWAYS)
    private String phone;
    /** 性别（字典 gender） */
    private Integer gender;
    /** 生日 */
    @TableField(updateStrategy = FieldStrategy.ALWAYS)
    private LocalDate birthday;
    /** 会员等级ID（关联salon_member_level，空=普通，建档时由service填默认等级） */
    private Long levelId;
    /** 余额 */
    private BigDecimal balance;
    /** 积分 */
    private Integer points;
    /** 来源（字典 member_source） */
    @TableField(updateStrategy = FieldStrategy.ALWAYS)
    private String source;
    /** 状态：1启用 0禁用 */
    private Integer status;
    /** 备注 */
    @TableField(updateStrategy = FieldStrategy.ALWAYS)
    private String remark;
    /** 所属门店ID */
    private Long storeId;
}
