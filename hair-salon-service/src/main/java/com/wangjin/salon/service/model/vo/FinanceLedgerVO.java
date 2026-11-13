package com.wangjin.salon.service.model.vo;

import com.fasterxml.jackson.annotation.JsonFormat;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Schema(description = "成功业务明细")
public class FinanceLedgerVO {

    @Schema(description = "业务单据ID")
    private Long id;

    @Schema(description = "租户ID")
    private Long tenantId;

    @Schema(description = "发生门店ID")
    private Long storeId;

    @Schema(description = "门店名称")
    private String storeName;

    @Schema(description = "业务类型（ORDER/RECHARGE/REFUND）")
    private String kind;

    @Schema(description = "业务单号")
    private String bizNo;

    @Schema(description = "关联原订单号")
    private String relatedNo;

    @Schema(description = "会员ID")
    private Long memberId;

    @Schema(description = "会员姓名（空为散客）")
    private String memberName;

    @Schema(description = "成功时间")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime eventTime;

    @Schema(description = "业务金额（退款为正数，由类型区分）")
    private BigDecimal amount;

    @Schema(description = "充值赠送金额")
    private BigDecimal giftAmount;

    @Schema(description = "外部资金金额（不含余额与积分）")
    private BigDecimal externalAmount;

    @Schema(description = "积分抵扣或退回折算金额")
    private BigDecimal pointAmount;

    @Schema(description = "原业务操作人ID")
    private Long operatorId;
}
