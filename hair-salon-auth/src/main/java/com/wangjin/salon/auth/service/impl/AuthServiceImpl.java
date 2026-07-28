package com.wangjin.salon.auth.service.impl;

import cn.hutool.core.util.StrUtil;
import com.wangjin.common.exception.BizException;
import com.wangjin.common.result.ResultCode;
import com.wangjin.common.security.config.JwtProperties;
import com.wangjin.common.security.context.LoginUser;
import com.wangjin.common.security.context.UserContext;
import com.wangjin.common.security.util.JwtUtils;
import com.wangjin.salon.auth.model.form.LoginForm;
import com.wangjin.salon.auth.model.vo.LoginVO;
import com.wangjin.salon.auth.service.AuthService;
import com.wangjin.salon.system.model.entity.SysUser;
import com.wangjin.salon.system.model.vo.UserInfoVO;
import com.wangjin.salon.system.service.SysUserService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

/**
 * 认证服务实现。
 */
@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final SysUserService sysUserService;
    private final PasswordEncoder passwordEncoder;
    private final JwtProperties jwtProperties;

    @Override
    public LoginVO login(LoginForm form) {
        SysUser user = sysUserService.getByUsername(form.getUsername());
        if (user == null) {
            throw new BizException(ResultCode.USERNAME_OR_PASSWORD_ERROR);
        }
        if (user.getStatus() != null && user.getStatus() == 0) {
            throw new BizException(ResultCode.USER_ACCOUNT_LOCKED);
        }
        if (!matchesPassword(form.getPassword(), user.getPassword())) {
            throw new BizException(ResultCode.USERNAME_OR_PASSWORD_ERROR);
        }

        LoginUser loginUser = LoginUser.builder()
                .userId(user.getId())
                .username(user.getUsername())
                .nickname(user.getNickname())
                .deptId(user.getDeptId())
                .build();

        String token = JwtUtils.createToken(loginUser, jwtProperties.getSecret(), jwtProperties.getExpireSeconds());
        return new LoginVO(token, user.getId(), user.getUsername(), user.getNickname());
    }

    @Override
    public UserInfoVO currentUser() {
        Long userId = UserContext.getUserId();
        if (userId == null || userId == 0L) {
            throw new BizException(ResultCode.INVALID_TOKEN);
        }
        SysUser user = sysUserService.getById(userId);
        if (user == null) {
            throw new BizException(ResultCode.USER_NOT_EXIST);
        }
        UserInfoVO vo = new UserInfoVO();
        vo.setId(user.getId());
        vo.setUsername(user.getUsername());
        vo.setNickname(user.getNickname());
        vo.setPhone(user.getPhone());
        vo.setDeptId(user.getDeptId());
        return vo;
    }

    /**
     * 兼容 BCrypt 与开发期 {noop} 明文前缀。
     */
    private boolean matchesPassword(String raw, String encoded) {
        if (StrUtil.isBlank(encoded)) {
            return false;
        }
        if (encoded.startsWith("{noop}")) {
            return raw.equals(encoded.substring(6));
        }
        return passwordEncoder.matches(raw, encoded);
    }
}
