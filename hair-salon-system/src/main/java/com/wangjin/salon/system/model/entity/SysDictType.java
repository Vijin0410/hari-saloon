package com.wangjin.salon.system.model.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.wangjin.common.base.BaseTenantEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 字典类型。
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("sys_dict_type")
public class SysDictType extends BaseTenantEntity<Long> {

    private String name;
    private String code;
    private Integer status;
    private String remark;
    private String groupCode;
}
