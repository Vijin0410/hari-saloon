package com.wangjin.salon.system.service.impl;

import cn.hutool.core.collection.CollUtil;
import cn.hutool.core.lang.Assert;
import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.wangjin.common.constant.GlobalConstants;
import com.wangjin.common.constant.SystemConstants;
import com.wangjin.common.enums.DataScopeEnum;
import com.wangjin.common.exception.BizException;
import com.wangjin.common.minio.service.MinioService;
import com.wangjin.common.result.ResultCode;
import com.wangjin.common.security.context.UserContext;
import com.wangjin.common.security.util.SecurityUtils;
import com.wangjin.salon.system.cache.SystemCacheService;
import com.wangjin.salon.system.config.SalonProperties;
import com.wangjin.salon.system.converter.UserConverter;
import com.wangjin.salon.system.mapper.SysUserMapper;
import com.wangjin.salon.system.model.bo.UserBO;
import com.wangjin.salon.system.model.dto.UserAuthInfo;
import com.wangjin.salon.system.model.entity.SysDept;
import com.wangjin.salon.system.model.entity.SysRole;
import com.wangjin.salon.system.model.entity.SysUser;
import com.wangjin.salon.system.model.entity.SysUserRole;
import com.wangjin.salon.system.model.form.UserForm;
import com.wangjin.salon.system.model.query.UserPageQuery;
import com.wangjin.salon.system.model.vo.UserInfoVO;
import com.wangjin.salon.system.model.vo.UserPageVO;
import com.wangjin.salon.system.service.SysDeptService;
import com.wangjin.salon.system.service.SysMenuService;
import com.wangjin.salon.system.service.SysRoleService;
import com.wangjin.salon.system.service.SysUserRoleService;
import com.wangjin.salon.system.service.SysUserService;
import com.wangjin.salon.system.util.TenantContextRunner;
import org.springframework.context.annotation.Lazy;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class SysUserServiceImpl extends ServiceImpl<SysUserMapper, SysUser> implements SysUserService {

    private final PasswordEncoder passwordEncoder;
    private final SysUserRoleService userRoleService;
    private final SysMenuService menuService;
    private final SysRoleService roleService;
    private final SysDeptService deptService;
    private final SystemCacheService systemCacheService;
    private final UserConverter userConverter;
    private final SalonProperties salonProperties;
    private final MinioService minioService;

    public SysUserServiceImpl(PasswordEncoder passwordEncoder,
                              SysUserRoleService userRoleService,
                              SysMenuService menuService,
                              SysRoleService roleService,
                              SysDeptService deptService,
                              @Lazy SystemCacheService systemCacheService,
                              UserConverter userConverter,
                              SalonProperties salonProperties,
                              MinioService minioService) {
        this.passwordEncoder = passwordEncoder;
        this.userRoleService = userRoleService;
        this.menuService = menuService;
        this.roleService = roleService;
        this.deptService = deptService;
        this.systemCacheService = systemCacheService;
        this.userConverter = userConverter;
        this.salonProperties = salonProperties;
        this.minioService = minioService;
    }

    @Override
    public SysUser getByUsername(String username) {
        return this.getOne(new LambdaQueryWrapper<SysUser>()
                .eq(SysUser::getUsername, username)
                .last("LIMIT 1"));
    }

    @Override
    public IPage<UserPageVO> getUserPage(UserPageQuery queryParams) {
        Page<UserBO> page = this.baseMapper.getUserPage(
                new Page<>(queryParams.getPageNum(), queryParams.getPageSize()), queryParams);
        Page<UserPageVO> voPage = userConverter.bo2Vo(page);
        // avatar 存 object_key，私有桶下展示须转预签名 URL
        for (UserPageVO vo : voPage.getRecords()) {
            vo.setAvatar(presignUrl(vo.getAvatar()));
        }
        return voPage;
    }

    /** 文件字段存 object_key，转预签名 URL 供展示；空或签名失败返回 null。 */
    private String presignUrl(String objectKey) {
        if (StrUtil.isBlank(objectKey)) {
            return null;
        }
        try {
            return minioService.getPresignedUrl(objectKey, 0);
        } catch (Exception e) {
            return null;
        }
    }

    @Override
    public UserForm getUserFormData(Long userId) {
        UserForm form = this.baseMapper.getUserDetail(userId);
        Assert.notNull(form, "用户不存在");
        return form;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public boolean saveUser(UserForm form) {
        assertDeptAndRolesAssignable(form.getDeptId(), form.getRoleIds());

        long count = this.count(new LambdaQueryWrapper<SysUser>().eq(SysUser::getUsername, form.getUsername()));
        Assert.isTrue(count == 0, "用户名已存在");
        SysUser entity = userConverter.form2Entity(form);
        entity.setPassword(passwordEncoder.encode(salonProperties.getDefaultPassword()));
        // lastPasswordChangeTime 保持 null → 首次登录强制改密
        if (entity.getStatus() == null) {
            entity.setStatus(1);
        }
        boolean ok = this.save(entity);
        if (ok) {
            userRoleService.saveUserRoles(entity.getId(), form.getRoleIds());
            systemCacheService.refreshUserCache();
        }
        return ok;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public boolean updateUser(Long userId, UserForm form) {
        SysUser exist = this.getById(userId);
        Assert.notNull(exist, "用户不存在");
        assertDeptAndRolesAssignable(form.getDeptId(), form.getRoleIds());

        if (!exist.getUsername().equals(form.getUsername())) {
            long count = this.count(new LambdaQueryWrapper<SysUser>()
                    .eq(SysUser::getUsername, form.getUsername())
                    .ne(SysUser::getId, userId));
            Assert.isTrue(count == 0, "用户名已存在");
        }
        SysUser entity = userConverter.form2Entity(form);
        entity.setId(userId);
        entity.setPassword(null);
        entity.setLastPasswordChangeTime(null);
        boolean ok = this.updateById(entity);
        if (ok) {
            userRoleService.saveUserRoles(userId, form.getRoleIds());
            systemCacheService.refreshUserCache();
        }
        return ok;
    }

    /**
     * 部门必须存在；非全量数据权限时只能挂到可见部门；
     * 非 ROOT 不能赋 ROOT 角色，也不能赋 data_scope 比自己更宽的角色。
     */
    private void assertDeptAndRolesAssignable(Long deptId, List<Long> roleIds) {
        Assert.notNull(deptId, "所属部门不能为空");
        SysDept dept = deptService.getById(deptId);
        Assert.notNull(dept, "所属部门不存在");

        if (!SecurityUtils.isAllDataScope()) {
            Set<Long> visible = SecurityUtils.getDataScopeDeptIds();
            Assert.isTrue(CollUtil.isNotEmpty(visible) && visible.contains(deptId),
                    "无权在该部门下创建/修改用户");
        }

        Assert.isTrue(CollUtil.isNotEmpty(roleIds), "用户角色不能为空");
        List<SysRole> roles = roleService.listByIds(roleIds);
        Assert.isTrue(roles.size() == roleIds.stream().filter(Objects::nonNull).collect(Collectors.toSet()).size(),
                "角色不存在或不可用");

        boolean assignRoot = roles.stream().anyMatch(r ->
                GlobalConstants.ROOT_ROLE_CODE.equalsIgnoreCase(r.getCode()));
        if (assignRoot && !SecurityUtils.isRoot()) {
            throw new BizException(ResultCode.ACCESS_UNAUTHORIZED, "无权分配超级管理员角色");
        }

        Integer myScope = SecurityUtils.getDataScope();
        if (myScope == null) {
            myScope = DataScopeEnum.SELF.getValue();
        }
        if (!SecurityUtils.isRoot() && !DataScopeEnum.ALL.getValue().equals(myScope)) {
            for (SysRole role : roles) {
                Integer scope = role.getDataScope() == null ? DataScopeEnum.SELF.getValue() : role.getDataScope();
                // 数值越小权限越大
                Assert.isTrue(scope >= myScope, "不能分配数据范围更宽的角色：" + role.getName());
            }
        }
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public boolean deleteUsers(String ids) {
        Assert.isTrue(StrUtil.isNotBlank(ids), "删除数据为空");
        List<Long> idList = Arrays.stream(ids.split(",")).map(Long::parseLong).toList();
        Long current = SecurityUtils.getUserId();
        if (current != null && idList.contains(current)) {
            throw new BizException(ResultCode.PARAM_ERROR, "不能删除当前登录用户");
        }
        boolean ok = this.removeByIds(idList);
        if (ok) {
            userRoleService.remove(new LambdaQueryWrapper<SysUserRole>().in(SysUserRole::getUserId, idList));
            systemCacheService.refreshUserCache();
        }
        return ok;
    }

    @Override
    public boolean updatePassword(Long userId, String password) {
        Assert.isTrue(StrUtil.isNotBlank(password), "密码不能为空");
        // 管理员重置 → 清空改密时间，对方下次登录须强制改密
        return this.update(new LambdaUpdateWrapper<SysUser>()
                .eq(SysUser::getId, userId)
                .set(SysUser::getPassword, passwordEncoder.encode(password))
                .set(SysUser::getLastPasswordChangeTime, null));
    }

    @Override
    public boolean changeOwnPassword(String oldPassword, String newPassword) {
        Assert.isTrue(StrUtil.isNotBlank(oldPassword), "原密码不能为空");
        Assert.isTrue(StrUtil.isNotBlank(newPassword), "新密码不能为空");
        Assert.isTrue(newPassword.length() >= 6, "新密码至少 6 位");
        Long userId = SecurityUtils.getUserId();
        Assert.notNull(userId, "未登录");
        SysUser user = this.getById(userId);
        Assert.notNull(user, "用户不存在");
        if (!matchesPassword(oldPassword, user.getPassword())) {
            throw new BizException(ResultCode.USERNAME_OR_PASSWORD_ERROR, "原密码不正确");
        }
        return this.update(new LambdaUpdateWrapper<SysUser>()
                .eq(SysUser::getId, userId)
                .set(SysUser::getPassword, passwordEncoder.encode(newPassword))
                .set(SysUser::getLastPasswordChangeTime, LocalDateTime.now()));
    }

    @Override
    public boolean isPasswordResetRequired(LocalDateTime lastPasswordChangeTime) {
        // 首次 / 管理员重置后：从未自行改密（始终生效）
        if (lastPasswordChangeTime == null) {
            return true;
        }
        // 过期策略：默认 password-expire-days<=0 不启用；配置 >0 后生效
        int expireDays = salonProperties.getPasswordExpireDays();
        if (expireDays <= 0) {
            return false;
        }
        return lastPasswordChangeTime.isBefore(LocalDateTime.now().minusDays(expireDays));
    }

    private boolean matchesPassword(String raw, String encoded) {
        if (StrUtil.isBlank(encoded)) {
            return false;
        }
        if (encoded.startsWith("{noop}")) {
            return raw.equals(encoded.substring(6));
        }
        return passwordEncoder.matches(raw, encoded);
    }

    @Override
    public boolean updateUserStatus(Long userId, Integer status) {
        return this.update(new LambdaUpdateWrapper<SysUser>()
                .eq(SysUser::getId, userId)
                .set(SysUser::getStatus, status));
    }

    @Override
    public UserAuthInfo getUserAuthInfo(String username) {
        return getUserAuthInfo(username, null);
    }

    @Override
    public UserAuthInfo getUserAuthInfo(String username, Long tenantId) {
        Long effectiveTenant = tenantId == null ? SystemConstants.DEFAULT_TENANT_ID : tenantId;
        // 登录未鉴权：TenantLine 默认 tenant=1，显式切到目标租户再查
        return TenantContextRunner.run(effectiveTenant, () -> loadAuthInfo(username));
    }

    private UserAuthInfo loadAuthInfo(String username) {
        UserAuthInfo info = this.baseMapper.getUserAuthInfo(username);
        if (info == null) {
            return null;
        }
        if (info.getTenantId() == null) {
            info.setTenantId(SystemConstants.DEFAULT_TENANT_ID);
        }
        Set<String> roles = info.getRoles() == null ? Collections.emptySet() : new HashSet<>(info.getRoles());
        info.setRoles(roles);
        if (CollUtil.isNotEmpty(roles)) {
            info.setPerms(menuService.listRolePerms(roles));
            Integer maxScope = roleService.getMaxDataRangeDataScope(roles);
            if (roles.stream().anyMatch(r -> GlobalConstants.ROOT_ROLE_CODE.equalsIgnoreCase(r))) {
                maxScope = DataScopeEnum.ALL.getValue();
            }
            info.setMaxDataScope(maxScope == null ? DataScopeEnum.SELF.getValue() : maxScope);
            info.setDataScopeDeptIds(resolveDataScopeDeptIds(info.getMaxDataScope(), info.getDeptId(), roles));
        } else {
            info.setPerms(Collections.emptySet());
            info.setMaxDataScope(DataScopeEnum.SELF.getValue());
            info.setDataScopeDeptIds(Collections.emptySet());
        }
        return info;
    }

    /**
     * 按数据范围解析可见部门集合（写入 JWT，拦截器只读不查库）。
     */
    private Set<Long> resolveDataScopeDeptIds(Integer scope, Long deptId, Set<String> roles) {
        if (scope == null || DataScopeEnum.ALL.getValue().equals(scope) || DataScopeEnum.SELF.getValue().equals(scope)) {
            return Collections.emptySet();
        }
        if (DataScopeEnum.DEPT.getValue().equals(scope)) {
            return deptId == null ? Collections.emptySet() : Set.of(deptId);
        }
        if (DataScopeEnum.DEPT_AND_SUB.getValue().equals(scope)) {
            return deptService.listDeptAndChildIds(deptId);
        }
        if (DataScopeEnum.CUSTOM.getValue().equals(scope)) {
            Set<Long> ids = new HashSet<>();
            List<SysRole> roleList = roleService.list(new LambdaQueryWrapper<SysRole>()
                    .in(SysRole::getCode, roles)
                    .eq(SysRole::getStatus, 1));
            for (SysRole role : roleList) {
                if (StrUtil.isBlank(role.getDeptIds())) {
                    continue;
                }
                for (String part : role.getDeptIds().split(",")) {
                    if (StrUtil.isNotBlank(part)) {
                        ids.add(Long.parseLong(part.trim()));
                    }
                }
            }
            return ids;
        }
        return Collections.emptySet();
    }

    @Override
    public UserInfoVO getUserLoginInfo() {
        Long userId = UserContext.getUserId();
        if (userId == null || userId == 0L) {
            throw new BizException(ResultCode.INVALID_TOKEN);
        }
        SysUser user = this.getById(userId);
        if (user == null) {
            throw new BizException(ResultCode.USER_NOT_EXIST);
        }
        UserInfoVO vo = userConverter.entity2UserInfoVo(user);
        vo.setPwdResetRequired(isPasswordResetRequired(user.getLastPasswordChangeTime()));
        UserAuthInfo auth = getUserAuthInfo(user.getUsername(), user.getTenantId());
        if (auth != null) {
            vo.setRoles(auth.getRoles());
            vo.setPerms(auth.getPerms());
        }
        return vo;
    }
}
