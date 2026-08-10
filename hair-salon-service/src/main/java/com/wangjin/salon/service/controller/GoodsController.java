package com.wangjin.salon.service.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.wangjin.common.result.PageResult;
import com.wangjin.common.result.Result;
import com.wangjin.common.web.annotation.PreventDuplicateResubmit;
import com.wangjin.salon.service.model.form.GoodsForm;
import com.wangjin.salon.service.model.query.GoodsPageQuery;
import com.wangjin.salon.service.model.vo.GoodsOptionVO;
import com.wangjin.salon.service.model.vo.GoodsPageVO;
import com.wangjin.salon.service.service.GoodsService;
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

@Tag(name = "17.商品管理接口")
@RestController
@RequestMapping("/api/v1/goods")
@RequiredArgsConstructor
public class GoodsController {

    private final GoodsService goodsService;

    @Operation(summary = "商品分页")
    @GetMapping("/page")
    @PreAuthorize("hasAuthority('biz:goods:list')")
    public PageResult<GoodsPageVO> page(GoodsPageQuery query) {
        Page<GoodsPageVO> p = goodsService.getPage(query);
        return PageResult.success(p.getRecords(), p.getTotal());
    }

    @Operation(summary = "商品表单")
    @GetMapping("/{id}/form")
    @PreAuthorize("hasAuthority('biz:goods:view')")
    public Result<GoodsForm> form(@PathVariable Long id) {
        return Result.success(goodsService.getForm(id));
    }

    @Operation(summary = "新增商品")
    @PostMapping("/add")
    @PreventDuplicateResubmit
    @PreAuthorize("hasAuthority('biz:goods:add')")
    public Result<Long> save(@Valid @RequestBody GoodsForm form) {
        return Result.success(goodsService.save(form));
    }

    @Operation(summary = "修改商品")
    @PutMapping("/{id}/update")
    @PreAuthorize("hasAuthority('biz:goods:edit')")
    public Result<Void> update(@PathVariable Long id, @Valid @RequestBody GoodsForm form) {
        return Result.judge(goodsService.update(id, form));
    }

    @Operation(summary = "删除商品")
    @DeleteMapping("/delete")
    @PreAuthorize("hasAuthority('biz:goods:delete')")
    public Result<Void> delete(@RequestParam String ids) {
        return Result.judge(goodsService.delete(ids));
    }

    @Operation(summary = "商品下拉")
    @GetMapping("/options")
    @PreAuthorize("isAuthenticated()")
    public Result<List<GoodsOptionVO>> options() {
        return Result.success(goodsService.options());
    }
}
