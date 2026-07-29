package com.wangjin.salon.service.model.vo;

import com.fasterxml.jackson.annotation.JsonFormat;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.time.LocalDateTime;
import java.time.LocalTime;

@Data
@Schema(description = "门店分页")
public class StorePageVO {

    private Long id;
    private String name;
    private String code;
    private Long deptId;
    private String phone;
    private String address;
    private String province;
    private String city;
    private String district;
    private String businessHours;

    @JsonFormat(pattern = "HH:mm")
    private LocalTime openTime;

    @JsonFormat(pattern = "HH:mm")
    private LocalTime closeTime;

    private String restDays;
    private Integer status;
    private Integer sort;
    private String remark;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime createTime;
}
