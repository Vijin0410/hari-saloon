package com.wangjin.salon.service.model.form;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
@Schema(description = "会员设置更新表单")
public class MemberSettingsForm {
    @Schema(description = "启用会员积分")
    @NotNull(message = "积分开关不能为空")
    private Boolean pointsEnabled;
}
