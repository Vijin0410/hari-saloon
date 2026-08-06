package com.wangjin.salon.service.controller;

import com.wangjin.common.result.PageResult;
import com.wangjin.common.result.Result;
import com.wangjin.common.web.annotation.PreventDuplicateResubmit;
import com.wangjin.common.web.annotation.QueryDict;
import com.wangjin.salon.service.model.form.MemberForm;
import com.wangjin.salon.service.model.query.MemberPageQuery;
import com.wangjin.salon.service.model.vo.MemberDetailVO;
import com.wangjin.salon.service.model.vo.MemberPageVO;
import com.wangjin.salon.service.service.SalonMemberService;
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

@Tag(name = "11.会员接口")
@RestController
@RequestMapping("/api/v1/members")
@RequiredArgsConstructor
public class SalonMemberController {

    private final SalonMemberService memberService;

    @Operation(summary = "会员分页")
    @GetMapping("/page")
    @QueryDict
    @PreAuthorize("hasAuthority('biz:member:list')")
    public PageResult<MemberPageVO> page(MemberPageQuery query) {
        var page = memberService.getMemberPage(query);
        return PageResult.success(page.getRecords(), page.getTotal());
    }

    @Operation(summary = "会员详情")
    @GetMapping("/{id}/detail")
    @PreAuthorize("hasAuthority('biz:member:view')")
    public Result<MemberDetailVO> detail(@PathVariable Long id) {
        return Result.success(memberService.getDetail(id));
    }

    @Operation(summary = "新增会员")
    @PostMapping("/add")
    @PreventDuplicateResubmit
    @PreAuthorize("hasAuthority('biz:member:add')")
    public Result<Long> save(@Valid @RequestBody MemberForm form) {
        return Result.success(memberService.saveMember(form));
    }

    @Operation(summary = "修改会员")
    @PutMapping("/{id}/update")
    @PreAuthorize("hasAuthority('biz:member:edit')")
    public Result<Void> update(@PathVariable Long id, @Valid @RequestBody MemberForm form) {
        return Result.judge(memberService.updateMember(id, form));
    }

    @Operation(summary = "删除会员")
    @DeleteMapping("/delete")
    @PreAuthorize("hasAuthority('biz:member:delete')")
    public Result<Void> delete(@RequestParam String ids) {
        return Result.judge(memberService.deleteMembers(ids));
    }
}
