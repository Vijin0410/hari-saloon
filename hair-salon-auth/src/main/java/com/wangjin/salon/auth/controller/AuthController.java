package com.wangjin.salon.auth.controller;

import com.wangjin.common.result.Result;
import com.wangjin.salon.auth.model.form.LoginForm;
import com.wangjin.salon.auth.model.vo.LoginVO;
import com.wangjin.salon.auth.service.AuthService;
import com.wangjin.salon.system.model.vo.UserInfoVO;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 认证接口。
 */
@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    /**
     * 登录。
     */
    @PostMapping("/login")
    public Result<LoginVO> login(@Valid @RequestBody LoginForm form) {
        return Result.success(authService.login(form));
    }

    /**
     * 当前登录用户。
     */
    @GetMapping("/me")
    public Result<UserInfoVO> me() {
        return Result.success(authService.currentUser());
    }
}
