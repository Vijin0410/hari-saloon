package com.wangjin.salon.service.model.vo;

import com.wangjin.common.web.annotation.Dict;
import com.fasterxml.jackson.annotation.JsonFormat;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Schema(description = "充值活动分页")
public class RechargeActivityPageVO {

    @Schema(description = "活动ID")
    private Long id;
    @Schema(description = "活动名称")
    private String name;
    @Schema(description = "充值门槛")
    private BigDecimal thresholdAmount;
    @Schema(description = "赠送金额")
    private BigDecimal giftAmount;
    @Schema(description = "生效时间（空=立即生效）")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime startTime;
    @Schema(description = "失效时间（空=长期有效）")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime endTime;
    @Schema(description = "排序")
    private Integer sort;
    @Schema(description = "状态：1启用 0禁用")
    @Dict(dictCode = "status")
    private Integer status;
    @Schema(description = "备注")
    private String remark;
    @Schema(description = "创建时间")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime createTime;
}
