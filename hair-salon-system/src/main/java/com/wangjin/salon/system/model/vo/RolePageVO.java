package com.wangjin.salon.system.model.vo;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

@Data
@Schema(description = "角色分页 VO")
public class RolePageVO {

    private Long id;
    private String name;
    private String code;
    private Integer sort;
    private Integer status;
    private Integer dataScope;
}
