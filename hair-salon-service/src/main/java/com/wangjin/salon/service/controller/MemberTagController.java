package com.wangjin.salon.service.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.wangjin.common.result.PageResult;
import com.wangjin.common.result.Result;
import com.wangjin.common.web.annotation.PreventDuplicateResubmit;
import com.wangjin.salon.service.model.form.MemberTagForm;
import com.wangjin.salon.service.model.query.MemberTagPageQuery;
import com.wangjin.salon.service.model.vo.MemberTagOptionVO;
import com.wangjin.salon.service.model.vo.MemberTagVO;
import com.wangjin.salon.service.service.MemberTagService;
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

@Tag(name = "13.会员标签接口")
@RestController
@RequestMapping("/api/v1/member-tags")
@RequiredArgsConstructor
public class MemberTagController {

    private final MemberTagService memberTagService;

    @Operation(summary = "标签分页")
    @GetMapping("/page")
    @PreAuthorize("hasAuthority('biz:memberTag:list')")
    public PageResult<MemberTagVO> page(MemberTagPageQuery query) {
        Page<MemberTagVO> p = memberTagService.getPage(query);
        return PageResult.success(p.getRecords(), p.getTotal());
    }

    @Operation(summary = "标签表单")
    @GetMapping("/{id}/form")
    @PreAuthorize("hasAuthority('biz:memberTag:view')")
    public Result<MemberTagForm> form(@PathVariable Long id) {
        return Result.success(memberTagService.getForm(id));
    }

    @Operation(summary = "新增标签")
    @PostMapping("/add")
    @PreventDuplicateResubmit
    @PreAuthorize("hasAuthority('biz:memberTag:add')")
    public Result<Long> save(@Valid @RequestBody MemberTagForm form) {
        return Result.success(memberTagService.save(form));
    }

    @Operation(summary = "修改标签")
    @PutMapping("/{id}/update")
    @PreAuthorize("hasAuthority('biz:memberTag:edit')")
    public Result<Void> update(@PathVariable Long id, @Valid @RequestBody MemberTagForm form) {
        return Result.judge(memberTagService.update(id, form));
    }

    @Operation(summary = "删除标签")
    @DeleteMapping("/delete")
    @PreAuthorize("hasAuthority('biz:memberTag:delete')")
    public Result<Void> delete(@RequestParam String ids) {
        return Result.judge(memberTagService.delete(ids));
    }

    @Operation(summary = "标签下拉")
    @GetMapping("/options")
    @PreAuthorize("isAuthenticated()")
    public Result<List<MemberTagOptionVO>> options() {
        return Result.success(memberTagService.options());
    }
}
