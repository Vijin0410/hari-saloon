package com.wangjin.salon.service.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.wangjin.common.result.PageResult;
import com.wangjin.common.result.Result;
import com.wangjin.common.web.annotation.PreventDuplicateResubmit;
import com.wangjin.common.web.annotation.QueryDict;
import com.wangjin.salon.service.model.form.DailySettlementForm;
import com.wangjin.salon.service.model.query.FinanceQuery;
import com.wangjin.salon.service.model.vo.DailySettlementVO;
import com.wangjin.salon.service.model.vo.FinanceLedgerVO;
import com.wangjin.salon.service.model.vo.FinanceReportVO;
import com.wangjin.salon.service.model.vo.FinanceStoreOptionVO;
import com.wangjin.salon.service.service.FinanceService;
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

import java.util.List;

@Tag(name = "财务日结与经营报表")
@RestController
@RequestMapping("/api/v1/finance")
@RequiredArgsConstructor
public class FinanceController {

    private final FinanceService financeService;

    @Operation(summary = "财务可见门店选项")
    @GetMapping("/stores/options")
    @PreAuthorize("hasAnyAuthority('biz:report:list', 'biz:finance:list', 'biz:finance:settle') or T(com.wangjin.common.security.util.SecurityUtils).isRoot()")
    public Result<List<FinanceStoreOptionVO>> storeOptions(@RequestParam(required = false) Long tenantId) {
        return Result.success(financeService.storeOptions(tenantId));
    }

    @Operation(summary = "经营统计、趋势与排行")
    @GetMapping("/report")
    @PreAuthorize("hasAnyAuthority('biz:report:list', 'biz:finance:list') or T(com.wangjin.common.security.util.SecurityUtils).isRoot()")
    @QueryDict
    public Result<FinanceReportVO> report(FinanceQuery query) {
        return Result.success(financeService.report(query));
    }

    @Operation(summary = "财务成功业务明细")
    @GetMapping("/ledger/page")
    @PreAuthorize("hasAnyAuthority('biz:finance:list', 'biz:report:list') or T(com.wangjin.common.security.util.SecurityUtils).isRoot()")
    public PageResult<FinanceLedgerVO> ledger(FinanceQuery query) {
        Page<FinanceLedgerVO> page = financeService.ledger(query);
        return PageResult.success(page.getRecords(), page.getTotal());
    }

    @Operation(summary = "导出财务业务明细（最多10000条）")
    @GetMapping("/ledger/export")
    @PreAuthorize("hasAuthority('biz:finance:export') or T(com.wangjin.common.security.util.SecurityUtils).isRoot()")
    public Result<List<FinanceLedgerVO>> export(FinanceQuery query) {
        return Result.success(financeService.exportLedger(query));
    }

    @Operation(summary = "历史日结分页")
    @GetMapping("/settlements/page")
    @PreAuthorize("hasAuthority('biz:finance:list') or T(com.wangjin.common.security.util.SecurityUtils).isRoot()")
    public PageResult<DailySettlementVO> settlements(FinanceQuery query) {
        Page<DailySettlementVO> page = financeService.settlements(query);
        return PageResult.success(page.getRecords(), page.getTotal());
    }

    @Operation(summary = "确认门店自然日日结")
    @PostMapping("/settlements/add")
    @PreventDuplicateResubmit
    @PreAuthorize("hasAuthority('biz:finance:settle') or T(com.wangjin.common.security.util.SecurityUtils).isRoot()")
    public Result<Long> settle(@Valid @RequestBody DailySettlementForm form) {
        return Result.success(financeService.settle(form));
    }

    @Operation(summary = "日结快照与补入数据差异检测")
    @GetMapping("/settlements/{id}/detail")
    @PreAuthorize("hasAuthority('biz:finance:list') or T(com.wangjin.common.security.util.SecurityUtils).isRoot()")
    @QueryDict
    public Result<DailySettlementVO> detail(@PathVariable Long id) {
        return Result.success(financeService.detail(id));
    }
}
