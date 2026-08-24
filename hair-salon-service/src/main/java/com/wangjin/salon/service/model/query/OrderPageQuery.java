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
@Schema(description = "订单分页查询")
public class OrderPageQuery extends BasePageQuery {

    @Schema(description = "关键词（订单号/会员姓名/手机号）")
    private String keywords;
    @Schema(description = "会员ID")
    private Long memberId;
    @Schema(description = "订单状态（0挂单 1已支付 2部分退款 3已退款 4已取消）")
    private Integer status;
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
