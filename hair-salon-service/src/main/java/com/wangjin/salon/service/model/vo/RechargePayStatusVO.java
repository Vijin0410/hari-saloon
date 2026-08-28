package com.wangjin.salon.service.model.vo;

import com.fasterxml.jackson.annotation.JsonFormat;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 充值单支付状态（前端轮询）。
 */
@Data
@Schema(description = "充值单支付状态")
public class RechargePayStatusVO {

    @Schema(description = "充值单ID")
    private Long rechargeId;
    @Schema(description = "支付状态（0=待支付 1=已支付）")
    private Integer status;
    @Schema(description = "支付确认时间")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime payTime;
}
