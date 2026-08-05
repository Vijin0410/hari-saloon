package com.wangjin.salon.service.model.query;

import com.wangjin.common.base.BasePageQuery;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.util.List;

@Data
@EqualsAndHashCode(callSuper = true)
@Schema(description = "会员分页查询")
public class MemberPageQuery extends BasePageQuery {

    @Schema(description = "关键词")
    private String keywords;
    @Schema(description = "状态：1启用 0禁用")
    private Integer status;
    @Schema(description = "租户ID（ROOT 跨租户筛选用，非 ROOT 忽略）")
    private Long tenantId;
    @Schema(description = "门店ID（前端按门店筛选）")
    private Long storeId;

    @Schema(hidden = true, description = "全部门店范围")
    private Boolean allStoreScope;

    @Schema(hidden = true, description = "禁止门店范围")
    private Boolean deniedStoreScope;

    @Schema(hidden = true, description = "允许门店ID列表")
    private List<Long> permittedStoreIds;

    @Schema(hidden = true, description = "权限用户ID")
    private Long permissionUserId;
}
