package com.wangjin.salon.service.model.vo;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.math.BigDecimal;

/**
 * 订单扫码预下单结果（微信 Native code_url / 支付宝当面付 qr_code，收银台渲染二维码 + 轮询订单状态）。
 */
@Data
@Schema(description = "订单扫码预下单结果")
public class OrderPrepayVO {

    @Schema(description = "订单ID")
    private Long orderId;
    @Schema(description = "系统内部交易单号（回调反查键）")
    private String outTradeNo;
    @Schema(description = "二维码内容（微信 code_url / 支付宝 qr_code，前端渲染成二维码）")
    private String codeUrl;
    @Schema(description = "扫码支付金额（元，组合支付中扫码行金额）")
    private BigDecimal amount;
}
