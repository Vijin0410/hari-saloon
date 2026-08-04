package com.wangjin.salon.system.model.vo;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

@Data
@Schema(description = "字典项分页 VO")
public class DictPageVO {

    @Schema(description = "字典项ID")
    private Long id;
    @Schema(description = "字典项名称")
    private String name;
    @Schema(description = "字典项值")
    private String value;
    @Schema(description = "状态（1启用 0禁用）")
    private Integer status;
    @Schema(description = "排序（升序）")
    private Integer sort;
    @Schema(description = "备注")
    private String remark;
}
