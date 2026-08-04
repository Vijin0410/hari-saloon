package com.wangjin.salon.system.model.vo;

import com.fasterxml.jackson.annotation.JsonFormat;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 文件分页 VO。
 */
@Data
@Schema(description = "文件分页 VO")
public class SysFilePageVO {

    @Schema(description = "文件ID")
    private Long id;
    @Schema(description = "桶内对象键")
    private String objectKey;
    @Schema(description = "原始文件名")
    private String originalName;
    @Schema(description = "扩展名")
    private String extension;
    @Schema(description = "文件大小（字节）")
    private Long size;
    @Schema(description = "业务类型")
    private String biz;
    @Schema(description = "关联业务ID")
    private Long bizId;
    @Schema(description = "是否公开（0=私有 1=公开）")
    private Integer isPublic;
    @Schema(description = "上传人部门ID")
    private Long deptId;
    @Schema(description = "上传人ID")
    private Long createBy;

    @Schema(description = "创建时间")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime createTime;
}
