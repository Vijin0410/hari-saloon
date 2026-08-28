package com.wangjin.salon.service.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.wangjin.common.result.PageResult;
import com.wangjin.common.result.Result;
import com.wangjin.common.web.annotation.PreventDuplicateResubmit;
import com.wangjin.common.web.annotation.QueryDict;
import com.wangjin.salon.service.model.form.TenantPayConfigForm;
import com.wangjin.salon.service.model.query.TenantPayConfigPageQuery;
import com.wangjin.salon.service.model.vo.TenantPayConfigDetailVO;
import com.wangjin.salon.service.model.vo.TenantPayConfigOptionVO;
import com.wangjin.salon.service.model.vo.TenantPayConfigPageVO;
import com.wangjin.salon.service.model.vo.TenantPayConfigVerifyVO;
import com.wangjin.salon.service.service.TenantPayConfigService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 租户支付配置（docs/payment-design.md §7.1）。
 * <p>
 * 敏感字段 SM4 加密入库、详情不回显明文；保存后由前端自动触发验参自检
 * （微信直连走 V3 只读接口，见 {@code WxpayV3Verifier}）。
 */
@Tag(name = "19.支付配置接口")
@RestController
@RequestMapping("/api/v1/pay-configs")
@RequiredArgsConstructor
public class TenantPayConfigController {

    private final TenantPayConfigService tenantPayConfigService;

    @Operation(summary = "支付配置分页")
    @GetMapping("/page")
    @QueryDict
    @PreAuthorize("hasAuthority('biz:pay:config:list')")
    public PageResult<TenantPayConfigPageVO> page(TenantPayConfigPageQuery query) {
        Page<TenantPayConfigPageVO> p = tenantPayConfigService.getPage(query);
        return PageResult.success(p.getRecords(), p.getTotal());
    }

    @Operation(summary = "支付配置详情（敏感字段掩码，不回显明文）")
    @GetMapping("/{id}/detail")
    @PreAuthorize("hasAuthority('biz:pay:config:view')")
    public Result<TenantPayConfigDetailVO> detail(@PathVariable Long id) {
        return Result.success(tenantPayConfigService.getDetail(id));
    }

    @Operation(summary = "新增支付配置")
    @PostMapping("/add")
    @PreventDuplicateResubmit
    @PreAuthorize("hasAuthority('biz:pay:config:add')")
    public Result<Long> save(@Valid @RequestBody TenantPayConfigForm form) {
        return Result.success(tenantPayConfigService.save(form));
    }

    @Operation(summary = "修改支付配置（渠道禁改；敏感字段留空=保持原值）")
    @PutMapping("/{id}/update")
    @PreAuthorize("hasAuthority('biz:pay:config:edit')")
    public Result<Void> update(@PathVariable Long id, @Valid @RequestBody TenantPayConfigForm form) {
        return Result.judge(tenantPayConfigService.update(id, form));
    }

    @Operation(summary = "删除支付配置")
    @DeleteMapping("/delete")
    @PreAuthorize("hasAuthority('biz:pay:config:delete')")
    public Result<Void> delete(@RequestParam String ids) {
        return Result.judge(tenantPayConfigService.delete(ids));
    }

    @Operation(summary = "验参自检（微信直连调V3只读接口；manual直通；其余本地校验）")
    @PostMapping("/{id}/verify")
    @PreventDuplicateResubmit
    @PreAuthorize("hasAuthority('biz:pay:config:verify')")
    public Result<TenantPayConfigVerifyVO> verify(@PathVariable Long id) {
        return Result.success(tenantPayConfigService.verify(id));
    }

    @Operation(summary = "可用支付渠道下拉（启用且验证通过，收银台动态渲染用）")
    @GetMapping("/options")
    @PreAuthorize("isAuthenticated()")
    public Result<List<TenantPayConfigOptionVO>> options() {
        return Result.success(tenantPayConfigService.options());
    }
}
