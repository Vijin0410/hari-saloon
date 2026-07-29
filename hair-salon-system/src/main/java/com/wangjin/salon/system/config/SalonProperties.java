package com.wangjin.salon.system.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * 业务侧可配置项（默认密码等）。
 */
@Data
@Component
@ConfigurationProperties(prefix = "wj.salon")
public class SalonProperties {

    /** 后台建人 / 开通租户管理员初始密码 */
    private String defaultPassword = "admin123";
}
