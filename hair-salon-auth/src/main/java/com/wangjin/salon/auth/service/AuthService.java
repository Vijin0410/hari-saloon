package com.wangjin.salon.auth.service;

import com.wangjin.salon.auth.model.form.LoginForm;
import com.wangjin.salon.auth.model.vo.LoginVO;
import com.wangjin.salon.system.model.vo.UserInfoVO;

/**
 * 认证服务。
 */
public interface AuthService {

    LoginVO login(LoginForm form);

    UserInfoVO currentUser();
}
