package com.wangjin.salon.service.model.vo;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

@Data
@Schema(description = "会员结构化备注")
public class MemberProfileVO {

    @Schema(description = "发质情况")
    private String hairQuality;
    @Schema(description = "偏好发型")
    private String preferredStyle;
    @Schema(description = "常用发型师ID")
    private Long preferredStylistId;
    @Schema(description = "常用发型师姓名")
    private String preferredStylistName;
    @Schema(description = "过敏信息")
    private String allergy;
    @Schema(description = "服务禁忌")
    private String taboo;
    @Schema(description = "扩展备注")
    private String remark;
}
