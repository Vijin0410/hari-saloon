package com.wangjin.salon.service.model.query;

import com.wangjin.common.base.BasePageQuery;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@Schema(description = "会员等级分页查询")
public class MemberLevelPageQuery extends BasePageQuery {

    /** 等级名称，模糊匹配 */
    @Schema(description = "等级名称（模糊匹配）")
    private String name;
    @Schema(description = "状态：1启用 0禁用")
    private Integer status;
}
