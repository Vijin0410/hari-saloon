package com.wangjin.salon.system.model.vo;

import com.fasterxml.jackson.annotation.JsonFormat;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Schema(description = "租户分页 VO")
public class TenantPageVO {

    @Schema(description = "租户ID")
    private Long id;
    @Schema(description = "租户名称")
    private String name;
    @Schema(description = "租户编码")
    private String code;
    @Schema(description = "状态（1启用 0禁用）")
    private Integer status;
    @Schema(description = "联系人")
    private String contact;
    @Schema(description = "联系电话")
    private String phone;
    @Schema(description = "到期时间")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime expireTime;
    @Schema(description = "备注")
    private String remark;
    @Schema(description = "创建时间")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime createTime;
}
