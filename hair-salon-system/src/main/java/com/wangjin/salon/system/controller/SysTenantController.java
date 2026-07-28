package com.wangjin.salon.system.controller;

import com.wangjin.common.result.PageResult;
import com.wangjin.common.result.Result;
import com.wangjin.common.web.annotation.PreventDuplicateResubmit;
import com.wangjin.common.web.model.Option;
import com.wangjin.salon.system.model.form.TenantForm;
import com.wangjin.salon.system.model.query.TenantPageQuery;
import com.wangjin.salon.system.model.vo.TenantPageVO;
import com.wangjin.salon.system.service.SysTenantService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Tag(name = "00.租户接口")
@RestController
@RequestMapping("/api/v1/tenants")
@RequiredArgsConstructor
public class SysTenantController {

    private final SysTenantService tenantService;

    @Operation(summary = "租户分页")
    @GetMapping("/page")
    public PageResult<TenantPageVO> page(TenantPageQuery query) {
        var page = tenantService.getTenantPage(query);
        return PageResult.success(page.getRecords(), page.getTotal());
    }

    @Operation(summary = "租户下拉")
    @GetMapping("/options")
    public Result<List<Option<Long>>> options() {
        return Result.success(tenantService.listOptions());
    }

    @Operation(summary = "租户表单")
    @GetMapping("/{id}/form")
    public Result<TenantForm> form(@PathVariable Long id) {
        return Result.success(tenantService.getTenantForm(id));
    }

    @Operation(summary = "新增租户")
    @PostMapping
    @PreventDuplicateResubmit
    public Result<Void> save(@Valid @RequestBody TenantForm form) {
        return Result.judge(tenantService.saveTenant(form));
    }

    @Operation(summary = "修改租户")
    @PutMapping("/{id}")
    public Result<Void> update(@PathVariable Long id, @Valid @RequestBody TenantForm form) {
        return Result.judge(tenantService.updateTenant(id, form));
    }

    @Operation(summary = "删除租户")
    @DeleteMapping
    public Result<Void> delete(@RequestParam String ids) {
        return Result.judge(tenantService.deleteTenants(ids));
    }

    @Operation(summary = "修改状态")
    @PatchMapping("/{id}/status")
    public Result<Void> status(@PathVariable Long id, @RequestParam Integer status) {
        return Result.judge(tenantService.updateStatus(id, status));
    }
}
