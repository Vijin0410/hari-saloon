package com.wangjin.salon.system.model.form;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

@Schema(description = "字典项表单")
@Data
public class DictForm {

    @Schema(description = "字典项ID")
    private Long id;
    @Schema(description = "所属字典类型编码")
    private String typeCode;
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
