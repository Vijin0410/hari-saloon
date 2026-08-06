package com.wangjin.salon.service.model.form;

import com.fasterxml.jackson.annotation.JsonFormat;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@Schema(description = "会员表单")
public class MemberForm {

    @Schema(description = "会员ID")
    private Long id;

    @Schema(description = "会员姓名")
    @NotBlank(message = "会员姓名不能为空")
    private String name;

    @Schema(description = "手机号")
    private String phone;
    @Schema(description = "性别（字典 gender）")
    private Integer gender;

    @Schema(description = "生日")
    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate birthday;

    @Schema(description = "会员等级ID（关联salon_member_level）")
    private Long levelId;
    @Schema(description = "来源（字典 member_source）")
    private String source;
    @Schema(description = "状态：1启用 0禁用")
    private Integer status;
    @Schema(description = "备注")
    private String remark;

    @Schema(description = "所属门店ID")
    @NotNull(message = "所属门店不能为空")
    private Long storeId;
}
