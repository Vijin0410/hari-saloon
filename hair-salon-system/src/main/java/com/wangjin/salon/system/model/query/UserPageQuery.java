package com.wangjin.salon.system.model.query;

import com.wangjin.common.base.BasePageQuery;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@Schema(description = "用户分页查询")
public class UserPageQuery extends BasePageQuery {

    private String keywords;
    private Integer status;
    private Long deptId;
}
