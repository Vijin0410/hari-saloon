package com.wangjin.salon.auth.service.impl;

import cn.hutool.core.util.StrUtil;
import com.wangjin.common.constant.SystemConstants;
import com.wangjin.common.exception.BizException;
import com.wangjin.common.result.ResultCode;
import com.wangjin.common.security.config.JwtProperties;
import com.wangjin.common.security.context.LoginUser;
import com.wangjin.common.security.util.JwtUtils;
import com.wangjin.salon.auth.model.form.LoginForm;
import com.wangjin.salon.auth.model.vo.LoginVO;
import com.wangjin.salon.auth.service.AuthService;
import com.wangjin.salon.system.model.dto.UserAuthInfo;
import com.wangjin.salon.system.model.vo.UserInfoVO;
import com.wangjin.salon.system.service.SysUserService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Collections;

/**
 * 认证服务：登录写入 tenantId / roles / dataScope，供租户行与数据权限拦截使用。
 */
@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final SysUserService sysUserService;
    private final PasswordEncoder passwordEncoder;
    private final JwtProperties jwtProperties;

    @Override
    public LoginVO login(LoginForm form) {
        UserAuthInfo auth = sysUserService.getUserAuthInfo(form.getUsername());
        if (auth == null) {
            throw new BizException(ResultCode.USERNAME_OR_PASSWORD_ERROR);
        }
        if (auth.getStatus() != null && auth.getStatus() == 0) {
            throw new BizException(ResultCode.USER_ACCOUNT_LOCKED);
        }
        if (!matchesPassword(form.getPassword(), auth.getPassword())) {
            throw new BizException(ResultCode.USERNAME_OR_PASSWORD_ERROR);
        }

        Long tenantId = auth.getTenantId() == null ? SystemConstants.DEFAULT_TENANT_ID : auth.getTenantId();

        LoginUser loginUser = LoginUser.builder()
                .userId(auth.getUserId())
                .username(auth.getUsername())
                .nickname(auth.getNickname())
                .tenantId(tenantId)
                .deptId(auth.getDeptId())
                .dataScope(auth.getMaxDataScope())
                .dataScopeDeptIds(auth.getDataScopeDeptIds() == null ? Collections.emptySet() : auth.getDataScopeDeptIds())
                .roles(auth.getRoles() == null ? Collections.emptySet() : auth.getRoles())
                .permissions(auth.getPerms() == null ? Collections.emptySet() : auth.getPerms())
                .build();

        String token = JwtUtils.createToken(loginUser, jwtProperties.getSecret(), jwtProperties.getExpireSeconds());
        return new LoginVO(token, auth.getUserId(), auth.getUsername(), auth.getNickname());
    }

    @Override
    public UserInfoVO currentUser() {
        return sysUserService.getUserLoginInfo();
    }

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
