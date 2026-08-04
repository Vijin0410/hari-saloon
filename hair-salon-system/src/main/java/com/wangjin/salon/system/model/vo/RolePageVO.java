package com.wangjin.salon.system.model.vo;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

@Data
@Schema(description = "角色分页 VO")
public class RolePageVO {

    @Schema(description = "角色ID")
    private Long id;
    @Schema(description = "角色名称")
    private String name;
    @Schema(description = "角色编码")
    private String code;
    @Schema(description = "排序（升序）")
    private Integer sort;
    @Schema(description = "状态（1启用 0禁用）")
    private Integer status;
    @Schema(description = "数据权限范围")
    private Integer dataScope;
}
