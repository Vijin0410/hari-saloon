package com.wangjin.salon.service.controller;

import com.wangjin.common.result.Result;
import com.wangjin.salon.service.model.form.MemberSettingsForm;
import com.wangjin.salon.service.model.vo.MemberSettingsVO;
import com.wangjin.salon.service.service.MemberSettingsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@Tag(name = "会员设置")
@RestController
@RequestMapping("/api/v1/member-settings")
@RequiredArgsConstructor
public class MemberSettingsController {
    private final MemberSettingsService service;

    @GetMapping("/capabilities")
    @Operation(summary = "当前租户积分能力")
    @PreAuthorize("isAuthenticated()")
    public Result<MemberSettingsVO> capabilities() {
        return Result.success(service.getSettings(false));
    }

    @GetMapping("/detail")
    @Operation(summary = "会员设置及存量积分汇总")
    @PreAuthorize("hasAuthority('biz:memberSettings:list')")
    public Result<MemberSettingsVO> detail() {
        return Result.success(service.getSettings(true));
    }

    @PutMapping("/update")
    @Operation(summary = "更新会员积分开关")
    @PreAuthorize("hasAuthority('biz:memberSettings:edit')")
    public Result<Void> update(@Valid @RequestBody MemberSettingsForm form) {
        service.update(form);
        return Result.success(null);
    }
}
