package com.wangjin.salon.auth.service.impl;

import cn.hutool.core.util.StrUtil;
import com.wangjin.common.constant.SystemConstants;
import com.wangjin.common.exception.BizException;
import com.wangjin.common.result.ResultCode;
import com.wangjin.common.security.config.JwtProperties;
import com.wangjin.common.security.context.LoginUser;
import com.wangjin.common.security.util.JwtUtils;
import com.wangjin.salon.auth.model.form.ChangePasswordForm;
import com.wangjin.salon.auth.model.form.LoginForm;
import com.wangjin.salon.auth.model.vo.LoginVO;
import com.wangjin.salon.auth.service.AuthService;
import com.wangjin.salon.system.model.dto.UserAuthInfo;
import com.wangjin.salon.system.model.entity.SysTenant;
import com.wangjin.salon.system.model.vo.UserInfoVO;
import com.wangjin.salon.system.service.SysTenantService;
import com.wangjin.salon.system.service.SysUserService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.Objects;

/**
 * 认证服务：登录写入 tenantId / roles / dataScope，供租户行与数据权限拦截使用。
 */
@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final SysUserService sysUserService;
    private final SysTenantService sysTenantService;
    private final PasswordEncoder passwordEncoder;
    private final JwtProperties jwtProperties;

    @Override
    public LoginVO login(LoginForm form) {
        Long tenantId = resolveTenantId(form.getTenantCode());
        UserAuthInfo auth = sysUserService.getUserAuthInfo(form.getUsername(), tenantId);
        if (auth == null) {
            throw new BizException(ResultCode.USERNAME_OR_PASSWORD_ERROR);
        }
        if (auth.getStatus() != null && auth.getStatus() == 0) {
            throw new BizException(ResultCode.USER_ACCOUNT_LOCKED);
        }
        if (!matchesPassword(form.getPassword(), auth.getPassword())) {
            throw new BizException(ResultCode.USERNAME_OR_PASSWORD_ERROR);
        }

        Long resolvedTenant = auth.getTenantId() == null ? SystemConstants.DEFAULT_TENANT_ID : auth.getTenantId();

        LoginUser loginUser = LoginUser.builder()
                .userId(auth.getUserId())
                .username(auth.getUsername())
                .nickname(auth.getNickname())
                .tenantId(resolvedTenant)
                .deptId(auth.getDeptId())
                .dataScope(auth.getMaxDataScope())
                .dataScopeDeptIds(auth.getDataScopeDeptIds() == null ? Collections.emptySet() : auth.getDataScopeDeptIds())
                .roles(auth.getRoles() == null ? Collections.emptySet() : auth.getRoles())
                .permissions(auth.getPerms() == null ? Collections.emptySet() : auth.getPerms())
                .build();

        String token = JwtUtils.createToken(loginUser, jwtProperties.getSecret(), jwtProperties.getExpireSeconds());
        boolean needReset = Objects.equals(auth.getPwdResetRequired(), 1);
        return new LoginVO(token, auth.getUserId(), auth.getUsername(), auth.getNickname(), needReset);
    }

    private Long resolveTenantId(String tenantCode) {
        if (StrUtil.isBlank(tenantCode) || "default".equalsIgnoreCase(tenantCode.trim())) {
            return SystemConstants.DEFAULT_TENANT_ID;
        }
        SysTenant tenant = sysTenantService.getByCode(tenantCode.trim());
        if (tenant == null) {
            throw new BizException(ResultCode.PARAM_ERROR, "租户不存在或已禁用");
        }
        return tenant.getId();
    }

    @Override
    public UserInfoVO currentUser() {
        return sysUserService.getUserLoginInfo();
    }

    @Override
    public boolean changePassword(ChangePasswordForm form) {
        return sysUserService.changeOwnPassword(form.getOldPassword(), form.getNewPassword());
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
