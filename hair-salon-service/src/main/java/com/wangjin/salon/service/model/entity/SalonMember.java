package com.wangjin.salon.service.model.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.wangjin.common.base.BaseTenantEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * 会员（租户 + 部门数据权限）。
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("salon_member")
public class SalonMember extends BaseTenantEntity<Long> {

    private String name;
    private String phone;
    private Integer gender;
    private LocalDate birthday;
    private Integer level;
    private BigDecimal balance;
    private Integer points;
    private String source;
    private Integer status;
    private String remark;
    private Long deptId;
}
