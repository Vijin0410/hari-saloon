package com.wangjin.salon.system.service.impl;

import cn.hutool.core.lang.Assert;
import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.wangjin.common.constant.SystemConstants;
import com.wangjin.common.enums.DataScopeEnum;
import com.wangjin.common.enums.StatusEnum;
import com.wangjin.common.web.model.Option;
import com.wangjin.salon.system.config.SalonProperties;
import com.wangjin.salon.system.constant.RoleCodes;
import com.wangjin.salon.system.converter.TenantConverter;
import com.wangjin.salon.system.mapper.SysMenuMapper;
import com.wangjin.salon.system.mapper.SysTenantMapper;
import com.wangjin.salon.system.model.bo.InitialStoreInfo;
import com.wangjin.salon.system.model.entity.SysMenu;
import com.wangjin.salon.system.model.entity.SysRole;
import com.wangjin.salon.system.model.entity.SysTenant;
import com.wangjin.salon.system.model.entity.SysUser;
import com.wangjin.salon.system.model.form.TenantForm;
import com.wangjin.salon.system.model.query.TenantPageQuery;
import com.wangjin.salon.system.model.vo.TenantPageVO;
import com.wangjin.salon.system.service.SalonStorePort;
import com.wangjin.salon.system.service.SysRoleMenuService;
import com.wangjin.salon.system.service.SysRoleService;
import com.wangjin.salon.system.service.SysTenantService;
import com.wangjin.salon.system.service.SysUserRoleService;
import com.wangjin.salon.system.service.SysUserService;
import com.wangjin.salon.system.util.TenantContextRunner;
import org.springframework.context.annotation.Lazy;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.List;

/**
 * 租户：CRUD + 开通时初始化预置角色 / 管理员（可选联合创建初始门店）。
 * <p>
 * 部门与门店已解耦：开通不再创建总部部门，部门作为租户内功能由租户管理员自行维护。
 */
@Service
public class SysTenantServiceImpl extends ServiceImpl<SysTenantMapper, SysTenant> implements SysTenantService {

    private final TenantConverter tenantConverter;
    private final SysRoleService roleService;
    private final SysRoleMenuService roleMenuService;
    private final SysUserRoleService userRoleService;
    private final SysUserService userService;
    private final SysMenuMapper menuMapper;
    private final PasswordEncoder passwordEncoder;
    private final SalonProperties salonProperties;
    private final SalonStorePort salonStorePort;

    public SysTenantServiceImpl(TenantConverter tenantConverter,
                                SysRoleService roleService,
                                SysRoleMenuService roleMenuService,
                                SysUserRoleService userRoleService,
                                @Lazy SysUserService userService,
                                SysMenuMapper menuMapper,
                                PasswordEncoder passwordEncoder,
                                SalonProperties salonProperties,
                                SalonStorePort salonStorePort) {
        this.tenantConverter = tenantConverter;
        this.roleService = roleService;
        this.roleMenuService = roleMenuService;
        this.userRoleService = userRoleService;
        this.userService = userService;
        this.menuMapper = menuMapper;
        this.passwordEncoder = passwordEncoder;
        this.salonProperties = salonProperties;
        this.salonStorePort = salonStorePort;
    }

    /** 店长默认可挂菜单 id（与 data.sql 种子一致；菜单全局共享） */
    private static final List<Long> STORE_MANAGER_MENU_IDS = List.of(
            1L, 2L, 21L, 22L, 23L, 24L, 25L, 26L, 27L,
            5L, 51L, 52L, 53L, 54L,
            8L, 9L, 91L, 92L, 93L, 94L,
            10L, 101L, 102L, 103L, 104L, 105L
    );
    private static final List<Long> STORE_STAFF_MENU_IDS = List.of(8L, 10L, 101L, 102L, 103L, 104L);

