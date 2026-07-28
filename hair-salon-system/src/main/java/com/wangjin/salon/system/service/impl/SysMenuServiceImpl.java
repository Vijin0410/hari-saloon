package com.wangjin.salon.system.service.impl;

import cn.hutool.core.collection.CollUtil;
import cn.hutool.core.lang.Assert;
import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.wangjin.common.constant.SystemConstants;
import com.wangjin.common.enums.MenuTypeEnum;
import com.wangjin.common.web.model.Option;
import com.wangjin.salon.system.converter.MenuConverter;
import com.wangjin.salon.system.mapper.SysMenuMapper;
import com.wangjin.salon.system.model.bo.RouteBO;
import com.wangjin.salon.system.model.entity.SysMenu;
import com.wangjin.salon.system.model.form.MenuForm;
import com.wangjin.salon.system.model.query.MenuQuery;
import com.wangjin.salon.system.model.vo.MenuVO;
import com.wangjin.salon.system.model.vo.Meta;
import com.wangjin.salon.system.model.vo.RouteVO;
import com.wangjin.salon.system.service.SysMenuService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class SysMenuServiceImpl extends ServiceImpl<SysMenuMapper, SysMenu> implements SysMenuService {

    private final MenuConverter menuConverter;

    public SysMenuServiceImpl(MenuConverter menuConverter) {
        this.menuConverter = menuConverter;
    }

    @Override
    public List<MenuVO> listMenus(MenuQuery queryParams) {
        List<SysMenu> menus = this.list(new LambdaQueryWrapper<SysMenu>()
                .like(StrUtil.isNotBlank(queryParams.getKeywords()), SysMenu::getName, queryParams.getKeywords()));
        Set<Long> parentIds = menus.stream().map(SysMenu::getParentId).collect(Collectors.toSet());
        Set<Long> menuIds = menus.stream().map(SysMenu::getId).collect(Collectors.toSet());
        List<Long> rootIds = parentIds.stream().filter(id -> !menuIds.contains(id)).toList();
        return rootIds.stream().flatMap(rootId -> buildMenuTree(rootId, menus).stream()).toList();
    }

    @Override
    public List<Option<Long>> listMenuOptions(String menuType) {
        LambdaQueryWrapper<SysMenu> wrapper = new LambdaQueryWrapper<>();
        if (StrUtil.isNotBlank(menuType)) {
            List<Integer> types = Arrays.stream(menuType.split(",")).map(Integer::parseInt).toList();
            wrapper.in(SysMenu::getType, types);
        }
        List<SysMenu> menuList = this.list(wrapper);
        return buildMenuOptions(SystemConstants.ROOT_NODE_ID, menuList);
    }

    @Override
    public List<RouteVO> listRoutes() {
        List<RouteBO> menuList = this.baseMapper.listRoutes();
        return buildRoutes(SystemConstants.ROOT_NODE_ID, menuList);
    }

    @Override
    public MenuForm getMenuForm(Long id) {
        SysMenu entity = this.getById(id);
        Assert.notNull(entity, "菜单不存在");
        return menuConverter.entity2Form(entity);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public boolean saveMenu(MenuForm form) {
        MenuTypeEnum menuType = form.getType();
        if (menuType == MenuTypeEnum.CATALOG) {
            Long parentId = Optional.ofNullable(form.getParentId()).orElse(0L);
            if (parentId == 0L && StrUtil.isNotBlank(form.getPath()) && !form.getPath().startsWith("/")) {
                form.setPath("/" + form.getPath());
            }
            form.setComponent("Layout");
        } else if (menuType == MenuTypeEnum.EXTLINK) {
            form.setComponent(null);
        }
        SysMenu entity = menuConverter.form2Entity(form);
        entity.setTreePath(generateMenuTreePath(form.getParentId()));
        return this.saveOrUpdate(entity);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void deleteMenu(List<Long> ids) {
        if (CollUtil.isEmpty(ids)) {
            return;
        }
        List<Long> toDelete = new ArrayList<>(ids);
        for (Long id : ids) {
            List<SysMenu> children = this.list(new LambdaQueryWrapper<SysMenu>()
                    .apply("tree_path LIKE CONCAT('%,', {0}, ',%') OR tree_path LIKE CONCAT({0}, ',%') OR tree_path LIKE CONCAT('%,', {0})", id));
            toDelete.addAll(children.stream().map(SysMenu::getId).toList());
        }
        this.removeByIds(toDelete.stream().distinct().toList());
    }

    @Override
    public Set<String> listRolePerms(Set<String> roles) {
        if (CollUtil.isEmpty(roles)) {
            return Collections.emptySet();
        }
        Set<String> perms = this.baseMapper.listRolePerms(roles);
        return perms == null ? Collections.emptySet() : perms;
    }

    private String generateMenuTreePath(Long parentId) {
        if (parentId == null || SystemConstants.ROOT_NODE_ID.equals(parentId)) {
            return String.valueOf(SystemConstants.ROOT_NODE_ID);
        }
        SysMenu parent = this.getById(parentId);
        return parent != null ? parent.getTreePath() + "," + parent.getId() : String.valueOf(SystemConstants.ROOT_NODE_ID);
    }

    private List<MenuVO> buildMenuTree(Long parentId, List<SysMenu> menuList) {
        return menuList.stream()
                .filter(m -> Objects.equals(m.getParentId(), parentId))
                .map(entity -> {
                    MenuVO vo = menuConverter.entity2Vo(entity);
                    vo.setChildren(buildMenuTree(entity.getId(), menuList));
                    return vo;
                }).toList();
    }

    private List<Option<Long>> buildMenuOptions(Long parentId, List<SysMenu> menuList) {
        List<Option<Long>> options = new ArrayList<>();
        for (SysMenu menu : menuList) {
            if (Objects.equals(menu.getParentId(), parentId)) {
                String label = Optional.ofNullable(menu.getMeta()).map(Meta::getTitle).orElse(menu.getName());
                Option<Long> option = new Option<>(menu.getId(), label);
                List<Option<Long>> children = buildMenuOptions(menu.getId(), menuList);
                if (CollUtil.isNotEmpty(children)) {
                    option.setChildren(children);
                }
                options.add(option);
            }
        }
        return options;
    }

    private List<RouteVO> buildRoutes(Long parentId, List<RouteBO> menuList) {
        List<RouteVO> routeList = new ArrayList<>();
        for (RouteBO menu : menuList) {
            if (Objects.equals(menu.getParentId(), parentId)) {
                RouteVO routeVO = new RouteVO();
                routeVO.setName(StrUtil.toCamelCase(menu.getName()));
                routeVO.setPath(menu.getPath());
                routeVO.setRedirect(menu.getRedirect());
                routeVO.setComponent(menu.getComponent());
                Meta meta = menu.getMeta() == null ? new Meta() : menu.getMeta();
                meta.setRoles(menu.getRoles());
                routeVO.setMeta(meta);
                List<RouteVO> children = buildRoutes(menu.getId(), menuList);
                if (CollUtil.isNotEmpty(children)) {
                    routeVO.setChildren(children);
                }
                routeList.add(routeVO);
            }
        }
        return routeList;
    }
}
