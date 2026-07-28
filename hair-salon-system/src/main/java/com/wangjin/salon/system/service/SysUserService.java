package com.wangjin.salon.system.service;

import com.wangjin.salon.system.model.entity.SysUser;

/**
 * 系统用户服务。
 */
public interface SysUserService {

    SysUser getByUsername(String username);

    SysUser getById(Long id);
}
