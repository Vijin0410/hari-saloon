package com.wangjin.salon.system.model.form;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.wangjin.salon.system.model.bo.InitialStoreInfo;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Schema(description = "租户表单")
public class TenantForm {

    @Schema(description = "租户ID")
    private Long id;

    @Schema(description = "租户名称")
    @NotBlank(message = "租户名称不能为空")
    private String name;

    @Schema(description = "租户编码")
    @NotBlank(message = "租户编码不能为空")
    private String code;

    @Schema(description = "状态（1启用 0禁用）")
    private Integer status;
    @Schema(description = "联系人")
    private String contact;
    @Schema(description = "联系电话")
    private String phone;

    @Schema(description = "到期时间")
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime expireTime;

    @Schema(description = "备注")
    private String remark;

    /** 开通时管理员登录名；空则默认 admin */
    @Schema(description = "管理员用户名（仅新增）")
    private String adminUsername;

    /** 开通时管理员昵称；空则用联系人或租户名 */
    @Schema(description = "管理员昵称（仅新增）")
    private String adminNickname;

    /** 开通时管理员初始密码；空则用系统默认密码 */
    @Schema(description = "管理员初始密码（仅新增，不回显）")
    private String adminPassword;

    /** 开通时联合创建的初始门店（可选；为 null 或 name 空白则不建门店，仅新增生效，编辑不回显） */
    @Schema(description = "开通时联合创建的初始门店（可选，仅新增）")
    private InitialStoreInfo store;

    /** 开通时同步的通用数据模块（仅新增；可选值 memberLevel/memberTag；空则默认全部） */
    @Schema(description = "开通时同步的通用数据模块（仅新增；memberLevel/memberTag，空则默认全部）")
    private java.util.List<String> syncModules;

    /** 开通时同步的字典类型编码（仅新增；从默认租户复制勾选类型的字典值；空则不同步字典） */
    @Schema(description = "开通时同步的字典类型编码（仅新增；从默认租户复制勾选类型，空则不同步字典）")
    private java.util.List<String> syncDictTypes;
}
