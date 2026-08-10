package com.wangjin.salon.service.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.wangjin.common.result.PageResult;
import com.wangjin.common.result.Result;
import com.wangjin.common.web.annotation.PreventDuplicateResubmit;
import com.wangjin.salon.service.model.form.ServiceItemForm;
import com.wangjin.salon.service.model.query.ServiceItemPageQuery;
import com.wangjin.salon.service.model.vo.ServiceItemOptionVO;
import com.wangjin.salon.service.model.vo.ServiceItemPageVO;
import com.wangjin.salon.service.service.ServiceItemService;
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

@Tag(name = "15.服务项目接口")
@RestController
@RequestMapping("/api/v1/services")
@RequiredArgsConstructor
public class ServiceItemController {

    private final ServiceItemService serviceItemService;

    @Operation(summary = "服务项目分页")
    @GetMapping("/page")
    @PreAuthorize("hasAuthority('biz:serviceItem:list')")
    public PageResult<ServiceItemPageVO> page(ServiceItemPageQuery query) {
        Page<ServiceItemPageVO> p = serviceItemService.getPage(query);
        return PageResult.success(p.getRecords(), p.getTotal());
    }

    @Operation(summary = "服务项目表单")
    @GetMapping("/{id}/form")
    @PreAuthorize("hasAuthority('biz:serviceItem:view')")
    public Result<ServiceItemForm> form(@PathVariable Long id) {
        return Result.success(serviceItemService.getForm(id));
    }

    @Operation(summary = "新增服务项目")
    @PostMapping("/add")
    @PreventDuplicateResubmit
    @PreAuthorize("hasAuthority('biz:serviceItem:add')")
    public Result<Long> save(@Valid @RequestBody ServiceItemForm form) {
        return Result.success(serviceItemService.save(form));
    }

    @Operation(summary = "修改服务项目")
    @PutMapping("/{id}/update")
    @PreAuthorize("hasAuthority('biz:serviceItem:edit')")
    public Result<Void> update(@PathVariable Long id, @Valid @RequestBody ServiceItemForm form) {
        return Result.judge(serviceItemService.update(id, form));
    }

    @Operation(summary = "删除服务项目")
    @DeleteMapping("/delete")
    @PreAuthorize("hasAuthority('biz:serviceItem:delete')")
    public Result<Void> delete(@RequestParam String ids) {
        return Result.judge(serviceItemService.delete(ids));
    }

    @Operation(summary = "服务项目下拉")
    @GetMapping("/options")
    @PreAuthorize("isAuthenticated()")
    public Result<List<ServiceItemOptionVO>> options() {
        return Result.success(serviceItemService.options());
    }
}
