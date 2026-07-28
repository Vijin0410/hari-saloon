package com.wangjin.salon.system.model.query;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

@Data
@Schema(description = "部门查询")
public class DeptQuery {

    private String keywords;
    private Integer status;
}
