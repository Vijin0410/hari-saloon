package com.wangjin.salon.service.model.query;

import com.wangjin.common.base.BasePageQuery;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@Schema(description = "会员分页查询")
public class MemberPageQuery extends BasePageQuery {

    private String keywords;
    private Integer status;
    private Long deptId;
}
