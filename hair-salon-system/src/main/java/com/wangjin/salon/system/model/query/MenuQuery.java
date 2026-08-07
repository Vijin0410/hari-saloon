package com.wangjin.salon.system.model.query;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

@Data
@Schema(description = "菜单查询")
public class MenuQuery {

    /** 菜单显示标题（meta.title），模糊匹配；name 存的是英文路由标识，页面按标题检索 */
    @Schema(description = "菜单显示标题（模糊匹配）")
    private String title;

    /** 路由路径，模糊匹配 */
    @Schema(description = "路由路径（模糊匹配）")
    private String path;

    /** 权限标识，模糊匹配 */
    @Schema(description = "权限标识（模糊匹配）")
    private String perm;
}
