package com.wangjin.salon.system.model.vo;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.util.List;

@Data
@Schema(description = "部门树 VO")
public class DeptVO {

    @Schema(description = "部门ID")
    private Long id;
    @Schema(description = "部门名称")
    private String name;
    @Schema(description = "父部门ID")
    private Long parentId;
    @Schema(description = "树路径")
    private String treePath;
    @Schema(description = "排序（升序）")
    private Integer sort;
    @Schema(description = "状态（1启用 0禁用）")
    private Integer status;
    @Schema(description = "负责人ID")
    private Long leaderId;
    @Schema(description = "子部门集合")
    private List<DeptVO> children;
}
