package com.wangjin.salon.system.model.query;

import com.wangjin.common.base.BasePageQuery;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@Schema(description = "租户分页查询")
public class TenantPageQuery extends BasePageQuery {

    @Schema(description = "关键字（租户名称/编码）")
    private String keywords;
    @Schema(description = "状态（1启用 0禁用）")
    private Integer status;
}
