package com.wangjin.salon.system.model.form;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

@Schema(description = "字典项表单")
@Data
public class DictForm {

    private Long id;
    private String typeCode;
    private String name;
    private String value;
    private Integer status;
    private Integer sort;
    private String remark;
}
