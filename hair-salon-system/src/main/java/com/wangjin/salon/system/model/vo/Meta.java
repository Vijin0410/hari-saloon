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

    private String title;
    private String icon;
    private Integer rank;
    private String extraIcon;
    private Boolean showLink;
    private Boolean showParent;
    private Boolean hidden;
    private List<String> roles;
    private List<String> auths;
    private String frameSrc;
    private Boolean frameLoading;
    @JsonInclude(JsonInclude.Include.NON_NULL)
    private Boolean keepAlive;
    @JsonInclude(JsonInclude.Include.NON_NULL)
    private Boolean alwaysShow;
}
