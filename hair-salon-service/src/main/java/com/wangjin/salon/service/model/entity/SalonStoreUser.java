package com.wangjin.salon.service.model.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.wangjin.common.base.BaseTenantEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * User authorization for store-scoped salon data.
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("salon_store_user")
public class SalonStoreUser extends BaseTenantEntity<Long> {

    /** 门店ID */
    private Long storeId;
    /** 用户ID */
    private Long userId;
}
