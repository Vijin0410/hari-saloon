package com.wangjin.salon;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * 理发店管理系统启动类。
 */
@SpringBootApplication(scanBasePackages = "com.wangjin")
@MapperScan("com.wangjin.salon.**.mapper")
public class HairSalonApplication {

    public static void main(String[] args) {
        SpringApplication.run(HairSalonApplication.class, args);
    }
}
