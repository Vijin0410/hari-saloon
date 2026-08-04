package com.wangjin.salon.system.model.entity;

import com.baomidou.mybatisplus.annotation.FieldStrategy;
import com.baomidou.mybatisplus.annotation.TableField;
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

    /** 字典类型名称 */
    private String name;
    /** 字典类型编码 */
    private String code;
    /** 状态：1启用 0禁用 */
    private Integer status;
    /** 备注 */
    @TableField(updateStrategy = FieldStrategy.ALWAYS)
    private String remark;
    /** 分组编码 */
    @TableField(updateStrategy = FieldStrategy.ALWAYS)
    private String groupCode;
}
