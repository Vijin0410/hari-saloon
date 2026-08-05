package com.wangjin.salon.service.service;

import cn.hutool.core.lang.Assert;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.wangjin.common.security.util.SecurityUtils;
import com.wangjin.salon.service.mapper.SalonStoreMapper;
import com.wangjin.salon.service.mapper.SalonStoreUserMapper;
import com.wangjin.salon.service.model.bo.StoreDataScopeBO;
import com.wangjin.salon.service.model.entity.SalonStore;
import com.wangjin.salon.service.model.entity.SalonStoreUser;
import com.wangjin.salon.service.model.query.MemberPageQuery;
import com.wangjin.salon.service.model.query.StorePageQuery;
import com.wangjin.salon.system.constant.RoleCodes;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Objects;

/**
 * Store-scoped data range for salon business tables.
 * <p>
 * 放行规则：ROOT 跨租户全量；租户管理员本租户全部门店；其余按 {@code salon_store_user} 绑定门店限制。
 * 不再复用 {@link SecurityUtils#isAllDataScope()}，避免店长 data_scope=ALL 时门店权限被连带放行。
 */
@Service
@RequiredArgsConstructor
public class SalonStorePermissionService {

    private final SalonStoreMapper storeMapper;
    private final SalonStoreUserMapper storeUserMapper;

    /** 租户管理员：本租户全部门店可见（不限门店范围）。 */
    private boolean isTenantAdmin() {
        return SecurityUtils.getRoles().stream()
                .anyMatch(RoleCodes.TENANT_ADMIN.getCode()::equalsIgnoreCase);
    }

    public StoreDataScopeBO currentScope() {
        Long userId = SecurityUtils.getUserId();
        if (userId == null || userId == 0L || SecurityUtils.isRoot() || isTenantAdmin()) {
            return StoreDataScopeBO.all();
        }

        List<Long> storeIds = storeUserMapper.selectList(new LambdaQueryWrapper<SalonStoreUser>()
                        .select(SalonStoreUser::getStoreId)
                        .eq(SalonStoreUser::getUserId, userId))
                .stream()
                .map(SalonStoreUser::getStoreId)
                .filter(Objects::nonNull)
                .distinct()
                .toList();
        return StoreDataScopeBO.limited(storeIds, userId);
    }

    public void apply(StorePageQuery query) {
        StoreDataScopeBO scope = currentScope();
        query.setAllStoreScope(scope.getAllStoreScope());
        query.setDeniedStoreScope(scope.getDeniedStoreScope());
        query.setPermittedStoreIds(scope.getPermittedStoreIds());
        query.setPermissionUserId(scope.getPermissionUserId());
    }

    public void apply(MemberPageQuery query) {
        StoreDataScopeBO scope = currentScope();
        query.setAllStoreScope(scope.getAllStoreScope());
        query.setDeniedStoreScope(scope.getDeniedStoreScope());
        query.setPermittedStoreIds(scope.getPermittedStoreIds());
        query.setPermissionUserId(scope.getPermissionUserId());
    }

    public void assertStoreAccessible(Long storeId, String message) {
        Assert.notNull(storeId, "Store is required");
        Assert.isTrue(canAccessStore(storeId), message);
    }

    public boolean canAccessStore(Long storeId) {
        if (storeId == null) {
            return false;
        }
        Long userId = SecurityUtils.getUserId();
        if (userId == null || userId == 0L || SecurityUtils.isRoot() || isTenantAdmin()) {
            return true;
        }
        Long mapped = storeUserMapper.selectCount(new LambdaQueryWrapper<SalonStoreUser>()
                .eq(SalonStoreUser::getStoreId, storeId)
                .eq(SalonStoreUser::getUserId, userId));
        if (mapped != null && mapped > 0) {
            return true;
        }
        SalonStore store = storeMapper.selectById(storeId);
        return store != null && userId.equals(store.getCreateBy());
    }
}
