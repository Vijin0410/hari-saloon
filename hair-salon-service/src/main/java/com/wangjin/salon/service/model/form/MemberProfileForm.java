package com.wangjin.salon.service.model.form;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

@Data
@Schema(description = "会员结构化备注表单")
public class MemberProfileForm {

    @Schema(description = "发质情况")
    private String hairQuality;
    @Schema(description = "偏好发型")
    private String preferredStyle;
    @Schema(description = "常用发型师ID（关联sys_user）")
    private Long preferredStylistId;
    @Schema(description = "过敏信息")
    private String allergy;
    @Schema(description = "服务禁忌")
    private String taboo;
    @Schema(description = "扩展备注")
    private String remark;
}
