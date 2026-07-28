package com.wangjin.salon.system.model.vo;

import com.wangjin.common.enums.MenuTypeEnum;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.util.List;

@Data
@Schema(description = "菜单树 VO")
public class MenuVO {

    private Long id;
    private Long parentId;
    private String name;
    private MenuTypeEnum type;
    private String path;
    private String component;
    private String redirect;
    private String treePath;
    private Meta meta;
    private String perm;
    private String apiPath;
    private String remark;
    private List<MenuVO> children;
}
