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

    private Long id;
    private String objectKey;
    private String originalName;
    private String extension;
    private Long size;
    private String biz;
    private Long bizId;
    private Integer isPublic;
    private Long deptId;
    private Long createBy;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime createTime;
}
