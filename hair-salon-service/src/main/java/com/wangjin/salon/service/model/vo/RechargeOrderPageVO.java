package com.wangjin.salon.service.model.vo;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.wangjin.common.web.annotation.Dict;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Schema(description = "充值记录分页")
public class RechargeOrderPageVO {

    @Schema(description = "充值单ID")
    private Long id;
    @Schema(description = "充值单号")
    private String rechargeNo;
    @Schema(description = "会员ID")
    private Long memberId;
    @Schema(description = "会员姓名")
    private String memberName;
    @Schema(description = "会员手机号")
    private String memberPhone;
    @Schema(description = "本金金额")
    private BigDecimal principalAmount;
    @Schema(description = "赠送金额")
    private BigDecimal giftAmount;
    @Schema(description = "赠送来源（1充值活动 2等级赠送率 3无赠送）")
    private Integer giftSource;
    @Schema(description = "赠送是否冻结至次月：1是 0否")
    private Integer giftFrozen;
    @Schema(description = "命中的充值活动名称")
    private String activityName;
    @Schema(description = "支付方式（字典 pay_method）")
    @Dict(dictCode = "pay_method")
    private Integer payMethod;
    @Schema(description = "充值门店名称")
    private String storeName;
    @Schema(description = "操作人昵称")
    private String operatorName;
    @Schema(description = "备注")
    private String remark;
    @Schema(description = "充值时间")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime createTime;
}
