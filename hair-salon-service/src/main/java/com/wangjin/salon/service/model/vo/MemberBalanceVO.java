package com.wangjin.salon.service.model.vo;

import com.fasterxml.jackson.annotation.JsonFormat;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Schema(description = "会员余额明细")
public class MemberBalanceVO {

    @Schema(description = "本金余额")
    private BigDecimal principalBalance;
    @Schema(description = "赠送余额")
    private BigDecimal giftBalance;
    @Schema(description = "冻结金额")
    private BigDecimal frozenBalance;
    @Schema(description = "可用总余额（本金+赠送-冻结）")
    private BigDecimal availableBalance;
    @Schema(description = "最近充值时间")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime lastRechargeTime;
    @Schema(description = "最近消费时间")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime lastConsumeTime;
}
