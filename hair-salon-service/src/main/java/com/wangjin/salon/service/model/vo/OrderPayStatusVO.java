package com.wangjin.salon.service.model.vo;

import com.fasterxml.jackson.annotation.JsonFormat;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 订单支付状态（收银台扫码轮询）。
 */
@Data
@Schema(description = "订单支付状态")
public class OrderPayStatusVO {

    @Schema(description = "订单ID")
    private Long orderId;
    @Schema(description = "订单状态（0=挂单待支付 1=已支付 4=已取消）")
    private Integer status;
    @Schema(description = "支付完成时间")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime paidTime;
}
