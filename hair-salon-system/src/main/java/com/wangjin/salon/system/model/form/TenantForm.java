package com.wangjin.salon.system.model.form;

import com.fasterxml.jackson.annotation.JsonFormat;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Schema(description = "租户表单")
public class TenantForm {

    private Long id;

    @NotBlank(message = "租户名称不能为空")
    private String name;

    @NotBlank(message = "租户编码不能为空")
    private String code;

    private Integer status;
    private String contact;
    private String phone;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime expireTime;

    private String remark;
}
