package com.wangjin.salon.system.model.entity;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.FieldStrategy;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.io.Serial;
import java.io.Serializable;

/**
 * 字典数据项（带租户）。
 */
@Data
@TableName("sys_dict")
public class SysDict implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    /** 主键 */
    @TableId(type = IdType.ASSIGN_ID)
    private Long id;
    /** 所属字典类型编码 */
    private String typeCode;
    /** 字典项名称 */
    private String name;
    /** 字典项值 */
    private String value;
    /** 排序（升序） */
    private Integer sort;
    /** 状态：1启用 0禁用 */
    private Integer status;
    /** 是否默认：1是 0否 */
    private Integer defaulted;
    /** 备注 */
    @TableField(updateStrategy = FieldStrategy.ALWAYS)
    private String remark;
    /** 租户ID */
    @TableField(fill = FieldFill.INSERT)
    private Long tenantId;
}
