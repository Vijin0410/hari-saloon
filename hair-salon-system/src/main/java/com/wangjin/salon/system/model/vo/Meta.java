package com.wangjin.salon.system.model.vo;

import com.fasterxml.jackson.annotation.JsonInclude;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.io.Serial;
import java.io.Serializable;
import java.util.List;

/**
 * 前端路由 meta。
 */
@Data
@Schema(description = "路由 meta")
public class Meta implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    @Schema(description = "菜单标题")
    private String title;
    @Schema(description = "图标")
    private String icon;
    @Schema(description = "排序")
    private Integer rank;
    @Schema(description = "额外图标")
    private String extraIcon;
    @Schema(description = "是否显示")
    private Boolean showLink;
    @Schema(description = "是否显示父级")
    private Boolean showParent;
    @Schema(description = "是否隐藏")
    private Boolean hidden;
    @Schema(description = "角色编码集合")
    private List<String> roles;
    @Schema(description = "权限标识集合")
    private List<String> auths;
    @Schema(description = "iframe 地址")
    private String frameSrc;
    @Schema(description = "iframe 加载状态")
    private Boolean frameLoading;
    @Schema(description = "是否缓存")
    @JsonInclude(JsonInclude.Include.NON_NULL)
    private Boolean keepAlive;
    @Schema(description = "始终显示子菜单")
    @JsonInclude(JsonInclude.Include.NON_NULL)
    private Boolean alwaysShow;
}
