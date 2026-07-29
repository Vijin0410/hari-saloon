package com.wangjin.salon.system.util;

import com.wangjin.common.security.context.LoginUser;
import com.wangjin.common.security.context.UserContext;

import java.util.function.Supplier;

/**
 * 临时切换当前线程租户上下文，供开通租户、跨租户写库时使用。
 * <p>
 * TenantLine / MetaObjectHandler 均从 {@link UserContext} 取 tenantId。
 */
public final class TenantContextRunner {

    private TenantContextRunner() {
    }

    public static void run(Long tenantId, Runnable action) {
        run(tenantId, () -> {
            action.run();
            return null;
        });
    }

    public static <T> T run(Long tenantId, Supplier<T> action) {
        LoginUser current = UserContext.get();
        if (current == null) {
            LoginUser temp = LoginUser.builder()
                    .userId(0L)
                    .tenantId(tenantId)
                    .build();
            UserContext.set(temp);
            try {
                return action.get();
            } finally {
                UserContext.clear();
            }
        }
        Long oldTenantId = current.getTenantId();
        current.setTenantId(tenantId);
        try {
            return action.get();
        } finally {
            current.setTenantId(oldTenantId);
        }
    }
}
