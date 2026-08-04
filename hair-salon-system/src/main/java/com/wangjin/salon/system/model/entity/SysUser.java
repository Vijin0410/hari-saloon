package com.wangjin.salon.system.model.entity;

import com.baomidou.mybatisplus.annotation.FieldStrategy;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;
import com.wangjin.common.base.BaseTenantEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

import java.time.LocalDateTime;

/**
 * 系统用户。
 */
@Data
@EqualsAndHashCode(callSuper = true)
@TableName("sys_user")
public class SysUser extends BaseTenantEntity<Long> {

    /** 用户名（登录账号） */
    private String username;
    /** 密码（加密存储） */
    private String password;
    /** 昵称（显示名称） */
    private String nickname;
    /** 性别（字典 gender） */
    private Integer gender;
    /** 头像（MinIO 对象键） */
    @TableField(updateStrategy = FieldStrategy.ALWAYS)
    private String avatar;
    /** 手机号（兼容原 phone 字段语义） */
    @TableField(updateStrategy = FieldStrategy.ALWAYS)
    private String phone;
    /** 邮箱 */
    @TableField(updateStrategy = FieldStrategy.ALWAYS)
    private String email;
    /** 状态：1启用 0禁用 */
    private Integer status;
    /** 所属部门ID（可空） */
    @TableField(updateStrategy = FieldStrategy.ALWAYS)
    private Long deptId;
    /**
     * 最近一次用户自行改密时间。
     * null = 从未改过（新建/管理员重置后）→ 首次登录强制改密；
     * 非 null 且距今超过 password-expire-days → 强制改密。
     */
    private LocalDateTime lastPasswordChangeTime;
}
