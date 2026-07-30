package com.wangjin.salon.system.model.vo;

import com.wangjin.common.enums.MenuTypeEnum;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.util.List;

@Data
@Schema(description = "前端路由")
public class RouteVO {

    private String name;
    private MenuTypeEnum type;
    private String path;
    private String component;
    private String redirect;
    private Meta meta;
    private String perm;
    private List<RouteVO> children;
}
