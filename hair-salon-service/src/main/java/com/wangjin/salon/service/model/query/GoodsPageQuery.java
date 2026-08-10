package com.wangjin.salon.service.model.query;

import com.wangjin.common.base.BasePageQuery;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@Schema(description = "商品分页查询")
public class GoodsPageQuery extends BasePageQuery {

    @Schema(description = "商品名称（模糊匹配）")
    private String name;
    @Schema(description = "商品分类ID")
    private Long categoryId;
    @Schema(description = "状态：1启用 0禁用")
    private Integer status;
}
