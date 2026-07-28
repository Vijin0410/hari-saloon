package com.wangjin.salon.system.model.vo;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.util.List;

@Data
@Schema(description = "部门树 VO")
public class DeptVO {

    private Long id;
    private String name;
    private Long parentId;
    private String treePath;
    private Integer sort;
    private Integer status;
    private Long leaderId;
    private List<DeptVO> children;
}
