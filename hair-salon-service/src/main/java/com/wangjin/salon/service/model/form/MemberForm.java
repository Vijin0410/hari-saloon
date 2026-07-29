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

    private Long id;

    @NotBlank(message = "会员姓名不能为空")
    private String name;

    private String phone;
    private Integer gender;

    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate birthday;

    private Integer level;
    private BigDecimal balance;
    private Integer points;
    private String source;
    private Integer status;
    private String remark;

    @NotNull(message = "所属门店/部门不能为空")
    private Long deptId;
}
