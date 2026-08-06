package com.wangjin.salon.service.model.query;

import com.wangjin.common.base.BasePageQuery;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@Schema(description = "会员标签分页查询")
public class MemberTagPageQuery extends BasePageQuery {

    @Schema(description = "关键词")
    private String keywords;
    @Schema(description = "状态：1启用 0禁用")
    private Integer status;
}
