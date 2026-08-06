package com.wangjin.salon.service.model.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.wangjin.common.base.BaseTenantEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 会员-标签关联。
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("salon_member_tag_rel")
public class SalonMemberTagRel extends BaseTenantEntity<Long> {

    /** 会员ID */
    private Long memberId;
    /** 标签ID */
    private Long tagId;
}
