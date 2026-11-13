package com.wangjin.salon.service.model.vo;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

/**
 * 财务可见门店选项。
 */
@Data
@Schema(description = "财务可见门店选项")
public class FinanceStoreOptionVO {

    @Schema(description = "门店ID")
    private Long value;

    @Schema(description = "门店名称")
    private String label;
}
