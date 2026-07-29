package com.wangjin.salon.system.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * 业务侧可配置项（默认密码、密码有效期等）。
 */
@Data
@Component
@ConfigurationProperties(prefix = "wj.salon")
public class SalonProperties {

    /** 后台建人 / 开通租户管理员初始密码 */
    private String defaultPassword = "admin123";

    /**
     * 密码最长有效天数；距上次自行改密超过该天数须强制重置。
     * &lt;=0 表示不启用过期策略（代码路径保留，配置打开即可）。
     * 首次/重置后：last_password_change_time 为 null 仍强制重置，与本开关无关。
     */
    private int passwordExpireDays = 0;
}
