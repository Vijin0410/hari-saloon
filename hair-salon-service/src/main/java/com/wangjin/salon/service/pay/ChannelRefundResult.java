package com.wangjin.salon.service.pay;

/**
 * 渠道退款结果（P6）：status 归一为通用状态，业务侧不感知渠道枚举。
 *
 * @param status          退款状态（SUCCESS=已成功 PROCESSING=渠道处理中 FAILED=失败）
 * @param channelRefundNo 渠道退款单号（微信 refund_id / 支付宝 trade_no）
 * @param rawPayload      渠道原始响应（JSON 留痕）
 */
public record ChannelRefundResult(String status, String channelRefundNo, String rawPayload) {

    public static final String SUCCESS = "SUCCESS";
    public static final String PROCESSING = "PROCESSING";
    public static final String FAILED = "FAILED";

    public boolean isSuccess() {
        return SUCCESS.equals(status);
    }
}
