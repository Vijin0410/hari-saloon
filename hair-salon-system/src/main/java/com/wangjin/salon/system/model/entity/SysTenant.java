package com.wangjin.salon.system.model.entity;

import com.baomidou.mybatisplus.annotation.FieldStrategy;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;
import com.fasterxml.jackson.annotation.JsonFormat;
import com.wangjin.common.base.BaseEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;

/**
 * 租户主数据（全局表，不做 tenant_id 行过滤）。
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("sys_tenant")
public class SysTenant extends BaseEntity<Long> {

    /** 租户名称 */
    private String name;
    /** 租户编码 */
    private String code;
    /** 1 启用 / 0 禁用 */
    private Integer status;
    /** 联系人 */
    @TableField(updateStrategy = FieldStrategy.ALWAYS)
    private String contact;
    /** 联系电话 */
    @TableField(updateStrategy = FieldStrategy.ALWAYS)
    private String phone;
    /** 到期时间 */
    @TableField(updateStrategy = FieldStrategy.ALWAYS)
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime expireTime;
    /** 备注 */
    @TableField(updateStrategy = FieldStrategy.ALWAYS)
    private String remark;
}
