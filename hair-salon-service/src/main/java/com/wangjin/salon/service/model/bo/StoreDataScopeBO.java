package com.wangjin.salon.service.model.bo;

import lombok.Data;

import java.util.Collections;
import java.util.List;

/**
 * Store-scoped data range used by salon business queries.
 */
@Data
public class StoreDataScopeBO {

    private Boolean allStoreScope;
    private Boolean deniedStoreScope;
    private List<Long> permittedStoreIds;
    private Long permissionUserId;

    public static StoreDataScopeBO all() {
        StoreDataScopeBO scope = new StoreDataScopeBO();
        scope.setAllStoreScope(true);
        scope.setDeniedStoreScope(false);
        scope.setPermittedStoreIds(Collections.emptyList());
        return scope;
    }

    public static StoreDataScopeBO limited(List<Long> storeIds, Long userId) {
        StoreDataScopeBO scope = new StoreDataScopeBO();
        scope.setAllStoreScope(false);
        scope.setDeniedStoreScope(userId == null);
        scope.setPermittedStoreIds(storeIds == null ? Collections.emptyList() : storeIds);
        scope.setPermissionUserId(userId);
        return scope;
    }
}
