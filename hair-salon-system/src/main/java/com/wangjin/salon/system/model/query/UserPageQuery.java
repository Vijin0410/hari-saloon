package com.wangjin.salon.system.model.query;

import com.wangjin.common.base.BasePageQuery;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.util.List;

@Data
@EqualsAndHashCode(callSuper = true)
@Schema(description = "用户分页查询")
public class UserPageQuery extends BasePageQuery {

    @Schema(description = "关键字（用户名/昵称/手机号）")
    private String keywords;
    @Schema(description = "状态（1启用 0禁用）")
    private Integer status;
    @Schema(description = "部门ID")
    private Long deptId;
    @Schema(description = "租户ID（ROOT 跨租户筛选用，非 ROOT 忽略）")
    private Long tenantId;
    @Schema(description = "门店ID（前端按门店筛选）")
    private Long storeId;
    @Schema(description = "门店范围是否全量（ROOT/租户管理员），由后端注入", hidden = true)
    private Boolean storeScopeAll;
    @Schema(description = "授权门店ID集合（店长/店员数据范围），由后端注入", hidden = true)
    private List<Long> permittedStoreIds;
}
