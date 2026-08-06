package com.wangjin.salon.service.model.query;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.wangjin.common.base.BasePageQuery;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;

@Data
@EqualsAndHashCode(callSuper = true)
@Schema(description = "会员余额流水分页查询")
public class MemberBalanceLogPageQuery extends BasePageQuery {

    @Schema(description = "会员ID")
    private Long memberId;
    @Schema(description = "门店ID")
    private Long storeId;
    @Schema(description = "余额桶（1本金 2赠送 3冻结）")
    private Integer balanceType;
    @Schema(description = "业务类型")
    private Integer changeType;
    @Schema(description = "开始时间")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime startTime;
    @Schema(description = "结束时间")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime endTime;
}
