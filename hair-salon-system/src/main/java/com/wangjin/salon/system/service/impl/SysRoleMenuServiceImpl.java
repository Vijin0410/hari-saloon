package com.wangjin.salon.system.service.impl;

import cn.hutool.core.collection.CollUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.wangjin.salon.system.mapper.SysRoleMenuMapper;
import com.wangjin.salon.system.model.entity.SysRoleMenu;
import com.wangjin.salon.system.service.SysRoleMenuService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class SysRoleMenuServiceImpl extends ServiceImpl<SysRoleMenuMapper, SysRoleMenu>
        implements SysRoleMenuService {

    @Override
    public List<Long> listMenuIdsByRoleId(Long roleId, Integer type) {
        return this.baseMapper.listMenuIdsByRoleId(roleId, type);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public boolean updateRoleMenus(Long roleId, Integer type, List<Long> menuIds) {
        this.remove(new LambdaQueryWrapper<SysRoleMenu>()
                .eq(SysRoleMenu::getRoleId, roleId)
                .eq(SysRoleMenu::getType, type));
        if (CollUtil.isEmpty(menuIds)) {
            return true;
        }
        List<SysRoleMenu> list = menuIds.stream()
                .map(menuId -> new SysRoleMenu(roleId, menuId, type))
                .toList();
        return this.saveBatch(list);
    }
}
