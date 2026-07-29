package com.wangjin.salon.system.model.entity;

import com.baomidou.mybatisplus.annotation.TableName;
import com.wangjin.common.base.BaseTenantEntity;
import lombok.Data;
import lombok.EqualsAndHashCode;

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
     * 是否须首次/重置后改密：1 是 / 0 否。
     */
    private Integer pwdResetRequired;
}
