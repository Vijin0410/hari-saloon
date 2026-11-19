package com.wangjin.salon.service.controller;

import com.wangjin.common.result.Result;
import com.wangjin.common.web.annotation.PreventDuplicateResubmit;
import com.wangjin.salon.service.model.form.OrderStaffCorrectionForm;
import com.wangjin.salon.service.model.vo.OrderStaffChangeVO;
import com.wangjin.salon.service.model.vo.OrderStaffOptionVO;
import com.wangjin.salon.service.service.OrderStaffService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@Tag(name = "18.收银订单人员接口")
@RestController
@RequestMapping("/api/v1/orders")
@RequiredArgsConstructor
public class OrderStaffController {
    private final OrderStaffService orderStaffService;

    @Operation(summary = "门店开单人员选项（含角色默认开单身份）")
    @GetMapping("/staff-options")
    @PreAuthorize("isAuthenticated()")
    public Result<List<OrderStaffOptionVO>> options(@RequestParam Long storeId) {
        return Result.success(orderStaffService.listOptions(storeId));
    }

    @Operation(summary = "更正已结算订单服务人员与助理（必填原因并留痕）")
    @PostMapping("/{id}/staff-correction")
    @PreAuthorize("hasAuthority('biz:order:staff-edit')")
    @PreventDuplicateResubmit
    public Result<Void> correct(@PathVariable Long id, @Valid @RequestBody OrderStaffCorrectionForm form) {
        orderStaffService.correct(id, form);
        return Result.success(null);
    }

    @Operation(summary = "订单人员更正记录")
    @GetMapping("/{id}/staff-changes")
    @PreAuthorize("hasAuthority('biz:order:view')")
    public Result<List<OrderStaffChangeVO>> changes(@PathVariable Long id) {
        return Result.success(orderStaffService.listChanges(id));
    }
}
