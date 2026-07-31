package com.wangjin.salon.service.service.impl;

import cn.hutool.core.collection.CollUtil;
import cn.hutool.core.lang.Assert;
import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.wangjin.common.enums.StatusEnum;
import com.wangjin.salon.service.mapper.SalonStoreMapper;
import com.wangjin.salon.service.mapper.SalonStoreUserMapper;
import com.wangjin.salon.service.model.entity.SalonStore;
import com.wangjin.salon.service.model.entity.SalonStoreUser;
import com.wangjin.salon.system.model.bo.InitialStoreInfo;
import com.wangjin.salon.system.service.SalonStorePort;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;

/**
 * {@link SalonStorePort} 在 service 模块的实现：跨模块门店端口。
 * <p>
 * 供 system 模块（租户开通 / 用户绑定门店）调用，租户上下文由调用方负责切换。
 */
@Service
@RequiredArgsConstructor
public class SalonStorePortImpl implements SalonStorePort {

    private final SalonStoreMapper storeMapper;
    private final SalonStoreUserMapper storeUserMapper;

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Long provisionInitialStore(InitialStoreInfo info) {
        if (info == null || StrUtil.isBlank(info.name())) {
            return null;
        }
        SalonStore store = new SalonStore();
        store.setName(info.name());
        store.setCode(info.code());
        store.setPhone(info.phone());
        store.setAddress(info.address());
        store.setStatus(StatusEnum.ENABLE.getValue());
        store.setSort(0);
        storeMapper.insert(store);
        return store.getId();
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void syncUserStores(Long userId, List<Long> storeIds) {
        Assert.notNull(userId, "用户ID不能为空");
        Set<Long> nextStoreIds = new LinkedHashSet<>();
        if (storeIds != null) {
            storeIds.stream().filter(Objects::nonNull).forEach(nextStoreIds::add);
        }
        assertStoresExist(nextStoreIds);

        storeUserMapper.delete(new LambdaQueryWrapper<SalonStoreUser>().eq(SalonStoreUser::getUserId, userId));
        for (Long storeId : nextStoreIds) {
            SalonStoreUser rel = new SalonStoreUser();
            rel.setStoreId(storeId);
            rel.setUserId(userId);
            storeUserMapper.insert(rel);
        }
    }

    @Override
    public List<Long> listUserStoreIds(Long userId) {
        if (userId == null) {
            return List.of();
        }
        return storeUserMapper.selectList(new LambdaQueryWrapper<SalonStoreUser>()
                        .select(SalonStoreUser::getStoreId)
                        .eq(SalonStoreUser::getUserId, userId))
                .stream()
                .map(SalonStoreUser::getStoreId)
                .filter(Objects::nonNull)
                .distinct()
                .toList();
    }

    private void assertStoresExist(Set<Long> storeIds) {
        if (CollUtil.isEmpty(storeIds)) {
            return;
        }
        Long count = storeMapper.selectCount(new LambdaQueryWrapper<SalonStore>().in(SalonStore::getId, storeIds));
        Assert.isTrue(count != null && count == storeIds.size(), "所选门店不存在");
    }
}
