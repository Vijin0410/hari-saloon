package com.wangjin.salon.service.model.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.wangjin.common.base.BaseTenantEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@TableName("salon_member_settings_audit")
public class MemberSettingsAudit extends BaseTenantEntity<Long> {
    /** 修改前积分开关（1=启用 0=停用） */
    private Integer beforeEnabled;
    /** 修改后积分开关（1=启用 0=停用） */
    private Integer afterEnabled;
}
