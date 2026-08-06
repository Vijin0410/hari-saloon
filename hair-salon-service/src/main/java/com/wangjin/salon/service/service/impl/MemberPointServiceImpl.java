package com.wangjin.salon.service.service.impl;

import cn.hutool.core.lang.Assert;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.wangjin.salon.service.mapper.SalonMemberMapper;
import com.wangjin.salon.service.mapper.SalonMemberPointLogMapper;
import com.wangjin.salon.service.model.entity.SalonMember;
import com.wangjin.salon.service.model.entity.SalonMemberPointLog;
import com.wangjin.salon.service.model.form.MemberPointAdjustForm;
import com.wangjin.salon.service.model.query.MemberPointLogPageQuery;
import com.wangjin.salon.service.model.vo.MemberPointLogVO;
import com.wangjin.salon.service.service.MemberAssetService;
import com.wangjin.salon.service.service.MemberPointService;
import com.wangjin.salon.service.service.SalonStorePermissionService;
import com.wangjin.salon.system.model.entity.SysTenant;
import com.wangjin.salon.system.service.SysTenantService;
import com.wangjin.salon.system.util.TenantContextRunner;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class MemberPointServiceImpl implements MemberPointService {

    private final SalonMemberMapper memberMapper;
    private final SalonMemberPointLogMapper pointLogMapper;
    private final MemberAssetService memberAssetService;
    private final SalonStorePermissionService storePermissionService;
    private final SysTenantService sysTenantService;

    @Override
    public Page<MemberPointLogVO> getLogPage(MemberPointLogPageQuery query) {
        return pointLogMapper.getLogPage(new Page<>(query.getPageNum(), query.getPageSize()), query);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void adjust(Long memberId, MemberPointAdjustForm form) {
        SalonMember member = memberMapper.selectById(memberId);
        Assert.notNull(member, "会员不存在");
        storePermissionService.assertStoreAccessible(member.getStoreId(), "无权限调整该会员积分");
        // 4=手工调整（获得） 7=手工扣减
        int changeType = form.getChangePoints() >= 0 ? 4 : 7;
        memberAssetService.changePoints(memberId, form.getChangePoints(), changeType,
                "MANUAL", null, null, form.getExpireTime(), form.getRemark());
    }

    @Override
    public int expireDuePoints() {
        LocalDateTime now = LocalDateTime.now();
        // sys_tenant 在 ignore-tables，跨租户可查；只处理启用租户
        List<Long> tenantIds = sysTenantService.lambdaQuery()
                .select(SysTenant::getId)
                .eq(SysTenant::getStatus, 1)
                .list()
                .stream().map(SysTenant::getId).toList();
        int total = 0;
        for (Long tenantId : tenantIds) {
            // 逐租户切换上下文：point_log 走 TenantLine 限本租户，写入带正确 tenant_id
            total += TenantContextRunner.run(tenantId, () -> expireDuePointsInTenant(now));
        }
        return total;
    }

    private int expireDuePointsInTenant(LocalDateTime now) {
        List<Long> memberIds = pointLogMapper.selectList(
                Wrappers.<SalonMemberPointLog>lambdaQuery()
                        .select(SalonMemberPointLog::getMemberId)
                        .gt(SalonMemberPointLog::getRemainingPoints, 0)
                        .isNotNull(SalonMemberPointLog::getExpireTime)
                        .lt(SalonMemberPointLog::getExpireTime, now.toLocalDate()))
                .stream().map(SalonMemberPointLog::getMemberId).distinct().toList();
        int count = 0;
        for (Long memberId : memberIds) {
            try {
                int deducted = memberAssetService.expireMemberPoints(memberId, now);
                if (deducted > 0) {
                    count++;
                }
            } catch (Exception e) {
                // 单会员失败不影响其余会员
                log.warn("积分过期清零失败 memberId={}", memberId, e);
            }
        }
        return count;
    }
}
