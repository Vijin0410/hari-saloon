package com.wangjin.salon.service.model.entity;

import com.baomidou.mybatisplus.annotation.FieldStrategy;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;
import com.wangjin.common.base.BaseTenantEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 服务项目分类（租户级，如剪发/烫发/染发/护理/洗护/造型）。
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("salon_service_category")
public class SalonServiceCategory extends BaseTenantEntity<Long> {

    /** 分类名称 */
    private String name;
    /** 排序 */
    private Integer sort;
    /** 状态（1=启用 0=禁用） */
    private Integer status;
    /** 备注 */
    @TableField(updateStrategy = FieldStrategy.ALWAYS)
    private String remark;
}
