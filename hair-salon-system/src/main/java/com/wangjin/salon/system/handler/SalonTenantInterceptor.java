package com.wangjin.salon.system.handler;

import com.wangjin.common.exception.BizException;
import com.wangjin.common.security.context.TenantContext;
import com.wangjin.common.security.context.UserContext;
import com.wangjin.common.security.util.SecurityUtils;
import com.wangjin.salon.system.service.SysTenantService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.AsyncHandlerInterceptor;

/** 本项目的租户切换策略：平台接口使用登录租户，业务接口必须明确操作租户。 */
@Component
@RequiredArgsConstructor
public class SalonTenantInterceptor implements AsyncHandlerInterceptor {
    public static final String TENANT_HEADER = "X-Tenant-Id";
    private static final String SCOPE_ATTRIBUTE = SalonTenantInterceptor.class.getName() + ".scope";
    private final SysTenantService tenantService;

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        if (UserContext.get() == null) {
            return true;
        }
        String path = request.getRequestURI().substring(request.getContextPath().length());
        if (path.startsWith("/api/v1/pay/notify/")) {
            return true;
        }
        Long tenantId = UserContext.getTenantId();
        String requested = request.getHeader(TENANT_HEADER);
        if (!isPlatformPath(path)) {
            if (SecurityUtils.isRoot()) {
                if (requested == null || requested.isBlank()) {
                    // 登录资料中的头像属于登录租户，允许未选择租户时读取。
                    if (!"/api/v1/files/url".equals(path)) {
                        throw new BizException("请先在顶部选择租户");
                    }
                } else {
                    try {
                        if (!requested.matches("[1-9][0-9]*")) {
                            throw new NumberFormatException();
                        }
                        tenantId = Long.valueOf(requested);
                    } catch (NumberFormatException ex) {
                        throw new BizException("租户标识不正确");
                    }
                    tenantService.requireAvailableTenant(tenantId);
                }
            } else if (requested != null && !requested.equals(String.valueOf(tenantId))) {
                throw new BizException("无权切换其他租户");
            }
        }
        if (tenantId == null) {
            throw new BizException("登录租户信息缺失，请重新登录");
        }
        request.setAttribute(SCOPE_ATTRIBUTE, TenantContext.use(tenantId));
        return true;
    }

    private boolean isPlatformPath(String path) {
        return path.startsWith("/auth/")
                || path.equals("/api/v1/tenants") || path.startsWith("/api/v1/tenants/")
                || path.equals("/api/v1/menus") || path.startsWith("/api/v1/menus/")
                || path.equals("/api/v1/users/me") || path.startsWith("/api/v1/users/me/")
                || path.equals("/api/v1/dict/types/options");
    }

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response,
                                Object handler, Exception ex) {
        closeScope(request);
    }

    @Override
    public void afterConcurrentHandlingStarted(HttpServletRequest request, HttpServletResponse response,
                                              Object handler) {
        closeScope(request);
    }

    private void closeScope(HttpServletRequest request) {
        Object scope = request.getAttribute(SCOPE_ATTRIBUTE);
        request.removeAttribute(SCOPE_ATTRIBUTE);
        if (scope instanceof TenantContext.Scope tenantScope) {
            tenantScope.close();
        }
    }
}
