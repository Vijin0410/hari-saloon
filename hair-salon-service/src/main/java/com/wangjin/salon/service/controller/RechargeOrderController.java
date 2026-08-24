package com.wangjin.salon.service.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.wangjin.common.result.PageResult;
import com.wangjin.common.result.Result;
import com.wangjin.common.web.annotation.PreventDuplicateResubmit;
import com.wangjin.salon.service.model.form.RechargeCreateForm;
import com.wangjin.salon.service.model.query.RechargeOrderPageQuery;
import com.wangjin.salon.service.model.vo.RechargeOrderDetailVO;
import com.wangjin.salon.service.model.vo.RechargeOrderPageVO;
import com.wangjin.salon.service.model.vo.RechargePreviewVO;
import com.wangjin.salon.service.service.RechargeOrderService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;

@Tag(name = "17.会员充值接口")
@RestController
@RequestMapping("/api/v1/recharges")
@RequiredArgsConstructor
public class RechargeOrderController {

    private final RechargeOrderService rechargeOrderService;

    @Operation(summary = "充值记录分页")
    @GetMapping("/page")
    @PreAuthorize("hasAuthority('biz:recharge:list')")
    public PageResult<RechargeOrderPageVO> page(RechargeOrderPageQuery query) {
        Page<RechargeOrderPageVO> p = rechargeOrderService.getPage(query);
        return PageResult.success(p.getRecords(), p.getTotal());
    }

    @Operation(summary = "充值记录详情")
    @GetMapping("/{id}/detail")
    @PreAuthorize("hasAuthority('biz:recharge:view')")
    public Result<RechargeOrderDetailVO> detail(@PathVariable Long id) {
        return Result.success(rechargeOrderService.getDetail(id));
    }

    @Operation(summary = "充值赠送预览（按金额实时计算）")
    @GetMapping("/preview")
    @PreAuthorize("hasAuthority('biz:recharge:add')")
    public Result<RechargePreviewVO> preview(@RequestParam Long memberId, @RequestParam BigDecimal amount) {
        return Result.success(rechargeOrderService.preview(memberId, amount));
    }

    @Operation(summary = "发起充值（手动确认收款）")
    @PostMapping("/add")
    @PreventDuplicateResubmit
    @PreAuthorize("hasAuthority('biz:recharge:add')")
    public Result<Long> create(@Valid @RequestBody RechargeCreateForm form) {
        return Result.success(rechargeOrderService.create(form));
    }
}
