package com.wangjin.salon.system.model.vo;

import lombok.Data;

/**
 * 用户信息出参。
 */
@Data
public class UserInfoVO {

    private Long id;
    private String username;
    private String nickname;
    private String phone;
    private Long deptId;
}
