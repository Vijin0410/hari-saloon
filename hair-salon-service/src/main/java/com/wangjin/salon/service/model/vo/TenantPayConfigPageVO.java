package com.wangjin.salon.service.model.vo;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.wangjin.common.web.annotation.Dict;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Schema(description = "租户支付配置分页")
public class TenantPayConfigPageVO {

    @Schema(description = "配置ID")
    private Long id;
    @Schema(description = "支付渠道（字典 pay_channel）")
    @Dict(dictCode = "pay_channel")
    private String channel;
    @Schema(description = "结算模式（字典 pay_settle_type）")
    @Dict(dictCode = "pay_settle_type")
    private String settleType;
    @Schema(description = "是否启用（1=启用 0=停用）")
    @Dict(dictCode = "status")
    private Integer enabled;
    @Schema(description = "AppID")
    private String appId;
    @Schema(description = "商户号")
    private String mchId;
    @Schema(description = "配置状态（字典 pay_config_status）")
    @Dict(dictCode = "pay_config_status")
    private String status;
    @Schema(description = "备注")
    private String remark;
    @Schema(description = "更新时间")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime updateTime;
}
