package com.wangjin.salon.system.model.entity;

import com.baomidou.mybatisplus.annotation.FieldFill;
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

    @TableId(type = IdType.ASSIGN_ID)
    private Long id;
    private String typeCode;
    private String name;
    private String value;
    private Integer sort;
    private Integer status;
    private Integer defaulted;
    private String remark;

    @TableField(fill = FieldFill.INSERT)
    private Long tenantId;
}
