package com.wangjin.salon.system.model.query;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

@Data
@Schema(description = "部门查询")
public class DeptQuery {

    /** 部门名称，模糊匹配 */
    @Schema(description = "部门名称（模糊匹配）")
    private String name;
    @Schema(description = "状态（1启用 0禁用）")
    private Integer status;
    @Schema(description = "租户ID（ROOT 跨租户筛选用，非 ROOT 忽略）")
    private Long tenantId;
}
