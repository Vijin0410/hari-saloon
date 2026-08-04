package com.wangjin.salon.system.model.form;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Schema(description = "角色表单")
@Data
public class RoleForm {

    @Schema(description = "角色ID")
    private Long id;

    @Schema(description = "角色名称")
    @NotBlank(message = "角色名称不能为空")
    private String name;

    @Schema(description = "角色编码")
    @NotBlank(message = "角色编码不能为空")
    private String code;

    @Schema(description = "排序（升序）")
    private Integer sort;
    @Schema(description = "状态（1启用 0禁用）")
    private Integer status;
    @Schema(description = "数据权限范围")
    private Integer dataScope;
    @Schema(description = "自定义数据权限部门ID")
    private String deptIds;

    /** 是否系统预置角色（只读回显；预置角色编码不允许修改） */
    @Schema(description = "是否系统预置角色（只读回显）")
    private Boolean preset;
}
