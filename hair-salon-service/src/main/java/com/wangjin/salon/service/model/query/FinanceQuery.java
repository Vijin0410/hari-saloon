package com.wangjin.salon.service.model.query;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import org.springframework.format.annotation.DateTimeFormat;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Schema(description = "经营财务查询（最多366天）")
public class FinanceQuery {

    @Schema(description = "租户ID（仅系统管理员可跨租户筛选）")
    private Long tenantId;

    @Schema(description = "门店ID")
    private Long storeId;

    @Schema(description = "开始日期（含）")
    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
    private LocalDate startDate;

    @Schema(description = "结束日期（含）")
    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
    private LocalDate endDate;

    @Schema(description = "明细类型（ORDER/RECHARGE/REFUND）")
    private String kind;

    @Schema(description = "趋势粒度（DAY按日/MONTH按月，默认按日）")
    private String trendPeriod;

    @Schema(description = "页码")
    private Integer pageNum;

    @Schema(description = "每页数量")
    private Integer pageSize;

    @Schema(description = "服务端计算的可见门店（客户端值会被覆盖）", hidden = true)
    private List<Long> allowedStoreIds;

    @Schema(description = "服务端计算的开始时间", hidden = true)
    private LocalDateTime startTime;

    @Schema(description = "服务端计算的结束时间（不含）", hidden = true)
    private LocalDateTime endTime;
}
