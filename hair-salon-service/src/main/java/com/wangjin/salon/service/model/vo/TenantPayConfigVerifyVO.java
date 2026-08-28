package com.wangjin.salon.service.model.vo;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

/**
 * 支付配置验参自检结果。
 */
@Data
@Schema(description = "支付配置验参自检结果")
public class TenantPayConfigVerifyVO {

    @Schema(description = "配置ID")
    private Long id;
    @Schema(description = "是否通过（网络异常等未确认场景为 false 且状态保持 pending）")
    private Boolean pass;
    @Schema(description = "验证后的配置状态：pending/active/invalid")
    private String status;
    @Schema(description = "结果说明（面向用户）")
    private String message;
}
