package com.wangjin.salon.service.model.form;

import com.fasterxml.jackson.annotation.JsonFormat;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;

@Data
@Schema(description = "会员积分调整表单")
public class MemberPointAdjustForm {

    @Schema(description = "变动积分（正=增加 负=减少）")
    @NotNull(message = "变动积分不能为空")
    private Integer changePoints;

    @Schema(description = "过期时间（按天，增加时可选；选当天则在当天24:00后过期）")
    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate expireTime;

    @Schema(description = "备注")
    @NotBlank(message = "备注不能为空")
    private String remark;
}
