package com.wangjin.salon.service.model.vo;

import com.fasterxml.jackson.annotation.JsonFormat;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@Schema(description = "会员详情")
public class MemberDetailVO {

    @Schema(description = "会员ID")
    private Long id;
    @Schema(description = "会员姓名")
    private String name;
    @Schema(description = "手机号")
    private String phone;
    @Schema(description = "性别（字典 gender）")
    private Integer gender;

    @Schema(description = "生日")
    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate birthday;

    @Schema(description = "会员等级")
    private Integer level;
    @Schema(description = "余额")
    private BigDecimal balance;
    @Schema(description = "积分")
    private Integer points;
    @Schema(description = "来源（字典 member_source）")
    private String source;
    @Schema(description = "状态：1启用 0禁用")
    private Integer status;
    @Schema(description = "备注")
    private String remark;
    @Schema(description = "所属门店ID")
    private Long storeId;
}
