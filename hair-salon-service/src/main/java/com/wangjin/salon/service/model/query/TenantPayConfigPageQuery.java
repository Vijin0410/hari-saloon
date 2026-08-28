package com.wangjin.salon.service.model.query;

import com.wangjin.common.base.BasePageQuery;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@Schema(description = "租户支付配置分页查询")
public class TenantPayConfigPageQuery extends BasePageQuery {

    @Schema(description = "支付渠道（字典 pay_channel）")
    private String channel;

    @Schema(description = "配置状态：pending/active/invalid")
    private String status;
}
