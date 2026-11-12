package com.wangjin.salon.service.model.vo;

import com.wangjin.common.web.annotation.Dict;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

/**
 * 可用支付渠道下拉（收银台按 active 渠道动态渲染支付方式，二期直连用）。
 */
@Data
@Schema(description = "可用支付渠道下拉")
public class TenantPayConfigOptionVO {

    @Schema(description = "配置ID")
    private Long id;
    @Schema(description = "支付渠道：wxpay/alipay/shouqianba/saibe/fuzhangui/manual")
    @Dict(dictCode = "pay_channel")
    private String channel;
    @Schema(description = "结算模式：self_merchant/aggregate_pull/manual")
    @Dict(dictCode = "pay_settle_type")
    private String settleType;
}
