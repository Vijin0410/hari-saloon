package com.wangjin.salon.service.model.vo;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.util.List;

@Data
@Schema(description = "经营报表")
public class FinanceReportVO {

    @Schema(description = "趋势粒度（DAY按日/MONTH按月）")
    private String trendPeriod;

    @Schema(description = "经营汇总")
    private FinanceSummaryVO summary;

    @Schema(description = "支付方式汇总")
    private List<FinanceChannelVO> channels;

    @Schema(description = "经营趋势（按日或按月，无交易区间补零）")
    private List<FinanceGroupVO> trend;

    @Schema(description = "门店汇总")
    private List<FinanceGroupVO> stores;

    @Schema(description = "服务排行（退款前，前20项）")
    private List<FinanceGroupVO> services;

    @Schema(description = "商品排行（退款前，前20项）")
    private List<FinanceGroupVO> goods;

    @Schema(description = "会员消费排行（退款前，前20名）")
    private List<FinanceGroupVO> members;
}
