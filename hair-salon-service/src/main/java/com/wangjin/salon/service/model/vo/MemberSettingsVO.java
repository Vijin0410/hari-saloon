package com.wangjin.salon.service.model.vo;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

@Data
@Schema(description = "当前租户会员设置")
public class MemberSettingsVO {
    @Schema(description = "启用会员积分")
    private boolean pointsEnabled;
    @Schema(description = "现存可用积分合计（仅管理权限返回）")
    private Long outstandingPoints;
    @Schema(description = "现存待追回积分合计（仅管理权限返回）")
    private Long outstandingDebt;
    @Schema(description = "原批次已到期时退款积分宽限天数")
    private int refundGraceDays = 30;
}
