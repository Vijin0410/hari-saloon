package com.wangjin.salon;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.core.env.Environment;
import org.springframework.scheduling.annotation.EnableScheduling;

import java.net.InetAddress;

/**
 * 理发店管理系统启动类。
 */
@SpringBootApplication(scanBasePackages = "com.wangjin")
@MapperScan("com.wangjin.salon.**.mapper")
@EnableScheduling
public class HairSalonApplication {

    public static void main(String[] args) {
        ConfigurableApplicationContext context = SpringApplication.run(HairSalonApplication.class, args);
        Environment env = context.getEnvironment();
        String port = env.getProperty("server.port", "8080");
        String desc = env.getProperty("spring.application.description", "Application");
        String contextPath = env.getProperty("server.servlet.context-path", "");
        String appName = env.getProperty("spring.application.name", "Application");
        String asciiArt ="\n" +
                "██╗  ██╗ █████╗ ██╗██████╗      ███████╗ █████╗ ██╗      ██████╗ ███╗   ██╗\n" +
                "██║  ██║██╔══██╗██║██╔══██╗     ██╔════╝██╔══██╗██║     ██╔═══██╗████╗  ██║\n" +
                "███████║███████║██║██████╔╝     ███████╗███████║██║     ██║   ██║██╔██╗ ██║\n" +
                "██╔══██║██╔══██║██║██╔══██╗     ╚════██║██╔══██║██║     ██║   ██║██║╚██╗██║\n" +
                "██║  ██║██║  ██║██║██║  ██║     ███████║██║  ██║███████╗╚██████╔╝██║ ╚████║\n" +
                "╚═╝  ╚═╝╚═╝  ╚═╝╚═╝╚═╝  ╚═╝     ╚══════╝╚═╝  ╚═╝╚══════╝ ╚═════╝ ╚═╝  ╚═══╝\n" +
                "\n" +
                "                ✂  H A I R   S A L O N  ✂\n" +
                "\n" +
                "          \uD83D\uDC87  Beauty  •  Style  •  Fashion\n" +
                "\n" +
                "--------------------------------------------------------\n" +
                "        Welcome to Hair Salon System\n" +
                "        Your Style, Your Confidence\n" +
                "--------------------------------------------------------\n";
        System.out.println("\n" +
                "┌─────────────────────────────────────────────────────────────────────────────────────────────────────┐\n" +
                "│                                                                                             \n" +
                "│  🚀 Application '" + appName + "'                                                           \n" +
                "│  📝 Description: " + desc + "                                                               \n" +
                "│                                                                                             \n" +
                "│  📍 Local URL:     http://localhost:" + port + contextPath + "                              \n" +
                "│  🌐 External URL:   http://" + getLocalHostAddress() + ":" + port + contextPath + "         \n" +
                "│                                                                                             \n" +
                "│  👍 Ready to serve! 🚀 Running successfully!                                                \n" +
                "│                                                                                              \n" +
                "└─────────────────────────────────────────────────────────────────────────────────────────────────────┘" +
                asciiArt);
    }
    private static String getLocalHostAddress() {
        try {
            return InetAddress.getLocalHost().getHostAddress();
        } catch (Exception e) {
            return "127.0.0.1";
        }
    }
}
