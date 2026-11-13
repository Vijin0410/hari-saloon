package com.wangjin.salon.service.model.vo;

import com.fasterxml.jackson.annotation.JsonFormat;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Schema(description = "日结记录与冻结报表")
public class DailySettlementVO {

    @Schema(description = "日结ID")
    private Long id;

    @Schema(description = "租户ID")
    private Long tenantId;

    @Schema(description = "门店ID")
    private Long storeId;

    @Schema(description = "门店名称")
    private String storeName;

    @Schema(description = "营业日期")
    private LocalDate businessDate;

    @Schema(description = "确认人ID")
    private Long createBy;

    @Schema(description = "确认人姓名")
    private String operatorName;

    @Schema(description = "确认时间")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime createTime;

    @Schema(description = "日结备注")
    private String remark;

    @Schema(description = "冻结报表（详情提供）")
    private FinanceReportVO snapshot;

    @Schema(description = "当前数据与冻结快照是否存在差异（详情提供）")
    private Boolean changed;
}
