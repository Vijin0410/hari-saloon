package com.wangjin.salon.service.model.vo;

import com.fasterxml.jackson.annotation.JsonFormat;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Schema(description = "服务项目分页")
public class ServiceItemPageVO {

    @Schema(description = "项目ID")
    private Long id;
    @Schema(description = "项目名称")
    private String name;
    @Schema(description = "项目分类ID")
    private Long categoryId;
    @Schema(description = "标准价格")
    private BigDecimal standardPrice;
    @Schema(description = "会员价格")
    private BigDecimal memberPrice;
    @Schema(description = "服务时长（分钟）")
    private Integer duration;
    @Schema(description = "是否参与折扣：1是 0否")
    private Integer discountable;
    @Schema(description = "是否计算提成：1是 0否")
    private Integer commissionable;
    @Schema(description = "排序")
    private Integer sort;
    @Schema(description = "状态：1启用 0禁用")
    private Integer status;
    @Schema(description = "创建时间")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime createTime;
}
