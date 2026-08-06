package com.wangjin.salon.service.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.wangjin.common.result.PageResult;
import com.wangjin.common.result.Result;
import com.wangjin.common.web.annotation.PreventDuplicateResubmit;
import com.wangjin.common.web.annotation.QueryDict;
import com.wangjin.salon.service.model.form.MemberPointAdjustForm;
import com.wangjin.salon.service.model.query.MemberPointLogPageQuery;
import com.wangjin.salon.service.model.vo.MemberPointLogVO;
import com.wangjin.salon.service.service.MemberPointService;
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

@Tag(name = "15.会员积分接口")
@RestController
@RequestMapping("/api/v1/members/points")
@RequiredArgsConstructor
public class MemberPointController {

    private final MemberPointService memberPointService;

    @Operation(summary = "积分流水分页")
    @GetMapping("/logs/page")
    @QueryDict
    @PreAuthorize("hasAuthority('biz:memberPoint:log')")
    public PageResult<MemberPointLogVO> logs(MemberPointLogPageQuery query) {
        Page<MemberPointLogVO> p = memberPointService.getLogPage(query);
        return PageResult.success(p.getRecords(), p.getTotal());
    }

    @Operation(summary = "积分调整")
    @PostMapping("/{id}/adjust")
    @PreventDuplicateResubmit
    @PreAuthorize("hasAuthority('biz:memberPoint:adjust')")
    public Result<Void> adjust(@PathVariable Long id, @Valid @RequestBody MemberPointAdjustForm form) {
        memberPointService.adjust(id, form);
        return Result.success();
    }
}
