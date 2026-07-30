package com.wangjin.salon.service.model.entity;

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

    private String name;
    private String code;
    private String phone;
    private String address;
    private String province;
    private String city;
    private String district;
    private BigDecimal longitude;
    private BigDecimal latitude;
    private String businessHours;
    private LocalTime openTime;
    private LocalTime closeTime;
    private String restDays;
    private Integer status;
    private Integer sort;
    private String remark;
}
