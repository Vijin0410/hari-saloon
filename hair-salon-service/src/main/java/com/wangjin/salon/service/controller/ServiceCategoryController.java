package com.wangjin.salon.service.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.wangjin.common.result.PageResult;
import com.wangjin.common.result.Result;
import com.wangjin.common.web.annotation.PreventDuplicateResubmit;
import com.wangjin.salon.service.model.form.ServiceCategoryForm;
import com.wangjin.salon.service.model.query.ServiceCategoryPageQuery;
import com.wangjin.salon.service.model.vo.ServiceCategoryOptionVO;
import com.wangjin.salon.service.model.vo.ServiceCategoryPageVO;
import com.wangjin.salon.service.service.ServiceCategoryService;
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

@Tag(name = "14.服务项目分类接口")
@RestController
@RequestMapping("/api/v1/service-categories")
@RequiredArgsConstructor
public class ServiceCategoryController {

    private final ServiceCategoryService serviceCategoryService;

    @Operation(summary = "服务分类分页")
    @GetMapping("/page")
    @PreAuthorize("hasAuthority('biz:serviceCategory:list')")
    public PageResult<ServiceCategoryPageVO> page(ServiceCategoryPageQuery query) {
        Page<ServiceCategoryPageVO> p = serviceCategoryService.getPage(query);
        return PageResult.success(p.getRecords(), p.getTotal());
    }

    @Operation(summary = "服务分类表单")
    @GetMapping("/{id}/form")
    @PreAuthorize("hasAuthority('biz:serviceCategory:view')")
    public Result<ServiceCategoryForm> form(@PathVariable Long id) {
        return Result.success(serviceCategoryService.getForm(id));
    }

    @Operation(summary = "新增服务分类")
    @PostMapping("/add")
    @PreventDuplicateResubmit
    @PreAuthorize("hasAuthority('biz:serviceCategory:add')")
    public Result<Long> save(@Valid @RequestBody ServiceCategoryForm form) {
        return Result.success(serviceCategoryService.save(form));
    }

    @Operation(summary = "修改服务分类")
    @PutMapping("/{id}/update")
    @PreAuthorize("hasAuthority('biz:serviceCategory:edit')")
    public Result<Void> update(@PathVariable Long id, @Valid @RequestBody ServiceCategoryForm form) {
        return Result.judge(serviceCategoryService.update(id, form));
    }

    @Operation(summary = "删除服务分类")
    @DeleteMapping("/delete")
    @PreAuthorize("hasAuthority('biz:serviceCategory:delete')")
    public Result<Void> delete(@RequestParam String ids) {
        return Result.judge(serviceCategoryService.delete(ids));
    }

    @Operation(summary = "服务分类下拉")
    @GetMapping("/options")
    @PreAuthorize("isAuthenticated()")
    public Result<List<ServiceCategoryOptionVO>> options() {
        return Result.success(serviceCategoryService.options());
    }
}
