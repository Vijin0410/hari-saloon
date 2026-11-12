package com.wangjin.salon.service.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.wangjin.common.result.PageResult;
import com.wangjin.common.result.Result;
import com.wangjin.common.web.annotation.PreventDuplicateResubmit;
import com.wangjin.common.web.annotation.QueryDict;
import com.wangjin.salon.service.model.form.RechargeActivityForm;
import com.wangjin.salon.service.model.query.RechargeActivityPageQuery;
import com.wangjin.salon.service.model.vo.RechargeActivityOptionVO;
import com.wangjin.salon.service.model.vo.RechargeActivityPageVO;
import com.wangjin.salon.service.service.RechargeActivityService;
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

@Tag(name = "16.充值活动接口")
@RestController
@RequestMapping("/api/v1/recharge-activities")
@RequiredArgsConstructor
public class RechargeActivityController {

    private final RechargeActivityService rechargeActivityService;

    @Operation(summary = "充值活动分页")
    @GetMapping("/page")
    @PreAuthorize("hasAuthority('biz:rechargeActivity:list')")
    @QueryDict
    public PageResult<RechargeActivityPageVO> page(RechargeActivityPageQuery query) {
        Page<RechargeActivityPageVO> p = rechargeActivityService.getPage(query);
        return PageResult.success(p.getRecords(), p.getTotal());
    }

    @Operation(summary = "充值活动表单")
    @GetMapping("/{id}/form")
    @PreAuthorize("hasAuthority('biz:rechargeActivity:view')")
    public Result<RechargeActivityForm> form(@PathVariable Long id) {
        return Result.success(rechargeActivityService.getForm(id));
    }

    @Operation(summary = "新增充值活动")
    @PostMapping("/add")
    @PreventDuplicateResubmit
    @PreAuthorize("hasAuthority('biz:rechargeActivity:add')")
    public Result<Long> save(@Valid @RequestBody RechargeActivityForm form) {
        return Result.success(rechargeActivityService.save(form));
    }

    @Operation(summary = "修改充值活动")
    @PutMapping("/{id}/update")
    @PreAuthorize("hasAuthority('biz:rechargeActivity:edit')")
    public Result<Void> update(@PathVariable Long id, @Valid @RequestBody RechargeActivityForm form) {
        return Result.judge(rechargeActivityService.update(id, form));
    }

    @Operation(summary = "删除充值活动")
    @DeleteMapping("/delete")
    @PreAuthorize("hasAuthority('biz:rechargeActivity:delete')")
    public Result<Void> delete(@RequestParam String ids) {
        return Result.judge(rechargeActivityService.delete(ids));
    }

    @Operation(summary = "生效中活动下拉（充值弹窗档位）")
    @GetMapping("/options")
    @PreAuthorize("isAuthenticated()")
    public Result<List<RechargeActivityOptionVO>> options() {
        return Result.success(rechargeActivityService.options());
    }
}
