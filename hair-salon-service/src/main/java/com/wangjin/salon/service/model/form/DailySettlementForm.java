package com.wangjin.salon.service.model.form;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDate;

/**
 * 门店日结确认表单。
 */
@Data
@Schema(description = "日结确认")
public class DailySettlementForm {

    @Schema(description = "日结门店ID")
    @NotNull(message = "门店不能为空")
    @Positive(message = "门店ID不正确")
    private Long storeId;

    @Schema(description = "营业日期（仅允许已结束的自然日）")
    @NotNull(message = "营业日期不能为空")
    @Past(message = "仅能结算已结束的营业日")
    private LocalDate businessDate;

    @Schema(description = "日结备注")
    @Size(max = 500, message = "备注最多500字")
    private String remark;
}
