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
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Objects;

/**
 * Store-scoped data range for salon business tables.
 */
@Service
@RequiredArgsConstructor
public class SalonStorePermissionService {

    private final SalonStoreMapper storeMapper;
    private final SalonStoreUserMapper storeUserMapper;

    public StoreDataScopeBO currentScope() {
        Long userId = SecurityUtils.getUserId();
        if (userId == null || userId == 0L || SecurityUtils.isAllDataScope()) {
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
        if (userId == null || userId == 0L || SecurityUtils.isAllDataScope()) {
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
