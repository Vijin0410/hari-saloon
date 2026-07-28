package com.wangjin.salon.auth.model.vo;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 登录出参。
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class LoginVO {

    private String token;
    private Long userId;
    private String username;
    private String nickname;
}
