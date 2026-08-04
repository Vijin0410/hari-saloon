package com.wangjin.salon.system.model.query;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

@Data
@Schema(description = "部门查询")
public class DeptQuery {

    @Schema(description = "关键字（部门名称）")
    private String keywords;
    @Schema(description = "状态（1启用 0禁用）")
    private Integer status;
}
