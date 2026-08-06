package com.wangjin.salon.service.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.wangjin.salon.service.model.entity.SalonMemberLevel;
import com.wangjin.salon.service.model.entity.SalonMemberTag;
import com.wangjin.salon.service.service.MemberLevelService;
import com.wangjin.salon.service.service.MemberTagService;
import com.wangjin.salon.system.service.SalonMemberPort;
import com.wangjin.salon.system.util.TenantContextRunner;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * {@link SalonMemberPort} 在 service 模块的实现：跨模块会员资产端口。
 * <p>
 * 供 system 模块（租户开通）调用，从源租户复制会员等级/标签到当前租户。
 * 调用方须已在目标租户上下文内；实现用 {@link TenantContextRunner} 切到源租户读取模板。
 */
@Service
@RequiredArgsConstructor
public class SalonMemberPortImpl implements SalonMemberPort {

    private final MemberLevelService levelService;
    private final MemberTagService tagService;

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void copyMemberLevel(Long fromTenantId) {
        List<SalonMemberLevel> source = TenantContextRunner.run(fromTenantId, () ->
                levelService.list(new LambdaQueryWrapper<>()));
        if (source.isEmpty()) {
            return;
        }
        // 幂等：当前租户已有等级则跳过
        if (levelService.count(new LambdaQueryWrapper<>()) > 0) {
            return;
        }
        List<SalonMemberLevel> targets = source.stream().map(l -> {
            SalonMemberLevel t = new SalonMemberLevel();
            t.setName(l.getName());
            t.setLevelNo(l.getLevelNo());
            t.setServiceDiscount(l.getServiceDiscount());
            t.setGoodsDiscount(l.getGoodsDiscount());
            t.setPointRate(l.getPointRate());
            t.setRechargeGiftRate(l.getRechargeGiftRate());
            t.setUpgradeThreshold(l.getUpgradeThreshold());
            t.setRights(l.getRights());
            t.setSort(l.getSort());
            t.setStatus(l.getStatus());
            t.setRemark(l.getRemark());
            return t;
        }).toList();
        levelService.saveBatch(targets);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void copyMemberTag(Long fromTenantId) {
        List<SalonMemberTag> source = TenantContextRunner.run(fromTenantId, () ->
                tagService.list(new LambdaQueryWrapper<>()));
        if (source.isEmpty()) {
            return;
        }
        if (tagService.count(new LambdaQueryWrapper<>()) > 0) {
            return;
        }
        List<SalonMemberTag> targets = source.stream().map(tg -> {
            SalonMemberTag t = new SalonMemberTag();
            t.setName(tg.getName());
            t.setColor(tg.getColor());
            t.setSort(tg.getSort());
            t.setStatus(tg.getStatus());
            t.setRemark(tg.getRemark());
            return t;
        }).toList();
        tagService.saveBatch(targets);
    }
}
