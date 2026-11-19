package com.wangjin.salon.service.model.vo;

import com.fasterxml.jackson.annotation.JsonFormat;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Schema(description = "订单人员更正记录")
public class OrderStaffChangeVO {
    @Schema(description = "更正记录ID")
    private Long id;
    @Schema(description = "订单明细ID")
    private Long orderItemId;
    @Schema(description = "明细名称快照")
    private String itemName;
    @Schema(description = "原主服务人员ID")
    private Long beforeStaffId;
    @Schema(description = "新主服务人员ID")
    private Long afterStaffId;
    @Schema(description = "原助理ID")
    private Long beforeAssistantId;
    @Schema(description = "新助理ID")
    private Long afterAssistantId;
    @Schema(description = "原主服务人员姓名快照")
    private String beforeStaffName;
    @Schema(description = "新主服务人员姓名快照")
    private String afterStaffName;
    @Schema(description = "原助理姓名快照")
    private String beforeAssistantName;
    @Schema(description = "新助理姓名快照")
    private String afterAssistantName;
    @Schema(description = "更正原因")
    private String reason;
    @Schema(description = "操作人姓名快照")
    private String operatorName;
    @Schema(description = "操作人ID")
    private Long createBy;
    @Schema(description = "更正时间")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime createTime;
}
