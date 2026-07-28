package com.wangjin.salon.system.controller;

import com.wangjin.common.result.PageResult;
import com.wangjin.common.result.Result;
import com.wangjin.common.web.annotation.PreventDuplicateResubmit;
import com.wangjin.common.web.model.Option;
import com.wangjin.salon.system.model.form.RoleForm;
import com.wangjin.salon.system.model.query.RolePageQuery;
import com.wangjin.salon.system.model.vo.RolePageVO;
import com.wangjin.salon.system.service.SysRoleService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
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

@Tag(name = "02.角色接口")
@RestController
@RequestMapping("/api/v1/roles")
@RequiredArgsConstructor
public class SysRoleController {

    private final SysRoleService roleService;

    @Operation(summary = "角色分页")
    @GetMapping("/page")
    public PageResult<RolePageVO> getRolePage(RolePageQuery queryParams) {
        var page = roleService.getRolePage(queryParams);
        return PageResult.success(page.getRecords(), page.getTotal());
    }

    @Operation(summary = "角色下拉")
    @GetMapping("/options")
    public Result<List<Option<Long>>> listRoleOptions() {
        return Result.success(roleService.listRoleOptions());
    }

    @Operation(summary = "新增角色")
    @PostMapping
    @PreventDuplicateResubmit
    public Result<Void> addRole(@Valid @RequestBody RoleForm roleForm) {
        return Result.judge(roleService.saveRole(roleForm));
    }

    @Operation(summary = "角色表单")
    @GetMapping("/{roleId}/form")
    public Result<RoleForm> getRoleForm(@PathVariable Long roleId) {
        return Result.success(roleService.getRoleForm(roleId));
    }

    @Operation(summary = "修改角色")
    @PutMapping("/{id}")
    public Result<Void> updateRole(@PathVariable Long id, @Valid @RequestBody RoleForm roleForm) {
        roleForm.setId(id);
        return Result.judge(roleService.saveRole(roleForm));
    }

    @Operation(summary = "删除角色")
    @DeleteMapping
    public Result<Void> deleteRoles(@RequestParam String ids) {
        return Result.judge(roleService.deleteRoles(ids));
    }

    @Operation(summary = "修改角色状态")
    @PutMapping("/{roleId}/status")
    public Result<Void> updateRoleStatus(@PathVariable Long roleId, @RequestParam Integer status) {
        return Result.judge(roleService.updateRoleStatus(roleId, status));
    }

    @Operation(summary = "角色菜单 ID 集合")
    @GetMapping("/{roleId}/{type}/menuIds")
    public Result<List<Long>> getRoleMenuIds(@PathVariable Long roleId, @PathVariable Integer type) {
        return Result.success(roleService.getRoleMenuIds(roleId, type));
    }

    @Operation(summary = "分配菜单权限")
    @PutMapping("/{roleId}/{type}/menus")
    public Result<Void> updateRoleMenus(@PathVariable Long roleId,
                                        @PathVariable Integer type,
                                        @RequestBody List<Long> menuIds) {
        return Result.judge(roleService.updateRoleMenus(roleId, type, menuIds));
    }
}
