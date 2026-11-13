package com.wangjin.salon.service.model.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.wangjin.common.base.BaseTenantEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDate;

/**
 * 门店自然日日结快照。
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("salon_daily_settlement")
public class SalonDailySettlement extends BaseTenantEntity<Long> {

    /**
     * 门店ID
     */
    private Long storeId;

    /**
     * 营业日期
     */
    private LocalDate businessDate;

    /**
     * 冻结报表JSON
     */
    private String snapshot;

    /**
     * 业务明细指纹
     */
    private String fingerprint;

    /**
     * 日结备注
     */
    private String remark;
}
