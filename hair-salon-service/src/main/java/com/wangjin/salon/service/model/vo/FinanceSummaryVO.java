package com.wangjin.salon.service.model.vo;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.math.BigDecimal;

@Data
@Schema(description = "经营汇总（消费与资金分开）")
public class FinanceSummaryVO {

    @Schema(description = "成功消费订单数")
    private Long orderCount;

    @Schema(description = "成功充值笔数")
    private Long rechargeCount;

    @Schema(description = "成功退款笔数")
    private Long refundCount;

    @Schema(description = "消费会员数")
    private Long memberCount;

    @Schema(description = "新增会员数")
    private Long newMemberCount;

    @Schema(description = "消费实收（含会员余额，不含积分）")
    private BigDecimal consumptionAmount;

    @Schema(description = "成功资金退款（含余额退回）")
    private BigDecimal refundAmount;

    @Schema(description = "消费实收减当期成功退款")
    private BigDecimal netConsumption;

    @Schema(description = "充值本金（预收款）")
    private BigDecimal rechargeAmount;

    @Schema(description = "充值赠送（单列）")
    private BigDecimal rechargeGift;

    @Schema(description = "外部收款（消费加充值，不含余额和积分）")
    private BigDecimal externalInflow;

    @Schema(description = "外部退款（不含余额退回）")
    private BigDecimal externalRefund;

    @Schema(description = "外部收款减外部退款")
    private BigDecimal netCashflow;

    @Schema(description = "积分抵扣折算金额")
    private BigDecimal pointAmount;

    @Schema(description = "期初本金账面余额（按会员归属门店流水累计）")
    private BigDecimal principalOpening;

    @Schema(description = "期间本金流水净变动")
    private BigDecimal principalChange;

    @Schema(description = "期末本金账面余额（含人工调整等全部本金变动）")
    private BigDecimal principalClosing;

    @Schema(description = "业务明细指纹（用于检测日结后补入数据）")
    private String fingerprint;
}
