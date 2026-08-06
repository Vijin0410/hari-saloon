package com.wangjin.salon.service.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.wangjin.common.result.PageResult;
import com.wangjin.common.result.Result;
import com.wangjin.common.web.annotation.PreventDuplicateResubmit;
import com.wangjin.salon.service.model.form.MemberLevelForm;
import com.wangjin.salon.service.model.query.MemberLevelPageQuery;
import com.wangjin.salon.service.model.vo.MemberLevelOptionVO;
import com.wangjin.salon.service.model.vo.MemberLevelPageVO;
import com.wangjin.salon.service.service.MemberLevelService;
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

@Tag(name = "12.会员等级接口")
@RestController
@RequestMapping("/api/v1/member-levels")
@RequiredArgsConstructor
public class MemberLevelController {

    private final MemberLevelService memberLevelService;

    @Operation(summary = "等级分页")
    @GetMapping("/page")
    @PreAuthorize("hasAuthority('biz:memberLevel:list')")
    public PageResult<MemberLevelPageVO> page(MemberLevelPageQuery query) {
        Page<MemberLevelPageVO> p = memberLevelService.getPage(query);
        return PageResult.success(p.getRecords(), p.getTotal());
    }

    @Operation(summary = "等级表单")
    @GetMapping("/{id}/form")
    @PreAuthorize("hasAuthority('biz:memberLevel:view')")
    public Result<MemberLevelForm> form(@PathVariable Long id) {
        return Result.success(memberLevelService.getForm(id));
    }

    @Operation(summary = "新增等级")
    @PostMapping("/add")
    @PreventDuplicateResubmit
    @PreAuthorize("hasAuthority('biz:memberLevel:add')")
    public Result<Long> save(@Valid @RequestBody MemberLevelForm form) {
        return Result.success(memberLevelService.save(form));
    }

    @Operation(summary = "修改等级")
    @PutMapping("/{id}/update")
    @PreAuthorize("hasAuthority('biz:memberLevel:edit')")
    public Result<Void> update(@PathVariable Long id, @Valid @RequestBody MemberLevelForm form) {
        return Result.judge(memberLevelService.update(id, form));
    }

    @Operation(summary = "删除等级")
    @DeleteMapping("/delete")
    @PreAuthorize("hasAuthority('biz:memberLevel:delete')")
    public Result<Void> delete(@RequestParam String ids) {
        return Result.judge(memberLevelService.delete(ids));
    }

    @Operation(summary = "等级下拉")
    @GetMapping("/options")
    @PreAuthorize("isAuthenticated()")
    public Result<List<MemberLevelOptionVO>> options() {
        return Result.success(memberLevelService.options());
    }
}
