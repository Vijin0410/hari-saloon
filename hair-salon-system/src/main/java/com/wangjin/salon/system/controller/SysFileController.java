package com.wangjin.salon.system.controller;

import com.wangjin.common.result.PageResult;
import com.wangjin.common.result.Result;
import com.wangjin.common.web.annotation.PreventDuplicateResubmit;
import com.wangjin.salon.system.model.query.SysFilePageQuery;
import com.wangjin.salon.system.model.vo.SysFilePageVO;
import com.wangjin.salon.system.model.vo.SysFileVO;
import com.wangjin.salon.system.service.SysFileService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.Arrays;
import java.util.List;

/**
 * 通用文件上传（MinIO + 元数据落库 sys_file）。
 * <p>
 * 上传后落 sys_file，业务表存 object_key 软关联；列表/访问走 @DataPermission / 归属校验。
 * 当前仅要求登录；后续若要按钮级权限可改为 hasAuthority('system:file:upload') 并补菜单种子。
 */
@Tag(name = "00.文件上传")
@RestController
@RequestMapping("/api/v1/files")
@RequiredArgsConstructor
@Validated
public class SysFileController {

    private final SysFileService sysFileService;

    @Operation(summary = "上传单个文件")
    @PostMapping("/upload")
    @PreventDuplicateResubmit
    @PreAuthorize("isAuthenticated()")
    public Result<SysFileVO> upload(
            @Parameter(description = "文件") @RequestParam("file") MultipartFile file,
            @Parameter(description = "业务目录，如 avatar/logo/product") @RequestParam(value = "biz", required = false, defaultValue = "common") String biz,
            @Parameter(description = "关联业务ID") @RequestParam(value = "bizId", required = false) Long bizId,
            @Parameter(description = "是否公开：0=私有 1=公开，默认0") @RequestParam(value = "isPublic", required = false, defaultValue = "0") Integer isPublic) {
        return Result.success(sysFileService.uploadAndSave(file, biz, bizId, isPublic));
    }

    @Operation(summary = "批量上传文件")
    @PostMapping("/upload/batch")
    @PreventDuplicateResubmit
    @PreAuthorize("isAuthenticated()")
    public Result<List<SysFileVO>> uploadBatch(
            @Parameter(description = "文件数组") @RequestParam("file") MultipartFile[] files,
            @Parameter(description = "业务目录") @RequestParam(value = "biz", required = false, defaultValue = "common") String biz,
            @Parameter(description = "关联业务ID") @RequestParam(value = "bizId", required = false) Long bizId,
            @Parameter(description = "是否公开：0=私有 1=公开，默认0") @RequestParam(value = "isPublic", required = false, defaultValue = "0") Integer isPublic) {
        return Result.success(sysFileService.uploadAndSaveBatch(files, biz, bizId, isPublic));
    }

    @Operation(summary = "删除文件（按ID，联动MinIO，限本人/管理员）")
    @DeleteMapping("/delete/{id}")
    @PreAuthorize("isAuthenticated()")
    public Result<Boolean> delete(@Parameter(description = "文件ID") @PathVariable Long id) {
        return Result.success(sysFileService.delete(id));
    }

    @Operation(summary = "批量删除文件")
    @DeleteMapping("/delete/batch")
    @PreAuthorize("isAuthenticated()")
    public Result<Boolean> deleteBatch(@Parameter(description = "文件ID，多个逗号分隔") @RequestParam("ids") String ids) {
        List<Long> idList = Arrays.stream(ids.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .map(Long::parseLong)
                .toList();
        return Result.success(sysFileService.deleteByIds(idList));
    }

    @Operation(summary = "获取可访问URL（私有桶统一预签名：公开不校验归属，私有校验归属）")
    @GetMapping("/url/{id}")
    @PreAuthorize("isAuthenticated()")
    public Result<String> accessibleUrl(@Parameter(description = "文件ID") @PathVariable Long id) {
        return Result.success(sysFileService.getAccessibleUrl(id));
    }

    @Operation(summary = "按objectKey取可访问URL（公开=预签名；私有=校验归属+预签名）")
    @GetMapping("/url")
    @PreAuthorize("isAuthenticated()")
    public Result<String> accessibleUrlByKey(@Parameter(description = "对象键") @RequestParam("objectKey") String objectKey) {
        return Result.success(sysFileService.getAccessibleUrlByKey(objectKey));
    }

    @Operation(summary = "文件分页列表（按数据权限过滤）")
    @GetMapping("/page")
    @PreAuthorize("isAuthenticated()")
    public PageResult<SysFilePageVO> getFilePage(@ParameterObject SysFilePageQuery query) {
        var page = sysFileService.getFilePage(query);
        return PageResult.success(page.getRecords(), page.getTotal());
    }
}
