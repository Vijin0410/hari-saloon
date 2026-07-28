package com.wangjin.salon.system.model.vo;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

@Data
@Schema(description = "字典项分页 VO")
public class DictPageVO {

    private Long id;
    private String name;
    private String value;
    private Integer status;
    private Integer sort;
    private String remark;
}
