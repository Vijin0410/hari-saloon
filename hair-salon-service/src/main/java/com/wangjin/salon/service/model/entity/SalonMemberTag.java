package com.wangjin.salon.service.model.entity;

import com.baomidou.mybatisplus.annotation.FieldStrategy;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;
import com.wangjin.common.base.BaseTenantEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 会员标签字典（租户级）。
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("salon_member_tag")
public class SalonMemberTag extends BaseTenantEntity<Long> {

    /** 标签名称 */
    private String name;
    /** 标签颜色（前端展示） */
    @TableField(updateStrategy = FieldStrategy.ALWAYS)
    private String color;
    /** 排序 */
    private Integer sort;
    /** 状态（1=启用 0=禁用） */
    private Integer status;
    /** 备注 */
    @TableField(updateStrategy = FieldStrategy.ALWAYS)
    private String remark;
}
