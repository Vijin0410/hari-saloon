package com.wangjin.salon.system.controller;

import com.wangjin.common.result.PageResult;
import com.wangjin.common.result.Result;
import com.wangjin.common.web.annotation.PreventDuplicateResubmit;
import com.wangjin.common.web.annotation.QueryDict;
import com.wangjin.salon.system.model.form.UserForm;
import com.wangjin.salon.system.model.query.UserPageQuery;
import com.wangjin.salon.system.model.vo.UserInfoVO;
import com.wangjin.salon.system.model.vo.UserPageVO;
import com.wangjin.salon.system.service.SysUserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "01.用户接口")
@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
@Validated
public class SysUserController {

    private final SysUserService userService;

    @Operation(summary = "用户分页")
    @GetMapping("/page")
    @QueryDict
    @PreAuthorize("hasAuthority('system:user:list')")
    public PageResult<UserPageVO> getUserPage(UserPageQuery queryParams) {
        var page = userService.getUserPage(queryParams);
        return PageResult.success(page.getRecords(), page.getTotal());
    }

    @Operation(summary = "新增用户")
    @PostMapping
    @PreventDuplicateResubmit
    @PreAuthorize("hasAuthority('system:user:add')")
    public Result<Void> saveUser(@RequestBody @Valid UserForm userForm) {
        return Result.judge(userService.saveUser(userForm));
    }

    @Operation(summary = "用户表单")
    @GetMapping("/form/{userId}")
    @PreAuthorize("hasAuthority('system:user:list')")
    public Result<UserForm> getUserForm(@PathVariable Long userId) {
        return Result.success(userService.getUserFormData(userId));
    }

    @Operation(summary = "修改用户")
    @PutMapping("/update/{userId}")
    @PreAuthorize("hasAuthority('system:user:edit')")
    public Result<Void> updateUser(@PathVariable Long userId, @RequestBody @Valid UserForm userForm) {
        return Result.judge(userService.updateUser(userId, userForm));
    }

    @Operation(summary = "删除用户")
    @DeleteMapping("/delete")
    @PreAuthorize("hasAuthority('system:user:delete')")
    public Result<Void> deleteUsers(@RequestParam String ids) {
        return Result.judge(userService.deleteUsers(ids));
    }

    @Operation(summary = "重置密码（管理员）")
    @PatchMapping("/password/{userId}")
    @PreAuthorize("hasAuthority('system:user:edit')")
    public Result<Void> updatePassword(@PathVariable Long userId, @RequestParam String password) {
        return Result.judge(userService.updatePassword(userId, password));
    }

    @Operation(summary = "修改自己的密码")
    @PatchMapping("/me/password")
    @PreAuthorize("isAuthenticated()")
    public Result<Void> changeOwnPassword(@RequestParam String oldPassword, @RequestParam String newPassword) {
        return Result.judge(userService.changeOwnPassword(oldPassword, newPassword));
    }

    @Operation(summary = "修改状态")
    @PatchMapping("/status/{userId}")
    @PreAuthorize("hasAuthority('system:user:edit')")
    public Result<Void> updateUserStatus(@PathVariable Long userId, @RequestParam Integer status) {
        return Result.judge(userService.updateUserStatus(userId, status));
    }

    @Operation(summary = "当前登录用户")
    @GetMapping("/me")
    @PreAuthorize("isAuthenticated()")
    public Result<UserInfoVO> getUserLoginInfo() {
        return Result.success(userService.getUserLoginInfo());
    }
}
