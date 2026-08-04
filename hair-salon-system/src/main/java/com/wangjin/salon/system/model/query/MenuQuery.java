package com.wangjin.salon.system.model.query;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

@Data
@Schema(description = "菜单查询")
public class MenuQuery {

    @Schema(description = "关键字（菜单名称）")
    private String keywords;

    /** 路由路径，模糊匹配 */
    @Schema(description = "路由路径（模糊匹配）")
    private String path;

    /** 权限标识，模糊匹配 */
    @Schema(description = "权限标识（模糊匹配）")
    private String perm;
}
