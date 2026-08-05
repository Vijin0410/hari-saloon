package com.wangjin.salon.system.service.impl;

import cn.hutool.core.lang.Assert;
import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.wangjin.common.constant.SystemConstants;
import com.wangjin.common.enums.DataScopeEnum;
import com.wangjin.common.security.util.SecurityUtils;
import com.wangjin.common.web.model.Option;
import com.wangjin.salon.system.constant.RoleCodes;
import com.wangjin.salon.system.converter.RoleConverter;
import com.wangjin.salon.system.mapper.SysRoleMapper;
import com.wangjin.salon.system.model.entity.SysRole;
import com.wangjin.salon.system.model.entity.SysRoleMenu;
import com.wangjin.salon.system.model.entity.SysUser;
import com.wangjin.salon.system.model.entity.SysUserRole;
import com.wangjin.salon.system.model.form.RoleForm;
import com.wangjin.salon.system.model.query.RolePageQuery;
import com.wangjin.salon.system.model.vo.RolePageVO;
import com.wangjin.salon.system.service.SysRoleMenuService;
import com.wangjin.salon.system.service.SysRoleService;
import com.wangjin.salon.system.service.SysUserRoleService;
import com.wangjin.salon.system.service.SysUserService;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.List;
import java.util.Set;

@Service
public class SysRoleServiceImpl extends ServiceImpl<SysRoleMapper, SysRole> implements SysRoleService {

    private final SysRoleMenuService roleMenuService;
    private final SysUserRoleService userRoleService;
    private final SysUserService userService;
    private final RoleConverter roleConverter;

    public SysRoleServiceImpl(SysRoleMenuService roleMenuService,
                              SysUserRoleService userRoleService,
                              @Lazy SysUserService userService,
                              RoleConverter roleConverter) {
        this.roleMenuService = roleMenuService;
        this.userRoleService = userRoleService;
        this.userService = userService;
        this.roleConverter = roleConverter;
    }

    @Override
    public Page<RolePageVO> getRolePage(RolePageQuery queryParams) {
        // 非 ROOT 忽略 tenantId：TenantLine 已自动按本租户过滤，防止越权指定它租户
        if (!SecurityUtils.isRoot()) {
            queryParams.setTenantId(null);
        }
        Page<SysRole> page = this.page(
                new Page<>(queryParams.getPageNum(), queryParams.getPageSize()),
                new LambdaQueryWrapper<SysRole>()
                        .and(StrUtil.isNotBlank(queryParams.getKeywords()), w -> w
                                .like(SysRole::getName, queryParams.getKeywords())
                                .or()
                                .like(SysRole::getCode, queryParams.getKeywords()))
                        .eq(queryParams.getTenantId() != null, SysRole::getTenantId, queryParams.getTenantId())
                        .ne(!SecurityUtils.isRoot(), SysRole::getCode, SystemConstants.ROOT_ROLE_CODE)
                        .orderByAsc(SysRole::getSort)
        );
        return roleConverter.entity2Page(page);
    }

    @Override
    public List<Option<Long>> listRoleOptions() {
        List<SysRole> roles = this.list(new LambdaQueryWrapper<SysRole>()
                .ne(!SecurityUtils.isRoot(), SysRole::getCode, SystemConstants.ROOT_ROLE_CODE)
                .eq(SysRole::getStatus, 1)
                .orderByAsc(SysRole::getSort)
                .select(SysRole::getId, SysRole::getName));
        return roleConverter.entities2Options(roles);
    }

    @Override
    public boolean saveRole(RoleForm form) {
        Long roleId = form.getId();
        // ROOT 系统管理员仅由系统种子维护，禁止新增或改名为 ROOT
        Assert.isTrue(!RoleCodes.ROOT.getCode().equalsIgnoreCase(form.getCode()),
                "系统管理员角色由系统维护，不允许新增或修改");
        // 预置角色编码受保护：编辑时不得修改编码
        if (roleId != null) {
            SysRole exist = this.getById(roleId);
            Assert.notNull(exist, "角色不存在");
            Assert.isTrue(!RoleCodes.isPreset(exist.getCode())
                            || exist.getCode().equalsIgnoreCase(form.getCode()),
                    "系统预置角色编码不允许修改");
        }
        // 同租户内编码/名称唯一（TenantLine 自动按当前租户过滤，DB 唯一索引 uk_sys_role_code_tenant 兜底）
        long count = this.count(new LambdaQueryWrapper<SysRole>()
                .ne(roleId != null, SysRole::getId, roleId)
                .and(w -> w.eq(SysRole::getCode, form.getCode()).or().eq(SysRole::getName, form.getName())));
        Assert.isTrue(count == 0, "角色名称或角色编码重复");
        if (DataScopeEnum.CUSTOM.getValue().equals(form.getDataScope())) {
            Assert.isTrue(StrUtil.isNotBlank(form.getDeptIds()), "自定义数据权限部门不能为空");
        }
        SysRole role = roleConverter.form2Entity(form);
        return this.saveOrUpdate(role);
    }

    @Override
    public RoleForm getRoleForm(Long roleId) {
        SysRole entity = this.getById(roleId);
        Assert.notNull(entity, "角色不存在");
        return roleConverter.entity2Form(entity);
    }

    @Override
    public boolean updateRoleStatus(Long roleId, Integer status) {
        return this.update(new LambdaUpdateWrapper<SysRole>()
                .eq(SysRole::getId, roleId)
                .set(SysRole::getStatus, status));
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public boolean deleteRoles(String ids) {
        Assert.isTrue(StrUtil.isNotBlank(ids), "删除数据为空");
        List<Long> roleIds = Arrays.stream(ids.split(",")).map(Long::parseLong).toList();
        for (Long roleId : roleIds) {
            SysRole role = this.getById(roleId);
            if (role != null && SystemConstants.ROOT_ROLE_CODE.equals(role.getCode())) {
                throw new IllegalArgumentException("超级管理员角色不可删除");
            }
            List<Long> userIds = userRoleService.list(new LambdaQueryWrapper<SysUserRole>()
                            .eq(SysUserRole::getRoleId, roleId))
                    .stream().map(SysUserRole::getUserId).toList();
            if (!userIds.isEmpty()) {
                long active = userService.count(new LambdaQueryWrapper<SysUser>()
                        .in(SysUser::getId, userIds));
                Assert.isTrue(active == 0, "角色已分配用户，无法删除");
            }
            roleMenuService.remove(new LambdaQueryWrapper<SysRoleMenu>().eq(SysRoleMenu::getRoleId, roleId));
            userRoleService.remove(new LambdaQueryWrapper<SysUserRole>().eq(SysUserRole::getRoleId, roleId));
        }
        return this.removeByIds(roleIds);
    }

    @Override
    public List<Long> getRoleMenuIds(Long roleId, Integer type) {
        return roleMenuService.listMenuIdsByRoleId(roleId, type);
    }

    @Override
    public boolean updateRoleMenus(Long roleId, Integer type, List<Long> menuIds) {
        return roleMenuService.updateRoleMenus(roleId, type, menuIds);
    }

    @Override
    public Integer getMaxDataRangeDataScope(Set<String> roles) {
        return this.baseMapper.getMaxDataRangeDataScope(roles);
    }
}
