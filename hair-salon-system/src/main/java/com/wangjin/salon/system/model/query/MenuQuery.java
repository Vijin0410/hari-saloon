package com.wangjin.salon.system.model.query;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

@Data
@Schema(description = "菜单查询")
public class MenuQuery {

    private String keywords;

    /** 路由路径，模糊匹配 */
    private String path;

    /** 权限标识，模糊匹配 */
    private String perm;
}
