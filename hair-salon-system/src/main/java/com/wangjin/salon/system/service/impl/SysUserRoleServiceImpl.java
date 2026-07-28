package com.wangjin.salon.system.service.impl;

import cn.hutool.core.collection.CollUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.wangjin.salon.system.mapper.SysUserRoleMapper;
import com.wangjin.salon.system.model.entity.SysUserRole;
import com.wangjin.salon.system.service.SysUserRoleService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class SysUserRoleServiceImpl extends ServiceImpl<SysUserRoleMapper, SysUserRole>
        implements SysUserRoleService {

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void saveUserRoles(Long userId, List<Long> roleIds) {
        this.remove(new LambdaQueryWrapper<SysUserRole>().eq(SysUserRole::getUserId, userId));
        if (CollUtil.isEmpty(roleIds)) {
            return;
        }
        List<SysUserRole> list = roleIds.stream()
                .map(roleId -> new SysUserRole(userId, roleId))
                .toList();
        this.saveBatch(list);
    }

    @Override
    public List<Long> listRoleIdsByUserId(Long userId) {
        return this.baseMapper.listRoleIdsByUserId(userId);
    }
}
