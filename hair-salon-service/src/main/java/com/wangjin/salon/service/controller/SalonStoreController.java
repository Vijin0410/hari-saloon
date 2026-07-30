package com.wangjin.salon.service.controller;

import com.wangjin.common.result.PageResult;
import com.wangjin.common.result.Result;
import com.wangjin.common.web.annotation.PreventDuplicateResubmit;
import com.wangjin.common.web.model.Option;
import com.wangjin.salon.service.model.form.StoreForm;
import com.wangjin.salon.service.model.query.StorePageQuery;
import com.wangjin.salon.service.model.vo.StoreDetailVO;
import com.wangjin.salon.service.model.vo.StorePageVO;
import com.wangjin.salon.service.service.SalonStoreService;
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

@Tag(name = "10.门店接口")
@RestController
@RequestMapping("/api/v1/stores")
@RequiredArgsConstructor
public class SalonStoreController {

    private final SalonStoreService storeService;

    @Operation(summary = "门店分页")
    @GetMapping("/page")
    @PreAuthorize("hasAuthority('biz:store:list')")
    public PageResult<StorePageVO> page(StorePageQuery query) {
        var page = storeService.getStorePage(query);
        return PageResult.success(page.getRecords(), page.getTotal());
    }

    @Operation(summary = "门店下拉")
    @GetMapping("/options")
    @PreAuthorize("hasAnyAuthority('biz:store:list','biz:member:list','biz:member:add','biz:member:edit')")
    public Result<List<Option<Long>>> options() {
        return Result.success(storeService.listStoreOptions());
    }

    @Operation(summary = "门店详情")
    @GetMapping("/detail/{id}")
    @PreAuthorize("hasAuthority('biz:store:list')")
    public Result<StoreDetailVO> detail(@PathVariable Long id) {
        return Result.success(storeService.getDetail(id));
    }

    @Operation(summary = "新增门店")
    @PostMapping
    @PreventDuplicateResubmit
    @PreAuthorize("hasAuthority('biz:store:add')")
    public Result<Long> save(@Valid @RequestBody StoreForm form) {
        return Result.success(storeService.saveStore(form));
    }

    @Operation(summary = "修改门店")
    @PutMapping("/update/{id}")
    @PreAuthorize("hasAuthority('biz:store:edit')")
    public Result<Void> update(@PathVariable Long id, @Valid @RequestBody StoreForm form) {
        return Result.judge(storeService.updateStore(id, form));
    }

    @Operation(summary = "删除门店")
    @DeleteMapping("/delete")
    @PreAuthorize("hasAuthority('biz:store:delete')")
    public Result<Void> delete(@RequestParam String ids) {
        return Result.judge(storeService.deleteStores(ids));
    }
}
