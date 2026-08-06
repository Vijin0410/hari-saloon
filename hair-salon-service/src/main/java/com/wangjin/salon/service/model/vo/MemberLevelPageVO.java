package com.wangjin.salon.service.model.vo;

import com.fasterxml.jackson.annotation.JsonFormat;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Schema(description = "会员等级分页")
public class MemberLevelPageVO {

    @Schema(description = "等级ID")
    private Long id;
    @Schema(description = "等级名称")
    private String name;
    @Schema(description = "等级序号")
    private Integer levelNo;
    @Schema(description = "服务折扣")
    private BigDecimal serviceDiscount;
    @Schema(description = "商品折扣")
    private BigDecimal goodsDiscount;
    @Schema(description = "积分倍率")
    private BigDecimal pointRate;
    @Schema(description = "充值赠送率")
    private BigDecimal rechargeGiftRate;
    @Schema(description = "升级门槛")
    private BigDecimal upgradeThreshold;
    @Schema(description = "专属权益（JSON）")
    private String rights;
    @Schema(description = "排序")
    private Integer sort;
    @Schema(description = "状态：1启用 0禁用")
    private Integer status;
    @Schema(description = "创建时间")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime createTime;
}
