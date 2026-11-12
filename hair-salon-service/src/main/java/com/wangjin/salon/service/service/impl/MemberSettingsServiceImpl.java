package com.wangjin.salon.service.service.impl;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.wangjin.common.exception.BizException;
import com.wangjin.common.security.util.SecurityUtils;
import com.wangjin.salon.service.mapper.SalonMemberMapper;
import com.wangjin.salon.service.mapper.MemberSettingsAuditMapper;
import com.wangjin.salon.service.model.entity.SalonMember;
import com.wangjin.salon.service.model.entity.MemberSettingsAudit;
import com.wangjin.salon.service.model.form.MemberSettingsForm;
import com.wangjin.salon.service.model.vo.MemberSettingsVO;
import com.wangjin.salon.service.service.MemberSettingsService;
import com.wangjin.salon.system.model.entity.SysTenant;
import com.wangjin.salon.system.service.SysTenantService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class MemberSettingsServiceImpl implements MemberSettingsService {
    private final SysTenantService tenantService;
    private final SalonMemberMapper memberMapper;
    private final MemberSettingsAuditMapper auditMapper;

    @Override
    public boolean pointsEnabled() {
        return pointsEnabled(SecurityUtils.getTenantId());
    }

    @Override
    public boolean pointsEnabled(Long tenantId) {
        SysTenant tenant = tenantService.getById(tenantId);
        if (tenant == null) throw new BizException("当前租户不存在");
        return Integer.valueOf(1).equals(tenant.getPointsEnabled());
    }

    @Override
    public MemberSettingsVO getSettings(boolean includeAssets) {
        MemberSettingsVO vo = new MemberSettingsVO();
        vo.setPointsEnabled(pointsEnabled());
        if (includeAssets) {
            // ROOT 不走 TenantLine，此处仍显式限当前租户。实时读取，无配置缓存。
            var totals = memberMapper.selectMaps(Wrappers.<SalonMember>query()
                    .select("COALESCE(SUM(points), 0) AS points", "COALESCE(SUM(point_debt), 0) AS debt")
                    .eq("tenant_id", SecurityUtils.getTenantId())).get(0);
            vo.setOutstandingPoints(((Number) totals.get("points")).longValue());
            vo.setOutstandingDebt(((Number) totals.get("debt")).longValue());
        }
        return vo;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void update(MemberSettingsForm form) {
        Long tenantId = SecurityUtils.getTenantId();
        SysTenant tenant = tenantService.getOne(Wrappers.<SysTenant>lambdaQuery()
                .eq(SysTenant::getId, tenantId).last("FOR UPDATE"));
        if (tenant == null) throw new BizException("当前租户不存在");
        int after = Boolean.TRUE.equals(form.getPointsEnabled()) ? 1 : 0;
        if (Integer.valueOf(after).equals(tenant.getPointsEnabled())) return;
        MemberSettingsAudit audit = new MemberSettingsAudit();
        audit.setTenantId(tenantId);
        audit.setBeforeEnabled(tenant.getPointsEnabled());
        audit.setAfterEnabled(after);
        auditMapper.insert(audit);
        tenantService.update(Wrappers.<SysTenant>lambdaUpdate()
                .set(SysTenant::getPointsEnabled, after).eq(SysTenant::getId, tenantId));
    }
}
