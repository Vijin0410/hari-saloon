package com.wangjin.salon.system.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.wangjin.salon.system.model.entity.SysRoleMenu;

import java.util.List;

public interface SysRoleMenuService extends IService<SysRoleMenu> {

    List<Long> listMenuIdsByRoleId(Long roleId, Integer type);

    boolean updateRoleMenus(Long roleId, Integer type, List<Long> menuIds);
}
