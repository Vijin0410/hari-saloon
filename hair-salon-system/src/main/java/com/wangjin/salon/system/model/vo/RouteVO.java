package com.wangjin.salon.system.model.vo;

import com.wangjin.common.enums.MenuTypeEnum;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.util.List;

@Data
@Schema(description = "前端路由")
public class RouteVO {

    @Schema(description = "路由名称")
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
    @Schema(description = "子路由集合")
    private List<RouteVO> children;
}
