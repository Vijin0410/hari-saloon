package com.wangjin.salon.system.model.entity;

import com.baomidou.mybatisplus.annotation.FieldStrategy;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;
import com.wangjin.common.base.BaseTenantEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 部门。
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("sys_dept")
public class SysDept extends BaseTenantEntity<Long> {

    /** 部门名称 */
    private String name;
    /** 父部门ID（顶级为 0） */
    private Long parentId;
    /** 树路径（祖先ID逗号分隔） */
    private String treePath;
    /** 排序（升序） */
    private Integer sort;
    /** 状态：1启用 0禁用 */
    private Integer status;
    /** 负责人ID */
    @TableField(updateStrategy = FieldStrategy.ALWAYS)
    private Long leaderId;
}
