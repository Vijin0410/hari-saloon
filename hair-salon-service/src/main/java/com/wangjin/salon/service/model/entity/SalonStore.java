package com.wangjin.salon.service.model.entity;

import com.baomidou.mybatisplus.annotation.FieldStrategy;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;
import com.wangjin.common.base.BaseTenantEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.math.BigDecimal;
import java.time.LocalTime;

/**
 * Store business profile.
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("salon_store")
public class SalonStore extends BaseTenantEntity<Long> {

    /** 门店名称 */
    private String name;
    /** 门店编码 */
    private String code;
    /** 联系电话 */
    @TableField(updateStrategy = FieldStrategy.ALWAYS)
    private String phone;
    /** 详细地址 */
    @TableField(updateStrategy = FieldStrategy.ALWAYS)
    private String address;
    /** 省份 */
    @TableField(updateStrategy = FieldStrategy.ALWAYS)
    private String province;
    /** 城市 */
    @TableField(updateStrategy = FieldStrategy.ALWAYS)
    private String city;
    /** 区县 */
    @TableField(updateStrategy = FieldStrategy.ALWAYS)
    private String district;
    /** 经度 */
    @TableField(updateStrategy = FieldStrategy.ALWAYS)
    private BigDecimal longitude;
    /** 纬度 */
    @TableField(updateStrategy = FieldStrategy.ALWAYS)
    private BigDecimal latitude;
    /** 营业时间（文本描述） */
    @TableField(updateStrategy = FieldStrategy.ALWAYS)
    private String businessHours;
    /** 营业开始时间 */
    @TableField(updateStrategy = FieldStrategy.ALWAYS)
    private LocalTime openTime;
    /** 营业结束时间 */
    @TableField(updateStrategy = FieldStrategy.ALWAYS)
    private LocalTime closeTime;
    /** 休息日 */
    @TableField(updateStrategy = FieldStrategy.ALWAYS)
    private String restDays;
    /** 状态：1启用 0禁用 */
    private Integer status;
    /** 排序（升序） */
    private Integer sort;
    /** 备注 */
    @TableField(updateStrategy = FieldStrategy.ALWAYS)
    private String remark;
}
