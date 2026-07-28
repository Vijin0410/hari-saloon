package com.wangjin.salon.system.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.wangjin.common.web.model.Option;
import com.wangjin.salon.system.model.entity.SysMenu;
import com.wangjin.salon.system.model.form.MenuForm;
import com.wangjin.salon.system.model.query.MenuQuery;
import com.wangjin.salon.system.model.vo.MenuVO;
import com.wangjin.salon.system.model.vo.RouteVO;

import java.util.List;
import java.util.Set;

public interface SysMenuService extends IService<SysMenu> {

    List<MenuVO> listMenus(MenuQuery queryParams);

    List<Option<Long>> listMenuOptions(String menuType);

    List<RouteVO> listRoutes();

    MenuForm getMenuForm(Long id);

    boolean saveMenu(MenuForm form);

    void deleteMenu(List<Long> ids);

    Set<String> listRolePerms(Set<String> roles);
}
