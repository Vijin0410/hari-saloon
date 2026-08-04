package com.wangjin.salon.service.model.form;

import com.fasterxml.jackson.annotation.JsonFormat;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalTime;
import java.util.List;

@Data
@Schema(description = "门店表单")
public class StoreForm {

    @Schema(description = "门店ID")
    private Long id;

    @Schema(description = "门店名称")
    @NotBlank(message = "门店名称不能为空")
    private String name;

    @Schema(description = "门店编码")
    private String code;
    @Schema(description = "联系电话")
    private String phone;
    @Schema(description = "详细地址")
    private String address;
    @Schema(description = "省份")
    private String province;
    @Schema(description = "城市")
    private String city;
    @Schema(description = "区县")
    private String district;
    @Schema(description = "经度")
    private BigDecimal longitude;
    @Schema(description = "纬度")
    private BigDecimal latitude;
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
    @Schema(description = "关联用户ID列表")
    private List<Long> userIds;
}
