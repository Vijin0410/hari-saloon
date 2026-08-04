package com.wangjin.salon.system.model.entity;

import com.baomidou.mybatisplus.annotation.FieldStrategy;
import com.baomidou.mybatisplus.annotation.TableField;
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

    /** 角色名称 */
    private String name;
    /** 角色编码 */
    private String code;
    /** 排序（升序） */
    private Integer sort;
    /** 状态：1启用 0禁用 */
    private Integer status;
    /** 数据权限范围，见 DataScopeEnum */
    private Integer dataScope;
    /** 自定义数据权限部门 ID，逗号分隔 */
    @TableField(updateStrategy = FieldStrategy.ALWAYS)
    private String deptIds;
}
