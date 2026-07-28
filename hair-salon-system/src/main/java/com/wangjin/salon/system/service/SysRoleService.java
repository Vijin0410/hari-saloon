package com.wangjin.salon.system.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.IService;
import com.wangjin.common.web.model.Option;
import com.wangjin.salon.system.model.entity.SysRole;
import com.wangjin.salon.system.model.form.RoleForm;
import com.wangjin.salon.system.model.query.RolePageQuery;
import com.wangjin.salon.system.model.vo.RolePageVO;

import java.util.List;
import java.util.Set;

public interface SysRoleService extends IService<SysRole> {

    Page<RolePageVO> getRolePage(RolePageQuery queryParams);

    List<Option<Long>> listRoleOptions();

    boolean saveRole(RoleForm form);

    RoleForm getRoleForm(Long roleId);

    boolean updateRoleStatus(Long roleId, Integer status);

    boolean deleteRoles(String ids);

    List<Long> getRoleMenuIds(Long roleId, Integer type);

    boolean updateRoleMenus(Long roleId, Integer type, List<Long> menuIds);

    Integer getMaxDataRangeDataScope(Set<String> roles);
}
