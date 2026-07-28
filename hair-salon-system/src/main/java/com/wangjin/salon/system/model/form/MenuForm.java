package com.wangjin.salon.system.model.form;

import com.wangjin.common.enums.MenuTypeEnum;
import com.wangjin.salon.system.model.vo.Meta;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

@Schema(description = "菜单表单")
@Data
public class MenuForm {

    private Long id;
    private Long parentId;
    private String name;
    private MenuTypeEnum type;
    private String path;
    private String component;
    private String redirect;
    private Meta meta;
    private String perm;
    private String apiPath;
    private String remark;
}
