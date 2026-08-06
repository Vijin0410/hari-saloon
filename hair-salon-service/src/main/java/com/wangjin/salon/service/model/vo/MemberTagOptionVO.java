package com.wangjin.salon.service.model.vo;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

@Data
@Schema(description = "会员标签下拉")
public class MemberTagOptionVO {

    @Schema(description = "标签ID")
    private Long id;
    @Schema(description = "标签名称")
    private String name;
    @Schema(description = "标签颜色")
    private String color;
}
