package com.wangjin.salon.service.model.vo;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.wangjin.common.web.annotation.Dict;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Schema(description = "会员余额流水")
public class MemberBalanceLogVO {

    @Schema(description = "流水ID")
    private Long id;
    @Schema(description = "会员ID")
    private Long memberId;
    @Schema(description = "余额桶（字典 member_balance_type）")
    @Dict(dictCode = "member_balance_type")
    private Integer balanceType;
    @Schema(description = "业务类型（字典 balance_change_type）")
    @Dict(dictCode = "balance_change_type")
    private Integer changeType;
    @Schema(description = "变动前金额")
    private BigDecimal beforeAmount;
    @Schema(description = "变动金额（正=增加 负=减少）")
    private BigDecimal changeAmount;
    @Schema(description = "变动后金额")
    private BigDecimal afterAmount;
    @Schema(description = "关联业务单号")
    private String bizNo;
    @Schema(description = "操作人姓名")
    private String operatorName;
    @Schema(description = "备注")
    private String remark;
    @Schema(description = "创建时间")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime createTime;
}
