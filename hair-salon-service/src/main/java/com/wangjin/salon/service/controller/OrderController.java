package com.wangjin.salon.service.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.wangjin.common.result.PageResult;
import com.wangjin.common.result.Result;
import com.wangjin.common.web.annotation.PreventDuplicateResubmit;
import com.wangjin.common.web.annotation.QueryDict;
import com.wangjin.salon.service.model.form.OrderPayForm;
import com.wangjin.salon.service.model.form.OrderRefundForm;
import com.wangjin.salon.service.model.form.OrderSaveForm;
import com.wangjin.salon.service.model.query.OrderPageQuery;
import com.wangjin.salon.service.model.vo.OrderDetailVO;
import com.wangjin.salon.service.model.vo.OrderPageVO;
import com.wangjin.salon.service.model.vo.OrderPayStatusVO;
import com.wangjin.salon.service.model.vo.OrderPrepayVO;
import com.wangjin.salon.service.model.vo.OrderRefundVO;
import com.wangjin.salon.service.service.OrderRefundService;
import com.wangjin.salon.service.service.OrderService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Tag(name = "18.收银订单接口")
@RestController
@RequestMapping("/api/v1/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;
    private final OrderRefundService orderRefundService;

    @Operation(summary = "订单分页（status=0 即挂单列表）")
    @GetMapping("/page")
    @QueryDict
    @PreAuthorize("hasAuthority('biz:order:list')")
    public PageResult<OrderPageVO> page(OrderPageQuery query) {
        Page<OrderPageVO> p = orderService.getPage(query);
        return PageResult.success(p.getRecords(), p.getTotal());
    }

    @Operation(summary = "订单详情（含明细与支付）")
    @GetMapping("/{id}/detail")
    @QueryDict
    @PreAuthorize("hasAuthority('biz:order:view')")
    public Result<OrderDetailVO> detail(@PathVariable Long id) {
        return Result.success(orderService.getDetail(id));
    }

    @Operation(summary = "开单挂单（status=0 待结算）")
    @PostMapping("/add")
    @PreventDuplicateResubmit
    @PreAuthorize("hasAuthority('biz:order:add')")
    public Result<Long> save(@Valid @RequestBody OrderSaveForm form) {
        return Result.success(orderService.savePending(form));
    }

    @Operation(summary = "修改挂单（仅挂单可改）")
    @PutMapping("/{id}/update")
    @PreAuthorize("hasAuthority('biz:order:add')")
    public Result<Void> update(@PathVariable Long id, @Valid @RequestBody OrderSaveForm form) {
        return Result.judge(orderService.updatePending(id, form));
    }

    @Operation(summary = "订单结算（组合支付/积分抵扣/余额支付/找零）")
    @PostMapping("/{id}/pay")
    @PreventDuplicateResubmit
    @PreAuthorize("hasAuthority('biz:order:pay')")
    public Result<Long> pay(@PathVariable Long id, @Valid @RequestBody OrderPayForm form) {
        return Result.success(orderService.pay(id, form));
    }

    @Operation(summary = "订单扫码预下单（组合支付含微信/支付宝行时出码，渠道按支付方式推导；确认结算由回调驱动）")
    @PostMapping("/{id}/prepay")
    @PreventDuplicateResubmit
    @PreAuthorize("hasAuthority('biz:order:pay')")
    public Result<OrderPrepayVO> prepay(@PathVariable Long id, @Valid @RequestBody OrderPayForm form) {
        return Result.success(orderService.prepayScan(id, form));
    }

    @Operation(summary = "取消订单扫码支付（关流水，订单保持挂单可重新支付）")
    @PostMapping("/{id}/prepay-cancel")
    @PreventDuplicateResubmit
    @PreAuthorize("hasAuthority('biz:order:pay')")
    public Result<Void> prepayCancel(@PathVariable Long id) {
        orderService.cancelPrepay(id);
        return Result.success(null);
    }

    @Operation(summary = "订单支付状态（收银台扫码轮询）")
    @GetMapping("/{id}/pay-status")
    @PreAuthorize("hasAuthority('biz:order:pay')")
    @QueryDict
    public Result<OrderPayStatusVO> payStatus(@PathVariable Long id) {
        return Result.success(orderService.getPayStatus(id));
    }

    @Operation(summary = "取消挂单")
    @PostMapping("/{id}/cancel")
    @PreAuthorize("hasAuthority('biz:order:cancel')")
    public Result<Void> cancel(@PathVariable Long id) {
        return Result.judge(orderService.cancel(id));
    }

    @Operation(summary = "订单退款（整单或部分金额；微信/支付宝原路退回，余额/积分退回会员，现金等线下退）")
    @PostMapping("/{id}/refund")
    @PreventDuplicateResubmit
    @PreAuthorize("hasAuthority('biz:order:refund')")
    @QueryDict
    public Result<OrderRefundVO> refund(@PathVariable Long id, @Valid @RequestBody OrderRefundForm form) {
        return Result.success(orderRefundService.apply(id, form));
    }

    @Operation(summary = "订单退款记录（含分摊明细）")
    @GetMapping("/{id}/refunds")
    @QueryDict
    @PreAuthorize("hasAuthority('biz:order:view')")
    public Result<List<OrderRefundVO>> refunds(@PathVariable Long id) {
        return Result.success(orderRefundService.listByOrder(id));
    }
}
