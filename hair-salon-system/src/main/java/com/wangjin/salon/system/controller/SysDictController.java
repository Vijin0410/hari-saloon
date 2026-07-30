package com.wangjin.salon.system.controller;

import com.wangjin.common.result.PageResult;
import com.wangjin.common.result.Result;
import com.wangjin.common.web.annotation.PreventDuplicateResubmit;
import com.wangjin.common.web.model.Option;
import com.wangjin.salon.system.model.form.DictForm;
import com.wangjin.salon.system.model.form.DictTypeForm;
import com.wangjin.salon.system.model.query.DictPageQuery;
import com.wangjin.salon.system.model.query.DictTypePageQuery;
import com.wangjin.salon.system.model.vo.DictPageVO;
import com.wangjin.salon.system.model.vo.DictTypePageVO;
import com.wangjin.salon.system.service.SysDictService;
import com.wangjin.salon.system.service.SysDictTypeService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
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

@Tag(name = "05.字典接口")
@RestController
@RequestMapping("/api/v1/dict")
@RequiredArgsConstructor
public class SysDictController {

    private final SysDictService dictService;
    private final SysDictTypeService dictTypeService;

    @Operation(summary = "字典分页列表")
    @GetMapping("/page")
    @PreAuthorize("hasAuthority('system:dict:list')")
    public PageResult<DictPageVO> getDictPage(DictPageQuery queryParams) {
        var page = dictService.getDictPage(queryParams);
        return PageResult.success(page.getRecords(), page.getTotal());
    }

    @Operation(summary = "字典表单")
    @GetMapping("/form/{id}")
    @PreAuthorize("hasAuthority('system:dict:list')")
    public Result<DictForm> getDictForm(@PathVariable Long id) {
        return Result.success(dictService.getDictForm(id));
    }

    @Operation(summary = "新增字典")
    @PostMapping
    @PreventDuplicateResubmit
    @PreAuthorize("hasAuthority('system:dict:add')")
    public Result<Void> saveDict(@RequestBody DictForm form) {
        return Result.judge(dictService.saveDict(form));
    }

    @Operation(summary = "修改字典")
    @PutMapping("/update/{id}")
    @PreAuthorize("hasAuthority('system:dict:edit')")
    public Result<Void> updateDict(@PathVariable Long id, @RequestBody DictForm form) {
        return Result.judge(dictService.updateDict(id, form));
    }

    @Operation(summary = "删除字典")
    @DeleteMapping("/delete")
    @PreAuthorize("hasAuthority('system:dict:delete')")
    public Result<Void> deleteDict(@Parameter(description = "字典ID，逗号分隔") @RequestParam String ids) {
        return Result.judge(dictService.deleteDict(ids));
    }

    @Operation(summary = "字典下拉")
    @GetMapping("/options")
    @PreAuthorize("hasAuthority('system:dict:list')")
    public Result<List<Option<String>>> listDictOptions(@RequestParam String typeCode) {
        return Result.success(dictService.listDictOptions(typeCode));
    }

    @Operation(summary = "字典类型分页")
    @GetMapping("/types/page")
    @PreAuthorize("hasAuthority('system:dict:list')")
    public PageResult<DictTypePageVO> getDictTypePage(DictTypePageQuery queryParams) {
        var page = dictTypeService.getDictTypePage(queryParams);
        return PageResult.success(page.getRecords(), page.getTotal());
    }

    @Operation(summary = "按分组查字典类型")
    @GetMapping("/types/listByGroupCode")
    @PreAuthorize("hasAuthority('system:dict:list')")
    public Result<List<DictTypeForm>> listByGroupCode(@RequestParam String groupCode) {
        return Result.success(dictTypeService.listByGroupCode(groupCode));
    }

    @Operation(summary = "字典类型表单")
    @GetMapping("/types/form/{id}")
    @PreAuthorize("hasAuthority('system:dict:list')")
    public Result<DictTypeForm> getDictTypeForm(@PathVariable Long id) {
        return Result.success(dictTypeService.getDictTypeForm(id));
    }

    @Operation(summary = "新增字典类型")
    @PostMapping("/types")
    @PreventDuplicateResubmit
    @PreAuthorize("hasAuthority('system:dict:add')")
    public Result<Void> saveDictType(@RequestBody DictTypeForm form) {
        return Result.judge(dictTypeService.saveDictType(form));
    }

    @Operation(summary = "修改字典类型")
    @PutMapping("/types/update/{id}")
    @PreAuthorize("hasAuthority('system:dict:edit')")
    public Result<Void> updateDictType(@PathVariable Long id, @RequestBody DictTypeForm form) {
        return Result.judge(dictTypeService.updateDictType(id, form));
    }

    @Operation(summary = "删除字典类型")
    @DeleteMapping("/types/delete")
    @PreAuthorize("hasAuthority('system:dict:delete')")
    public Result<Void> deleteDictTypes(@RequestParam String ids) {
        return Result.judge(dictTypeService.deleteDictTypes(ids));
    }
}
