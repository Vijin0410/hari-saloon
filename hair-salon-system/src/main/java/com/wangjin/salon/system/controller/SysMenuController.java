package com.wangjin.salon.system.controller;

import com.wangjin.common.result.Result;
import com.wangjin.common.web.annotation.PreventDuplicateResubmit;
import com.wangjin.common.web.model.Option;
import com.wangjin.salon.system.model.form.MenuForm;
import com.wangjin.salon.system.model.query.MenuQuery;
import com.wangjin.salon.system.model.vo.MenuVO;
import com.wangjin.salon.system.model.vo.RouteVO;
import com.wangjin.salon.system.service.SysMenuService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
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

import java.util.Arrays;
import java.util.List;

@Tag(name = "03.菜单接口")
@RestController
@RequestMapping("/api/v1/menus")
@RequiredArgsConstructor
public class SysMenuController {

    private final SysMenuService menuService;

    @Operation(summary = "菜单树")
    @GetMapping
    public Result<List<MenuVO>> listMenus(MenuQuery queryParams) {
        return Result.success(menuService.listMenus(queryParams));
    }

    @Operation(summary = "菜单下拉")
    @GetMapping("/options")
    public Result<List<Option<Long>>> listMenuOptions(@RequestParam(required = false) String menuType) {
        return Result.success(menuService.listMenuOptions(menuType));
    }

    @Operation(summary = "路由列表")
    @GetMapping("/routes")
    public Result<List<RouteVO>> listRoutes() {
        return Result.success(menuService.listRoutes());
    }

    @Operation(summary = "菜单表单")
    @GetMapping("/{id}/form")
    public Result<MenuForm> getMenuForm(@PathVariable Long id) {
        return Result.success(menuService.getMenuForm(id));
    }

    @Operation(summary = "新增菜单")
    @PostMapping
    @PreventDuplicateResubmit
    public Result<Void> addMenu(@RequestBody MenuForm menuForm) {
        return Result.judge(menuService.saveMenu(menuForm));
    }

    @Operation(summary = "修改菜单")
    @PutMapping("/{id}")
    public Result<Void> updateMenu(@PathVariable Long id, @RequestBody MenuForm menuForm) {
        menuForm.setId(id);
        return Result.judge(menuService.saveMenu(menuForm));
    }

    @Operation(summary = "删除菜单")
    @DeleteMapping
    public Result<Void> deleteMenu(@RequestParam String ids) {
        menuService.deleteMenu(Arrays.stream(ids.split(",")).map(Long::parseLong).toList());
        return Result.success();
    }
}
