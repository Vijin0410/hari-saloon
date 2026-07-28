package com.wangjin.salon.system.model.entity;

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

    private String name;
    private Long parentId;
    private String treePath;
    private Integer sort;
    private Integer status;
    private Long leaderId;
}
