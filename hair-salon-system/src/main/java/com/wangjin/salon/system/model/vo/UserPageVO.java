package com.wangjin.salon.system.model.vo;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.wangjin.common.web.annotation.Dict;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Schema(description = "用户分页 VO")
public class UserPageVO {

    @Schema(description = "用户ID")
    private Long id;
    @Schema(description = "用户名")
    private String username;
    @Schema(description = "昵称")
    private String nickname;
    @Schema(description = "手机号")
    private String phone;
    @Schema(description = "性别（字典 gender）")
    @Dict(dictCode = "gender")
    private Integer gender;
    @Schema(description = "头像")
    private String avatar;
    @Schema(description = "状态（字典 status）")
    @Dict(dictCode = "status")
    private Integer status;
    @Schema(description = "邮箱")
    private String email;
    @Schema(description = "部门ID")
    @Dict(queryDeptName = true)
    private Long deptId;
    @Schema(description = "部门名称")
    private String deptName;
    @Schema(description = "角色名称集合")
    private String roleNames;
    @Schema(description = "创建时间")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime createTime;
}
