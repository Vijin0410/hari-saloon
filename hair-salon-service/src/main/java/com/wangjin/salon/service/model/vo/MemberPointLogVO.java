package com.wangjin.salon.service.model.vo;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.wangjin.common.web.annotation.Dict;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Schema(description = "会员积分流水")
public class MemberPointLogVO {

    @Schema(description = "流水ID")
    private Long id;
    @Schema(description = "会员ID")
    private Long memberId;
    @Schema(description = "变动类型（字典 point_change_type）")
    @Dict(dictCode = "point_change_type")
    private Integer changeType;
    @Schema(description = "变动前积分")
    private Integer beforePoints;
    @Schema(description = "变动积分（正=增加 负=减少）")
    private Integer changePoints;
    @Schema(description = "变动后积分")
    private Integer afterPoints;
    @Schema(description = "过期时间（按天）")
    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate expireTime;
    @Schema(description = "关联业务单号")
    private String bizNo;
    @Schema(description = "操作人姓名")
    private String operatorName;
    @Schema(description = "备注")
    private String remark;
    @Schema(description = "创建时间")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime createTime;
}
