package com.wangjin.salon.system.service.impl;

import cn.hutool.core.collection.CollUtil;
import cn.hutool.core.lang.Assert;
import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.wangjin.common.constant.SystemConstants;
import com.wangjin.common.enums.MenuTypeEnum;
import com.wangjin.common.security.util.SecurityUtils;
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
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class SysMenuServiceImpl extends ServiceImpl<SysMenuMapper, SysMenu> implements SysMenuService {

    private static final int DEFAULT_RANK = 999;

    private final MenuConverter menuConverter;

    public SysMenuServiceImpl(MenuConverter menuConverter) {
        this.menuConverter = menuConverter;
    }

    @Override
    public List<MenuVO> listMenus(MenuQuery queryParams) {
        List<SysMenu> menus = this.list(new LambdaQueryWrapper<SysMenu>()
                .like(StrUtil.isNotBlank(queryParams.getKeywords()), SysMenu::getName, queryParams.getKeywords())
                .like(StrUtil.isNotBlank(queryParams.getPath()), SysMenu::getPath, queryParams.getPath())
                .like(StrUtil.isNotBlank(queryParams.getPerm()), SysMenu::getPerm, queryParams.getPerm()));
        menus.sort(Comparator.comparingInt(this::getMenuRank).thenComparing(SysMenu::getId));

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
        menuList.sort(Comparator.comparingInt(this::getMenuRank).thenComparing(SysMenu::getId));
        return buildMenuOptions(SystemConstants.ROOT_NODE_ID, menuList);
    }

    @Override
    public List<RouteVO> listRoutes() {
        List<RouteBO> menuList = this.baseMapper.listRoutes();
        menuList.sort(Comparator.comparingInt(this::getRouteRank).thenComparing(RouteBO::getId));
        return buildRoutes(SystemConstants.ROOT_NODE_ID, menuList, SecurityUtils.getPermissions(), SecurityUtils.isRoot());
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
        Long parentId = Optional.ofNullable(form.getParentId()).orElse(SystemConstants.ROOT_NODE_ID);
        form.setParentId(parentId);

        SysMenu exist = form.getId() == null ? null : this.getById(form.getId());
        if (form.getId() != null) {
            Assert.notNull(exist, "菜单不存在");
            Assert.isFalse(Objects.equals(form.getId(), parentId), "上级菜单不能选择自身");
            assertNotChildParent(form.getId(), parentId);
        }

        MenuTypeEnum menuType = form.getType();
        if (menuType == MenuTypeEnum.CATALOG) {
            if (SystemConstants.ROOT_NODE_ID.equals(parentId)
                    && StrUtil.isNotBlank(form.getPath())
                    && !form.getPath().startsWith("/")) {
                form.setPath("/" + form.getPath());
            }
            form.setComponent("Layout");
        } else if (menuType == MenuTypeEnum.EXTLINK) {
            form.setComponent(null);
        }
        SysMenu entity = menuConverter.form2Entity(form);
        String oldTreePath = exist == null ? null : exist.getTreePath();
        String newTreePath = generateMenuTreePath(parentId);
        entity.setParentId(parentId);
        entity.setTreePath(newTreePath);
        boolean saved = this.saveOrUpdate(entity);
        if (saved && exist != null && !Objects.equals(oldTreePath, newTreePath)) {
            refreshChildrenTreePath(entity.getId(), oldTreePath, newTreePath);
        }
        return saved;
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
        Assert.notNull(parent, "父菜单不存在");
        return parent.getTreePath() + "," + parent.getId();
    }

    private void assertNotChildParent(Long menuId, Long parentId) {
        if (parentId == null || SystemConstants.ROOT_NODE_ID.equals(parentId)) {
            return;
        }
        SysMenu parent = this.getById(parentId);
        Assert.notNull(parent, "父菜单不存在");
        boolean child = Arrays.stream(StrUtil.nullToEmpty(parent.getTreePath()).split(","))
                .filter(StrUtil::isNotBlank)
                .map(Long::parseLong)
                .anyMatch(menuId::equals);
        Assert.isFalse(child, "上级菜单不能选择自身的下级");
    }

    private void refreshChildrenTreePath(Long menuId, String oldTreePath, String newTreePath) {
        if (StrUtil.isBlank(oldTreePath)) {
            return;
        }
        String oldPrefix = oldTreePath + "," + menuId;
        String newPrefix = newTreePath + "," + menuId;
        List<SysMenu> children = this.list(new LambdaQueryWrapper<SysMenu>()
                .eq(SysMenu::getTreePath, oldPrefix)
                .or()
                .likeRight(SysMenu::getTreePath, oldPrefix + ","));
        for (SysMenu child : children) {
            child.setTreePath(newPrefix + child.getTreePath().substring(oldPrefix.length()));
            this.updateById(child);
        }
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

    private List<RouteVO> buildRoutes(Long parentId, List<RouteBO> menuList, Set<String> permissions, boolean root) {
        List<RouteVO> routeList = new ArrayList<>();
        for (RouteBO menu : menuList) {
            if (Objects.equals(menu.getParentId(), parentId)) {
                List<RouteVO> children = buildRoutes(menu.getId(), menuList, permissions, root);
                boolean hasChildren = CollUtil.isNotEmpty(children);
                if (!root && !hasRoutePermission(menu, permissions) && !hasChildren) {
                    continue;
                }
                if (MenuTypeEnum.CATALOG == menu.getType() && !hasChildren) {
                    continue;
                }
                RouteVO routeVO = new RouteVO();
                routeVO.setName(StrUtil.toCamelCase(menu.getName()));
                routeVO.setType(menu.getType());
                routeVO.setPath(menu.getPath());
                routeVO.setRedirect(menu.getRedirect());
                routeVO.setComponent(menu.getComponent());
                Meta meta = menu.getMeta() == null ? new Meta() : menu.getMeta();
                meta.setRoles(menu.getRoles());
                routeVO.setMeta(meta);
                routeVO.setPerm(menu.getPerm());
                if (CollUtil.isNotEmpty(children)) {
                    routeVO.setChildren(children);
                }
                routeList.add(routeVO);
            }
        }
        return routeList;
    }

    private int getMenuRank(SysMenu menu) {
        return Optional.ofNullable(menu)
                .map(SysMenu::getMeta)
                .map(Meta::getRank)
                .orElse(DEFAULT_RANK);
    }

    private int getRouteRank(RouteBO route) {
        return Optional.ofNullable(route)
                .map(RouteBO::getMeta)
                .map(Meta::getRank)
                .orElse(DEFAULT_RANK);
    }

    private boolean hasRoutePermission(RouteBO menu, Set<String> permissions) {
        return StrUtil.isBlank(menu.getPerm()) || permissions.contains(menu.getPerm());
    }
}
