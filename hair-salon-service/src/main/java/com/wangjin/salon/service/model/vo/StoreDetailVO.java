package com.wangjin.salon.service.model.vo;

import com.fasterxml.jackson.annotation.JsonFormat;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalTime;

@Data
@Schema(description = "门店详情")
public class StoreDetailVO {

    private Long id;
    private String name;
    private String code;
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
}
