package com.wangjin.salon.service.model.query;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.wangjin.common.base.BasePageQuery;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;

@Data
@EqualsAndHashCode(callSuper = true)
@Schema(description = "会员积分流水分页查询")
public class MemberPointLogPageQuery extends BasePageQuery {

    @Schema(description = "会员ID")
    private Long memberId;
    @Schema(description = "门店ID")
    private Long storeId;
    @Schema(description = "变动类型")
    private Integer changeType;
    @Schema(description = "开始时间")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime startTime;
    @Schema(description = "结束时间")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime endTime;
}
