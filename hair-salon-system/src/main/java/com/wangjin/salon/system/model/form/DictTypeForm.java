package com.wangjin.salon.system.model.form;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

@Schema(description = "字典类型表单")
@Data
public class DictTypeForm {

    private Long id;
    private String name;
    private String code;
    private Integer status;
    private String remark;
    private String groupCode;
}
