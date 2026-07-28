package com.wangjin.salon.config;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.wangjin.salon.system.mapper.SysUserMapper;
import com.wangjin.salon.system.model.entity.SysUser;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * 开发环境确保默认管理员密码为 BCrypt(admin123)。
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class DevDataInitializer implements ApplicationRunner {

    private final SysUserMapper sysUserMapper;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(ApplicationArguments args) {
        SysUser admin = sysUserMapper.selectOne(new LambdaQueryWrapper<SysUser>()
                .eq(SysUser::getUsername, "admin")
                .last("LIMIT 1"));
        if (admin == null) {
            return;
        }
        String pwd = admin.getPassword();
        if (pwd == null || pwd.startsWith("{noop}") || !pwd.startsWith("$2")) {
            admin.setPassword(passwordEncoder.encode("admin123"));
            sysUserMapper.updateById(admin);
            log.info("已将 admin 密码初始化为 BCrypt(admin123)");
        }
    }
}
