package com.wangjin.salon.service.model.vo;

import com.fasterxml.jackson.annotation.JsonFormat;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;

@Data
@EqualsAndHashCode(callSuper = true)
@Schema(description = "充值记录详情")
public class RechargeOrderDetailVO extends RechargeOrderPageVO {

    @Schema(description = "赠送解冻时间（空=未解冻或无需解冻）")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime unfrozenTime;
    @Schema(description = "支付确认时间")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime payTime;
    @Schema(description = "充值门店ID")
    private Long storeId;
    @Schema(description = "充值活动ID")
    private Long activityId;
}