    @Override
    public Page<TenantPageVO> getTenantPage(TenantPageQuery query) {
        Page<SysTenant> page = this.page(
                new Page<>(query.getPageNum(), query.getPageSize()),
                new LambdaQueryWrapper<SysTenant>()
                        .and(StrUtil.isNotBlank(query.getKeywords()), w -> w
                                .like(SysTenant::getName, query.getKeywords())
                                .or()
                                .like(SysTenant::getCode, query.getKeywords()))
                        .eq(query.getStatus() != null, SysTenant::getStatus, query.getStatus())
                        .orderByDesc(SysTenant::getCreateTime)
        );
        return tenantConverter.entity2Page(page);
    }

    @Override
    public TenantForm getTenantForm(Long id) {
        SysTenant entity = this.getById(id);
        Assert.notNull(entity, "租户不存在");
        TenantForm form = tenantConverter.entity2Form(entity);
        form.setAdminPassword(null);
        return form;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public boolean saveTenant(TenantForm form) {
        long count = this.count(new LambdaQueryWrapper<SysTenant>().eq(SysTenant::getCode, form.getCode()));
        Assert.isTrue(count == 0, "租户编码已存在");

        SysTenant entity = tenantConverter.form2Entity(form);
        if (entity.getStatus() == null) {
            entity.setStatus(StatusEnum.ENABLE.getValue());
        }
        boolean ok = this.save(entity);
        Assert.isTrue(ok, "保存租户失败");

        String adminUsername = StrUtil.blankToDefault(form.getAdminUsername(), "admin");
        String adminNickname = StrUtil.blankToDefault(form.getAdminNickname(),
                StrUtil.blankToDefault(form.getContact(), form.getName() + "管理员"));
        String rawPassword = StrUtil.blankToDefault(form.getAdminPassword(), salonProperties.getDefaultPassword());

        TenantContextRunner.run(entity.getId(), () -> bootstrapTenant(
                entity.getId(),
                adminUsername,
                adminNickname,
                rawPassword,
                form.getStore()
        ));
        return true;
    }

    /**
     * 开通：预置角色 + 管理员用户（+ 可选初始门店）。
     * <p>
     * 部门与门店已解耦：开通不再创建总部部门；管理员默认不挂部门，可选联合创建一个初始门店并绑定，
     * 便于其查看门店业务数据。须在目标 tenant 的 {@link TenantContextRunner} 内调用。
     */
    private void bootstrapTenant(Long tenantId,
                                 String adminUsername, String adminNickname, String rawPassword,
                                 InitialStoreInfo store) {
        // 租户内管理员（本租户全部数据，不含租户管理）；ROOT 是系统管理员，仅默认租户，不在开通时创建
        SysRole tenantAdmin = savePresetRole("租户管理员", RoleCodes.TENANT_ADMIN.getCode(), 1, DataScopeEnum.ALL.getValue(), tenantId);
        SysRole manager = savePresetRole("店长", RoleCodes.STORE_MANAGER.getCode(), 2, DataScopeEnum.ALL.getValue(), tenantId);
        SysRole staff = savePresetRole("店员", RoleCodes.STORE_STAFF.getCode(), 3, DataScopeEnum.SELF.getValue(), tenantId);

        // 租户管理员菜单：除「租户管理 system:tenant:*」外的全部（租户内管理 + 业务）
        List<Long> tenantAdminMenuIds = menuMapper.selectList(new LambdaQueryWrapper<SysMenu>()
                        .select(SysMenu::getId)
                        .and(w -> w.isNull(SysMenu::getPerm).or().notLike(SysMenu::getPerm, "system:tenant:")))
                .stream().map(SysMenu::getId).toList();
        roleMenuService.updateRoleMenus(tenantAdmin.getId(), 1, tenantAdminMenuIds);
        roleMenuService.updateRoleMenus(manager.getId(), 1, STORE_MANAGER_MENU_IDS);
        roleMenuService.updateRoleMenus(staff.getId(), 1, STORE_STAFF_MENU_IDS);

        long exists = userService.count(new LambdaQueryWrapper<SysUser>()
                .eq(SysUser::getUsername, adminUsername)
                .eq(SysUser::getTenantId, tenantId));
        Assert.isTrue(exists == 0, "管理员用户名已存在");

        SysUser admin = new SysUser();
        admin.setUsername(adminUsername);
        admin.setNickname(adminNickname);
        admin.setPassword(passwordEncoder.encode(rawPassword));
        admin.setStatus(StatusEnum.ENABLE.getValue());
        // 部门可选：开通不建部门，管理员不挂部门；后续由租户管理员自行分配
        // lastPasswordChangeTime 默认 null -> 首次登录强制改密
        admin.setTenantId(tenantId);
        userService.save(admin);
        userRoleService.saveUserRoles(admin.getId(), List.of(tenantAdmin.getId()));

        // 可选：联合创建初始门店，并把管理员绑定到该门店
        Long storeId = salonStorePort.provisionInitialStore(store);
        if (storeId != null) {
            salonStorePort.syncUserStores(admin.getId(), List.of(storeId));
        }
    }

    private SysRole savePresetRole(String name, String code, int sort, Integer dataScope, Long tenantId) {
        SysRole role = new SysRole();
        role.setName(name);
        role.setCode(code);
        role.setSort(sort);
        role.setStatus(StatusEnum.ENABLE.getValue());
        role.setDataScope(dataScope);
        role.setTenantId(tenantId);
        roleService.save(role);
        return role;
    }

    @Override
    public boolean updateTenant(Long id, TenantForm form) {
        SysTenant exist = this.getById(id);
        Assert.notNull(exist, "租户不存在");
        if (!exist.getCode().equals(form.getCode())) {
            long count = this.count(new LambdaQueryWrapper<SysTenant>()
                    .eq(SysTenant::getCode, form.getCode())
                    .ne(SysTenant::getId, id));
            Assert.isTrue(count == 0, "租户编码已存在");
        }
        SysTenant entity = tenantConverter.form2Entity(form);
        entity.setId(id);
        return this.updateById(entity);
    }

    @Override
    public boolean deleteTenants(String ids) {
        Assert.isTrue(StrUtil.isNotBlank(ids), "删除数据为空");
        List<Long> idList = Arrays.stream(ids.split(",")).map(Long::parseLong).toList();
        Assert.isFalse(idList.contains(SystemConstants.DEFAULT_TENANT_ID), "默认租户不可删除");
        return this.removeByIds(idList);
    }

    @Override
    public boolean updateStatus(Long id, Integer status) {
        Assert.isFalse(SystemConstants.DEFAULT_TENANT_ID.equals(id) && StatusEnum.DISABLE.getValue().equals(status),
                "默认租户不可禁用");
        return this.update(new LambdaUpdateWrapper<SysTenant>()
                .eq(SysTenant::getId, id)
                .set(SysTenant::getStatus, status));
    }

    @Override
    public List<Option<Long>> listOptions() {
        return this.list(new LambdaQueryWrapper<SysTenant>()
                        .eq(SysTenant::getStatus, StatusEnum.ENABLE.getValue())
                        .orderByAsc(SysTenant::getId))
                .stream()
                .map(t -> new Option<>(t.getId(), t.getName()))
                .toList();
    }

    @Override
    public List<Option<String>> listLoginOptions() {
        return this.list(new LambdaQueryWrapper<SysTenant>()
                        .eq(SysTenant::getStatus, StatusEnum.ENABLE.getValue())
                        .orderByAsc(SysTenant::getId))
                .stream()
                .map(t -> new Option<>(t.getCode(), t.getName()))
                .toList();
    }

    @Override
    public SysTenant getByCode(String code) {
        if (StrUtil.isBlank(code)) {
            return null;
        }
        return this.getOne(new LambdaQueryWrapper<SysTenant>()
                .eq(SysTenant::getCode, code)
                .eq(SysTenant::getStatus, StatusEnum.ENABLE.getValue())
                .last("LIMIT 1"));
    }
}
