package com.wangjin.salon.system.model.vo;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.util.List;

@Data
@Schema(description = "前端路由")
public class RouteVO {

    private String name;
    private String path;
    private String component;
    private String redirect;
    private Meta meta;
    private List<RouteVO> children;
}
