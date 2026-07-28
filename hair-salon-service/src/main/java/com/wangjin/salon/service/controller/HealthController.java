package com.wangjin.salon.service.controller;

import com.wangjin.common.result.Result;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * 健康检查（需登录，用于验证鉴权链路）。
 */
@RestController
@RequestMapping("/api")
public class HealthController {

    @GetMapping("/ping")
    public Result<Map<String, String>> ping() {
        return Result.success(Map.of("app", "hair-salon", "status", "ok"));
    }
}
