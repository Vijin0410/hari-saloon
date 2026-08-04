package com.wangjin.salon.system.model.query;

import com.wangjin.common.base.BasePageQuery;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.EqualsAndHashCode;

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
}
