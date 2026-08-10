package com.wangjin.salon.service.model.vo;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

@Data
@Schema(description = "服务项目分类下拉")
public class ServiceCategoryOptionVO {

    @Schema(description = "分类ID")
    private Long id;
    @Schema(description = "分类名称")
    private String name;
}
