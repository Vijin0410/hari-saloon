package com.wangjin.salon.service.model.form;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

@Data
@Schema(description = "会员等级表单")
public class MemberLevelForm {

    @Schema(description = "等级ID")
    private Long id;

    @Schema(description = "等级名称（如普通/银卡/金卡/钻石）")
    @NotBlank(message = "等级名称不能为空")
    private String name;

    @Schema(description = "等级序号（0=普通，数值越大等级越高）")
    @NotNull(message = "等级序号不能为空")
    private Integer levelNo;

    @Schema(description = "服务折扣（0.00-1.00，1=不打折，NULL=不参与折扣）")
    private BigDecimal serviceDiscount;

    @Schema(description = "商品折扣（0.00-1.00，1=不打折，NULL=不参与折扣）")
    private BigDecimal goodsDiscount;

    @Schema(description = "积分倍率（1.00=正常，1.50=1.5倍）")
    private BigDecimal pointRate;

    @Schema(description = "充值赠送率（0.10=充100送10）")
    private BigDecimal rechargeGiftRate;

    @Schema(description = "升级门槛（累计消费金额）")
    private BigDecimal upgradeThreshold;

    @Schema(description = "专属权益（JSON）")
    private String rights;

    @Schema(description = "排序")
    private Integer sort;

    @Schema(description = "状态：1启用 0禁用")
    private Integer status;

    @Schema(description = "备注")
    private String remark;
}
