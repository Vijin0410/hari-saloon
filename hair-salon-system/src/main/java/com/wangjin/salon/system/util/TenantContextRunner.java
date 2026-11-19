package com.wangjin.salon.system.util;

import com.wangjin.common.security.context.TenantContext;

import java.util.function.Supplier;

/**
 * 临时切换当前线程租户上下文，供开通租户、跨租户写库时使用。
 * <p>
 * TenantLine / MetaObjectHandler 使用临时操作租户，登录身份保持不变。
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
        try (TenantContext.Scope scope = TenantContext.use(tenantId)) {
            return action.get();
        }
    }
}
