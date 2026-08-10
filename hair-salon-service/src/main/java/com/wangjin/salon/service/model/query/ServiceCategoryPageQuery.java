package com.wangjin.salon.service.model.query;

import com.wangjin.common.base.BasePageQuery;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@Schema(description = "服务项目分类分页查询")
public class ServiceCategoryPageQuery extends BasePageQuery {

    @Schema(description = "分类名称（模糊匹配）")
    private String name;
    @Schema(description = "状态：1启用 0禁用")
    private Integer status;
}
