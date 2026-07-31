package com.wangjin.salon.system.service;

import com.wangjin.salon.system.model.bo.InitialStoreInfo;

import java.util.List;

/**
 * 门店领域向 system 模块暴露的端口（SPI）。
 * <p>
 * system 模块不能反向依赖 service 模块（service 已依赖 system，再反向即循环），
 * 故由 system 定义本端口、service 模块提供实现，Spring 注入实现 bean。
 * 用途：开通租户时联合创建初始门店、用户绑定多个门店。
 */
public interface SalonStorePort {

    /**
     * 开通租户时按可选门店信息创建初始门店。
     *
     * @param info 门店必要信息；为 null 或 name 空白则不创建
     * @return 新建门店 id；未创建返回 null
     */
    Long provisionInitialStore(InitialStoreInfo info);

    /**
     * 全量同步用户绑定的门店集合（覆盖写）。
     *
     * @param userId   用户ID
     * @param storeIds 门店ID集合；为 null 或空则清空该用户所有绑定
     */
    void syncUserStores(Long userId, List<Long> storeIds);

    /**
     * 查询用户已绑定的门店ID集合。
     *
     * @param userId 用户ID
     * @return 门店ID列表（空列表而非 null）
     */
    List<Long> listUserStoreIds(Long userId);
}
