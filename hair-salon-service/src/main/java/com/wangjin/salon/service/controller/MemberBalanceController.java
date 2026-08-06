package com.wangjin.salon.service.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.wangjin.common.result.PageResult;
import com.wangjin.common.result.Result;
import com.wangjin.common.web.annotation.PreventDuplicateResubmit;
import com.wangjin.common.web.annotation.QueryDict;
import com.wangjin.salon.service.model.form.MemberBalanceAdjustForm;
import com.wangjin.salon.service.model.query.MemberBalanceLogPageQuery;
import com.wangjin.salon.service.model.vo.MemberBalanceLogVO;
import com.wangjin.salon.service.model.vo.MemberBalanceVO;
import com.wangjin.salon.service.service.MemberBalanceService;
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
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "14.会员余额接口")
@RestController
@RequestMapping("/api/v1/members/balance")
@RequiredArgsConstructor
public class MemberBalanceController {

    private final MemberBalanceService memberBalanceService;

    @Operation(summary = "余额明细")
    @GetMapping("/{id}/detail")
    @PreAuthorize("hasAuthority('biz:member:view')")
    public Result<MemberBalanceVO> detail(@PathVariable Long id) {
        return Result.success(memberBalanceService.getDetail(id));
    }

    @Operation(summary = "余额流水分页")
    @GetMapping("/logs/page")
    @QueryDict
    @PreAuthorize("hasAuthority('biz:memberBalance:log')")
    public PageResult<MemberBalanceLogVO> logs(MemberBalanceLogPageQuery query) {
        Page<MemberBalanceLogVO> p = memberBalanceService.getLogPage(query);
        return PageResult.success(p.getRecords(), p.getTotal());
    }

    @Operation(summary = "余额调整")
    @PostMapping("/{id}/adjust")
    @PreventDuplicateResubmit
    @PreAuthorize("hasAuthority('biz:memberBalance:adjust')")
    public Result<Void> adjust(@PathVariable Long id, @Valid @RequestBody MemberBalanceAdjustForm form) {
        memberBalanceService.adjust(id, form);
        return Result.success();
    }
}
