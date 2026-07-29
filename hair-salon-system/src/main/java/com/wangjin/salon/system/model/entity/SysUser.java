package com.wangjin.salon.system.model.entity;

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

    private String username;
    private String password;
    private String nickname;
    private Integer gender;
    private String avatar;
    /** 手机号（兼容原 phone 字段语义） */
    private String phone;
    private String email;
    private Integer status;
    private Long deptId;
    /**
     * 最近一次用户自行改密时间。
     * null = 从未改过（新建/管理员重置后）→ 首次登录强制改密；
     * 非 null 且距今超过 password-expire-days → 强制改密。
     */
    private LocalDateTime lastPasswordChangeTime;
}
