package com.wangjin.salon.service.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.wangjin.common.result.PageResult;
import com.wangjin.common.result.Result;
import com.wangjin.common.web.annotation.PreventDuplicateResubmit;
import com.wangjin.salon.service.model.form.GoodsCategoryForm;
import com.wangjin.salon.service.model.query.GoodsCategoryPageQuery;
import com.wangjin.salon.service.model.vo.GoodsCategoryOptionVO;
import com.wangjin.salon.service.model.vo.GoodsCategoryPageVO;
import com.wangjin.salon.service.service.GoodsCategoryService;
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

@Tag(name = "16.商品分类接口")
@RestController
@RequestMapping("/api/v1/goods-categories")
@RequiredArgsConstructor
public class GoodsCategoryController {

    private final GoodsCategoryService goodsCategoryService;

    @Operation(summary = "商品分类分页")
    @GetMapping("/page")
    @PreAuthorize("hasAuthority('biz:goodsCategory:list')")
    public PageResult<GoodsCategoryPageVO> page(GoodsCategoryPageQuery query) {
        Page<GoodsCategoryPageVO> p = goodsCategoryService.getPage(query);
        return PageResult.success(p.getRecords(), p.getTotal());
    }

    @Operation(summary = "商品分类表单")
    @GetMapping("/{id}/form")
    @PreAuthorize("hasAuthority('biz:goodsCategory:view')")
    public Result<GoodsCategoryForm> form(@PathVariable Long id) {
        return Result.success(goodsCategoryService.getForm(id));
    }

    @Operation(summary = "新增商品分类")
    @PostMapping("/add")
    @PreventDuplicateResubmit
    @PreAuthorize("hasAuthority('biz:goodsCategory:add')")
    public Result<Long> save(@Valid @RequestBody GoodsCategoryForm form) {
        return Result.success(goodsCategoryService.save(form));
    }

    @Operation(summary = "修改商品分类")
    @PutMapping("/{id}/update")
    @PreAuthorize("hasAuthority('biz:goodsCategory:edit')")
    public Result<Void> update(@PathVariable Long id, @Valid @RequestBody GoodsCategoryForm form) {
        return Result.judge(goodsCategoryService.update(id, form));
    }

    @Operation(summary = "删除商品分类")
    @DeleteMapping("/delete")
    @PreAuthorize("hasAuthority('biz:goodsCategory:delete')")
    public Result<Void> delete(@RequestParam String ids) {
        return Result.judge(goodsCategoryService.delete(ids));
    }

    @Operation(summary = "商品分类下拉")
    @GetMapping("/options")
    @PreAuthorize("isAuthenticated()")
    public Result<List<GoodsCategoryOptionVO>> options() {
        return Result.success(goodsCategoryService.options());
    }
}
