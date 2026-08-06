package com.wangjin.salon.service.model.entity;

import com.baomidou.mybatisplus.annotation.FieldStrategy;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;
import com.wangjin.common.base.BaseTenantEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 会员结构化备注（1:1 salon_member）。
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("salon_member_profile")
public class SalonMemberProfile extends BaseTenantEntity<Long> {

    /** 会员ID */
    private Long memberId;
    /** 发质情况 */
    @TableField(updateStrategy = FieldStrategy.ALWAYS)
    private String hairQuality;
    /** 偏好发型 */
    @TableField(updateStrategy = FieldStrategy.ALWAYS)
    private String preferredStyle;
    /** 常用发型师ID（关联sys_user） */
    @TableField(updateStrategy = FieldStrategy.ALWAYS)
    private Long preferredStylistId;
    /** 过敏信息 */
    @TableField(updateStrategy = FieldStrategy.ALWAYS)
    private String allergy;
    /** 服务禁忌 */
    @TableField(updateStrategy = FieldStrategy.ALWAYS)
    private String taboo;
    /** 扩展备注 */
    @TableField(updateStrategy = FieldStrategy.ALWAYS)
    private String remark;
}
