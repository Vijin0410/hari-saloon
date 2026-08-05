package com.wangjin.salon.service.service.impl;

import cn.hutool.core.collection.CollUtil;
import cn.hutool.core.lang.Assert;
import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.wangjin.common.enums.StatusEnum;
import com.wangjin.common.security.util.SecurityUtils;
import com.wangjin.common.web.model.Option;
import com.wangjin.salon.service.converter.StoreConverter;
import com.wangjin.salon.service.mapper.SalonStoreMapper;
import com.wangjin.salon.service.mapper.SalonStoreUserMapper;
import com.wangjin.salon.service.model.bo.StoreDataScopeBO;
import com.wangjin.salon.service.model.entity.SalonStore;
import com.wangjin.salon.service.model.entity.SalonStoreUser;
import com.wangjin.salon.service.model.form.StoreForm;
import com.wangjin.salon.service.model.query.StorePageQuery;
import com.wangjin.salon.service.model.vo.StoreDetailVO;
import com.wangjin.salon.service.model.vo.StorePageVO;
import com.wangjin.salon.service.service.SalonStorePermissionService;
import com.wangjin.salon.service.service.SalonStoreService;
import com.wangjin.salon.system.model.entity.SysUser;
import com.wangjin.salon.system.service.SysUserService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class SalonStoreServiceImpl extends ServiceImpl<SalonStoreMapper, SalonStore> implements SalonStoreService {

    private final StoreConverter storeConverter;
    private final SalonStorePermissionService storePermissionService;
    private final SalonStoreUserMapper storeUserMapper;
    private final SysUserService userService;

    @Override
    public Page<StorePageVO> getStorePage(StorePageQuery query) {
        // 非 ROOT 忽略 tenantId：TenantLine 已自动按本租户过滤，防止越权指定它租户
        if (!SecurityUtils.isRoot()) {
            query.setTenantId(null);
        }
        storePermissionService.apply(query);
        return this.baseMapper.getStorePage(new Page<>(query.getPageNum(), query.getPageSize()), query);
    }

    @Override
    public List<Option<Long>> listStoreOptions(Long tenantId) {
        StoreDataScopeBO scope = storePermissionService.currentScope();
        // ROOT 按选中租户过滤门店下拉；非 ROOT 忽略 tenantId（TenantLine 已限本租户）
        Long effectiveTenantId = SecurityUtils.isRoot() ? tenantId : null;
        LambdaQueryWrapper<SalonStore> wrapper = new LambdaQueryWrapper<SalonStore>()
                .eq(SalonStore::getStatus, StatusEnum.ENABLE.getValue())
                .eq(effectiveTenantId != null, SalonStore::getTenantId, effectiveTenantId)
                .orderByAsc(SalonStore::getSort)
                .orderByDesc(SalonStore::getCreateTime);
        applyStoreScope(wrapper, scope);
        return this.list(wrapper)
                .stream()
                .map(store -> new Option<>(store.getId(), store.getName()))
                .toList();
    }

    @Override
    public StoreDetailVO getDetail(Long id) {
        SalonStore entity = this.getById(id);
        Assert.notNull(entity, "Store not found");
        storePermissionService.assertStoreAccessible(id, "No permission for this store");
        StoreDetailVO detail = storeConverter.entity2DetailVo(entity);
        detail.setUserIds(listStoreUserIds(id));
        return detail;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Long saveStore(StoreForm form) {
        if (StrUtil.isNotBlank(form.getCode())) {
            long c = this.count(new LambdaQueryWrapper<SalonStore>().eq(SalonStore::getCode, form.getCode()));
            Assert.isTrue(c == 0, "Store code already exists");
        }

        SalonStore entity = storeConverter.form2Entity(form);
        fillDefaults(entity);
        this.save(entity);
        syncStoreUsers(entity.getId(), form.getUserIds());
        return entity.getId();
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public boolean updateStore(Long id, StoreForm form) {
        SalonStore exist = this.getById(id);
        Assert.notNull(exist, "Store not found");
        storePermissionService.assertStoreAccessible(id, "No permission for this store");

        if (StrUtil.isNotBlank(form.getCode()) && !form.getCode().equals(exist.getCode())) {
            long c = this.count(new LambdaQueryWrapper<SalonStore>()
                    .eq(SalonStore::getCode, form.getCode())
                    .ne(SalonStore::getId, id));
            Assert.isTrue(c == 0, "Store code already exists");
        }

        SalonStore entity = storeConverter.form2Entity(form);
        entity.setId(id);
        fillBusinessHours(entity);
        boolean updated = this.updateById(entity);
        if (form.getUserIds() != null) {
            syncStoreUsers(id, form.getUserIds());
        }
        return updated;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public boolean deleteStores(String ids) {
        Assert.isTrue(StrUtil.isNotBlank(ids), "Delete ids is empty");
        List<Long> idList = Arrays.stream(ids.split(",")).map(Long::parseLong).toList();
        for (Long id : idList) {
            SalonStore store = this.getById(id);
            if (store != null) {
                storePermissionService.assertStoreAccessible(id, "No permission for this store");
            }
        }
        boolean removed = this.removeByIds(idList);
        if (removed) {
            storeUserMapper.delete(new LambdaQueryWrapper<SalonStoreUser>().in(SalonStoreUser::getStoreId, idList));
        }
        return removed;
    }

    private void fillDefaults(SalonStore entity) {
        if (entity.getStatus() == null) {
            entity.setStatus(StatusEnum.ENABLE.getValue());
        }
        if (entity.getSort() == null) {
            entity.setSort(0);
        }
        fillBusinessHours(entity);
    }

    private void fillBusinessHours(SalonStore entity) {
        if (StrUtil.isBlank(entity.getBusinessHours()) && entity.getOpenTime() != null && entity.getCloseTime() != null) {
            entity.setBusinessHours(entity.getOpenTime() + "-" + entity.getCloseTime());
        }
    }

    private List<Long> listStoreUserIds(Long storeId) {
        return storeUserMapper.selectList(new LambdaQueryWrapper<SalonStoreUser>()
                        .select(SalonStoreUser::getUserId)
                        .eq(SalonStoreUser::getStoreId, storeId))
                .stream()
                .map(SalonStoreUser::getUserId)
                .filter(Objects::nonNull)
                .distinct()
                .toList();
    }

    private void syncStoreUsers(Long storeId, List<Long> userIds) {
        Set<Long> nextUserIds = new LinkedHashSet<>();
        if (userIds != null) {
            nextUserIds.addAll(userIds.stream().filter(Objects::nonNull).toList());
        }
        Long currentUserId = SecurityUtils.getUserId();
        if (currentUserId != null && currentUserId > 0) {
            nextUserIds.add(currentUserId);
        }
        assertUsersExist(nextUserIds);

        storeUserMapper.delete(new LambdaQueryWrapper<SalonStoreUser>().eq(SalonStoreUser::getStoreId, storeId));
        for (Long userId : nextUserIds) {
            SalonStoreUser storeUser = new SalonStoreUser();
            storeUser.setStoreId(storeId);
            storeUser.setUserId(userId);
            storeUserMapper.insert(storeUser);
        }
    }

    private void assertUsersExist(Set<Long> userIds) {
        if (CollUtil.isEmpty(userIds)) {
            return;
        }
        List<SysUser> users = userService.list(new LambdaQueryWrapper<SysUser>().in(SysUser::getId, userIds));
        Assert.isTrue(users.size() == userIds.size(), "Store authorized user not found");
        if (SecurityUtils.isAllDataScope()) {
            return;
        }
        Set<Long> visibleDeptIds = SecurityUtils.getDataScopeDeptIds();
        Long currentUserId = SecurityUtils.getUserId();
        boolean assignable = users.stream().allMatch(user ->
                user.getId().equals(currentUserId)
                        || (CollUtil.isNotEmpty(visibleDeptIds) && visibleDeptIds.contains(user.getDeptId())));
        Assert.isTrue(assignable, "No permission to authorize invisible user");
    }

    private void applyStoreScope(LambdaQueryWrapper<SalonStore> wrapper, StoreDataScopeBO scope) {
        if (Boolean.TRUE.equals(scope.getAllStoreScope())) {
            return;
        }
        if (Boolean.TRUE.equals(scope.getDeniedStoreScope())) {
            wrapper.eq(SalonStore::getId, -1L);
            return;
        }
        List<Long> storeIds = scope.getPermittedStoreIds();
        Long userId = scope.getPermissionUserId();
        if (CollUtil.isEmpty(storeIds)) {
            if (userId == null) {
                wrapper.eq(SalonStore::getId, -1L);
            } else {
                wrapper.eq(SalonStore::getCreateBy, userId);
            }
            return;
        }
        wrapper.and(w -> {
            w.in(SalonStore::getId, storeIds);
            if (userId != null) {
                w.or().eq(SalonStore::getCreateBy, userId);
            }
        });
    }
}
