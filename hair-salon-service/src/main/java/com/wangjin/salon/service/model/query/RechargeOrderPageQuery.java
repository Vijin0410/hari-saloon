package com.wangjin.salon.service.model.query;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.wangjin.common.base.BasePageQuery;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;
import java.util.List;

@Data
@EqualsAndHashCode(callSuper = true)
@Schema(description = "充值记录分页查询")
public class RechargeOrderPageQuery extends BasePageQuery {

    @Schema(description = "关键词（充值单号/会员姓名/手机号）")
    private String keywords;
    @Schema(description = "会员ID")
    private Long memberId;
    @Schema(description = "支付方式（字典 pay_method）")
    private Integer payMethod;
    @Schema(description = "赠送来源（1活动 2等级 3无）")
    private Integer giftSource;
    @Schema(description = "租户ID（ROOT 跨租户筛选用，非 ROOT 忽略）")
    private Long tenantId;
    @Schema(description = "门店ID（前端按门店筛选）")
    private Long storeId;
    @Schema(description = "开始时间")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime startTime;
    @Schema(description = "结束时间")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime endTime;

    @Schema(hidden = true, description = "全部门店范围")
    private Boolean allStoreScope;

    @Schema(hidden = true, description = "禁止门店范围")
    private Boolean deniedStoreScope;

    @Schema(hidden = true, description = "允许门店ID列表")
    private List<Long> permittedStoreIds;

    @Schema(hidden = true, description = "权限用户ID")
    private Long permissionUserId;
}
