package com.wangjin.salon.system.model.query;

import com.wangjin.common.base.BasePageQuery;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@Schema(description = "字典类型分页查询")
public class DictTypePageQuery extends BasePageQuery {

    @Schema(description = "关键字（字典类型名称/编码）")
    private String keywords;
}
