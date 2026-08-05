package com.wangjin.salon.system.controller;

import com.wangjin.common.result.Result;
import com.wangjin.common.web.annotation.PreventDuplicateResubmit;
import com.wangjin.common.web.model.Option;
import com.wangjin.salon.system.model.form.DeptForm;
import com.wangjin.salon.system.model.query.DeptQuery;
import com.wangjin.salon.system.model.vo.DeptVO;
import com.wangjin.salon.system.service.SysDeptService;
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

@Tag(name = "04.部门接口")
@RestController
@RequestMapping("/api/v1/dept")
@RequiredArgsConstructor
public class SysDeptController {

    private final SysDeptService deptService;

    @Operation(summary = "部门树列表")
    @GetMapping
    @PreAuthorize("hasAuthority('system:dept:list')")
    public Result<List<DeptVO>> listDepartments(DeptQuery queryParams) {
        return Result.success(deptService.listDepartments(queryParams));
    }

    @Operation(summary = "部门下拉")
    @GetMapping("/options")
    @PreAuthorize("isAuthenticated()")
    public Result<List<Option<Long>>> listDeptOptions() {
        return Result.success(deptService.listDeptOptions());
    }

    @Operation(summary = "部门表单")
    @GetMapping("/form/{deptId}")
    @PreAuthorize("hasAuthority('system:dept:view')")
    public Result<DeptForm> getDeptForm(@PathVariable Long deptId) {
        return Result.success(deptService.getDeptForm(deptId));
    }

    @Operation(summary = "新增部门")
    @PostMapping
    @PreventDuplicateResubmit
    @PreAuthorize("hasAuthority('system:dept:add')")
    public Result<Long> saveDept(@Valid @RequestBody DeptForm form) {
        return Result.success(deptService.saveDept(form));
    }

    @Operation(summary = "修改部门")
    @PutMapping("/update/{deptId}")
    @PreAuthorize("hasAuthority('system:dept:edit')")
    public Result<Long> updateDept(@PathVariable Long deptId, @Valid @RequestBody DeptForm form) {
        return Result.success(deptService.updateDept(deptId, form));
    }

    @Operation(summary = "删除部门")
    @DeleteMapping("/delete")
    @PreAuthorize("hasAuthority('system:dept:delete')")
    public Result<Void> deleteDepartments(@RequestParam String ids) {
        return Result.judge(deptService.deleteByIds(ids));
    }
}
