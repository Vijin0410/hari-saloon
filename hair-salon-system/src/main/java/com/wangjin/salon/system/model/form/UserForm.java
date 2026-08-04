package com.wangjin.salon.system.model.form;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

import java.util.List;

@Schema(description = "用户表单")
@Data
public class UserForm {

    @Schema(description = "用户ID")
    private Long id;

    @Schema(description = "用户名")
    @NotBlank(message = "用户名不能为空")
    private String username;

    @Schema(description = "昵称")
    @NotBlank(message = "昵称不能为空")
    private String nickname;

    @Schema(description = "手机号")
    private String phone;
    @Schema(description = "性别（字典 gender）")
    private Integer gender;
    @Schema(description = "头像（对象键）")
    private String avatar;
    @Schema(description = "邮箱")
    private String email;
    @Schema(description = "状态（1启用 0禁用）")
    private Integer status;

    /** 所属部门（可选；部门为租户内可选组织维度，用户亦可仅绑定门店） */
    @Schema(description = "所属部门ID（可选）")
    private Long deptId;

    @Schema(description = "角色ID集合")
    @NotEmpty(message = "用户角色不能为空")
    private List<Long> roleIds;

    /** 绑定门店（多选，可空；用户可跨多门店） */
    @Schema(description = "绑定门店ID集合（多选，可空）")
    private List<Long> storeIds;
}
