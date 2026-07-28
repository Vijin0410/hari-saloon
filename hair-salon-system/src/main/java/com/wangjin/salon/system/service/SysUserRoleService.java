package com.wangjin.salon.system.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.wangjin.salon.system.model.entity.SysUserRole;

import java.util.List;

public interface SysUserRoleService extends IService<SysUserRole> {

    /**
     * 覆盖保存用户角色。
     */
    void saveUserRoles(Long userId, List<Long> roleIds);

    List<Long> listRoleIdsByUserId(Long userId);
}
