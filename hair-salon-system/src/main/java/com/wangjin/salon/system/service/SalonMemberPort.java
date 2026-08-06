package com.wangjin.salon.system.service;

/**
 * 会员资产领域向 system 模块暴露的端口（SPI）。
 * <p>
 * system 模块不能反向依赖 service 模块（service 已依赖 system，再反向即循环），
 * 故由 system 定义本端口、service 模块提供实现，Spring 注入实现 bean。
 * 用途：开通租户时按勾选模块从默认租户复制会员等级 / 标签等通用数据到新租户。
 * <p>
 * 调用方须已在目标租户上下文（{@code TenantContextRunner.run(toTenantId, ...)}）内；
 * 实现内部用 {@code TenantContextRunner.run(fromTenantId, ...)} 切到源租户读取模板数据。
 */
public interface SalonMemberPort {

    /**
     * 从源租户复制会员等级到当前租户（幂等：当前租户已有等级则跳过）。
     *
     * @param fromTenantId 源租户ID（通常为默认租户）
     */
    void copyMemberLevel(Long fromTenantId);

    /**
     * 从源租户复制会员标签到当前租户（幂等：当前租户已有标签则跳过）。
     *
     * @param fromTenantId 源租户ID（通常为默认租户）
     */
    void copyMemberTag(Long fromTenantId);
}
