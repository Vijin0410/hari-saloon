package com.wangjin.salon.system.model.bo;

import com.wangjin.common.enums.MenuTypeEnum;
import com.wangjin.salon.system.model.vo.Meta;
import lombok.Data;

import java.util.List;

/**
 * 路由联查 BO。
 */
@Data
public class RouteBO {

    private Long id;
    private Long parentId;
    private String name;
    private MenuTypeEnum type;
    private String path;
    private String component;
    private String redirect;
    private Meta meta;
    private String perm;
    private List<String> roles;
}
