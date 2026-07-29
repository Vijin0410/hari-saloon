package com.wangjin.salon.service.model.form;

import com.fasterxml.jackson.annotation.JsonFormat;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalTime;

@Data
@Schema(description = "门店表单")
public class StoreForm {

    private Long id;

    @NotBlank(message = "门店名称不能为空")
    private String name;

    private String code;

    /**
     * 绑定部门：空则自动在总部下新建同名部门。
     */
    private Long deptId;

    private String phone;
    private String address;
    private String province;
    private String city;
    private String district;
    private BigDecimal longitude;
    private BigDecimal latitude;
    private String businessHours;

    @JsonFormat(pattern = "HH:mm")
    private LocalTime openTime;

    @JsonFormat(pattern = "HH:mm")
    private LocalTime closeTime;

    private String restDays;
    private Integer status;
    private Integer sort;
    private String remark;

    /** 新建时父部门；空则挂到当前用户部门或根下 */
    private Long parentDeptId;
}
