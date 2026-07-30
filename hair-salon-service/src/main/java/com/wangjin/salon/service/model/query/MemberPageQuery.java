package com.wangjin.salon.service.model.query;

import com.wangjin.common.base.BasePageQuery;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.util.List;

@Data
@EqualsAndHashCode(callSuper = true)
@Schema(description = "Member page query")
public class MemberPageQuery extends BasePageQuery {

    private String keywords;
    private Integer status;

    @Schema(hidden = true)
    private Boolean allStoreScope;

    @Schema(hidden = true)
    private Boolean deniedStoreScope;

    @Schema(hidden = true)
    private List<Long> permittedStoreIds;

    @Schema(hidden = true)
    private Long permissionUserId;
}
