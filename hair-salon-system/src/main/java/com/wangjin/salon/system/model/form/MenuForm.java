package com.wangjin.salon.system.model.form;

import com.wangjin.common.enums.MenuTypeEnum;
import com.wangjin.salon.system.model.vo.Meta;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

@Schema(description = "菜单表单")
@Data
public class MenuForm {

    @Schema(description = "菜单ID")
    private Long id;
    @Schema(description = "父菜单ID")
    private Long parentId;
    @Schema(description = "菜单名称")
    private String name;
    @Schema(description = "菜单类型")
    private MenuTypeEnum type;
    @Schema(description = "路由路径")
    private String path;
    @Schema(description = "前端组件")
    private String component;
    @Schema(description = "重定向地址")
    private String redirect;
    @Schema(description = "路由 meta 信息")
    private Meta meta;
    @Schema(description = "权限标识")
    private String perm;
    @Schema(description = "接口路径")
    private String apiPath;
    @Schema(description = "备注")
    private String remark;
}
