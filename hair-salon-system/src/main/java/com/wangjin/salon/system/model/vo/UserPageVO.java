package com.wangjin.salon.system.model.vo;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.wangjin.common.web.annotation.Dict;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Schema(description = "用户分页 VO")
public class UserPageVO {

    private Long id;
    private String username;
    private String nickname;
    private String phone;
    @Dict(dictCode = "gender")
    private Integer gender;
    private String avatar;
    @Dict(dictCode = "status")
    private Integer status;
    private String email;
    @Dict(queryDeptName = true)
    private Long deptId;
    private String deptName;
    private String roleNames;
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime createTime;
}
