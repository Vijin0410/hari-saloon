package com.wangjin.salon.system.model.vo;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

@Data
@Schema(description = "字典类型分页 VO")
public class DictTypePageVO {

    private Long id;
    private String name;
    private String code;
    private Integer status;
    private String groupCode;
    private String remark;
}
