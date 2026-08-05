package com.wangjin.salon.system.model.query;

import com.wangjin.common.base.BasePageQuery;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@Schema(description = "角色分页查询")
public class RolePageQuery extends BasePageQuery {

    @Schema(description = "关键字（角色名称/编码）")
    private String keywords;
    @Schema(description = "租户ID（ROOT 跨租户筛选用，非 ROOT 忽略）")
    private Long tenantId;
}
