package com.wangjin.salon.system.model.bo;

import lombok.Data;

import java.time.LocalDateTime;

/**
 * 用户分页联查结果。
 */
@Data
public class UserBO {

    private Long id;
    private String username;
    private String nickname;
    private String phone;
    private Integer gender;
    private String avatar;
    private Integer status;
    private String email;
    private Long deptId;
    private String deptName;
    private String roleNames;
    private LocalDateTime createTime;
}
