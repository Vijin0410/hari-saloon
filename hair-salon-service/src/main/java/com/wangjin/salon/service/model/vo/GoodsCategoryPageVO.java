package com.wangjin.salon.service.model.vo;

import com.fasterxml.jackson.annotation.JsonFormat;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Schema(description = "商品分类分页")
public class GoodsCategoryPageVO {

    @Schema(description = "分类ID")
    private Long id;
    @Schema(description = "分类名称")
    private String name;
    @Schema(description = "排序")
    private Integer sort;
    @Schema(description = "状态：1启用 0禁用")
    private Integer status;
    @Schema(description = "备注")
    private String remark;
    @Schema(description = "创建时间")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime createTime;
}
