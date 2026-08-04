package com.wangjin.salon.service.model.vo;

import com.fasterxml.jackson.annotation.JsonFormat;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.time.LocalDateTime;
import java.time.LocalTime;

@Data
@Schema(description = "门店分页")
public class StorePageVO {

    @Schema(description = "门店ID")
    private Long id;
    @Schema(description = "门店名称")
    private String name;
    @Schema(description = "门店编码")
    private String code;
    @Schema(description = "联系电话")
    private String phone;
    @Schema(description = "详细地址")
    private String address;
    @Schema(description = "营业时间（文本描述）")
    private String businessHours;

    @Schema(description = "营业开始时间")
    @JsonFormat(pattern = "HH:mm")
    private LocalTime openTime;

    @Schema(description = "营业结束时间")
    @JsonFormat(pattern = "HH:mm")
    private LocalTime closeTime;

    @Schema(description = "休息日")
    private String restDays;
    @Schema(description = "状态：1启用 0禁用")
    private Integer status;
    @Schema(description = "排序（升序）")
    private Integer sort;
    @Schema(description = "备注")
    private String remark;

    @Schema(description = "创建时间")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime createTime;
}
