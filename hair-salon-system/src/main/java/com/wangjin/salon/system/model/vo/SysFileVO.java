package com.wangjin.salon.system.model.vo;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

/**
 * 文件出参 VO（上传/详情）。
 */
@Data
@Schema(description = "文件 VO")
public class SysFileVO {

    @Schema(description = "文件ID")
    private Long id;

    @Schema(description = "桶内对象键（业务表存此值软关联）")
    private String objectKey;

    @Schema(description = "原始文件名")
    private String originalName;

    @Schema(description = "MIME 类型")
    private String contentType;

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

    @Schema(description = "访问 URL（公开=直链，私有=预签名）")
    private String url;
}
