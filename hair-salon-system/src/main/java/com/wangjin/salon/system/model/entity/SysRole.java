package com.wangjin.salon.system.model.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.wangjin.common.base.BaseTenantEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 角色。
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("sys_role")
public class SysRole extends BaseTenantEntity<Long> {

    private String name;
    private String code;
    private Integer sort;
    private Integer status;
    /** 数据权限范围，见 DataScopeEnum */
    private Integer dataScope;
    /** 自定义数据权限部门 ID，逗号分隔 */
    private String deptIds;
}
