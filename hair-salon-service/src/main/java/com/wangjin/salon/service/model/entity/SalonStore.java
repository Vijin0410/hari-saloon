package com.wangjin.salon.service.model.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.wangjin.common.base.BaseTenantEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.math.BigDecimal;
import java.time.LocalTime;

/**
 * 门店营业档案（与 sys_dept 1:1，数据权限走 dept_id）。
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("salon_store")
public class SalonStore extends BaseTenantEntity<Long> {

    private String name;
    private String code;
    /** 绑定的组织部门（店） */
    private Long deptId;
    private String phone;
    private String address;
    private String province;
    private String city;
    private String district;
    private BigDecimal longitude;
    private BigDecimal latitude;
    /** 展示用营业时间文案，如 09:00-21:00 */
    private String businessHours;
    private LocalTime openTime;
    private LocalTime closeTime;
    /** 休息日，如 0,6（周日/周六） */
    private String restDays;
    private Integer status;
    private Integer sort;
    private String remark;
}
