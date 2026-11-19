package com.wangjin.salon.system.config;

import com.wangjin.salon.system.handler.SalonTenantInterceptor;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/** 租户策略在业务服务执行之前统一应用。 */
@Configuration
@RequiredArgsConstructor
public class SalonTenantWebConfig implements WebMvcConfigurer {
    private final SalonTenantInterceptor tenantInterceptor;

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(tenantInterceptor)
                .addPathPatterns("/api/v1/**", "/auth/**")
                .order(Ordered.HIGHEST_PRECEDENCE);
    }
}
