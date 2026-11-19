package com.wangjin.salon.service.model.vo;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

@Data
@Schema(description = "开单人员选项")
public class OrderStaffOptionVO {
    @Schema(description = "用户ID")
    private Long id;
    @Schema(description = "人员姓名")
    private String name;
    @Schema(description = "开单默认身份（NONE=默认服务人员 STAFF=服务人员 ASSISTANT=助理 CONFLICT=角色身份冲突，默认服务人员）")
    private String defaultType;
}
