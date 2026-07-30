package com.wangjin.salon.service.model.vo;

import com.fasterxml.jackson.annotation.JsonFormat;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@Schema(description = "Member detail")
public class MemberDetailVO {

    private Long id;
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
    private Long storeId;
}
