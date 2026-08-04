package com.wangjin.salon.system.model.form;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

@Schema(description = "字典类型表单")
@Data
public class DictTypeForm {

    @Schema(description = "字典类型ID")
    private Long id;
    @Schema(description = "字典类型名称")
    private String name;
    @Schema(description = "字典类型编码")
    private String code;
    @Schema(description = "状态（1启用 0禁用）")
    private Integer status;
    @Schema(description = "备注")
    private String remark;
    @Schema(description = "分组编码")
    private String groupCode;
}
