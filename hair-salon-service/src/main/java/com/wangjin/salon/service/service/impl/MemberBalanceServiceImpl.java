package com.wangjin.salon.service.service.impl;

import cn.hutool.core.lang.Assert;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.wangjin.salon.service.mapper.SalonMemberBalanceLogMapper;
import com.wangjin.salon.service.mapper.SalonMemberBalanceMapper;
import com.wangjin.salon.service.mapper.SalonMemberMapper;
import com.wangjin.salon.service.model.entity.SalonMember;
import com.wangjin.salon.service.model.entity.SalonMemberBalance;
import com.wangjin.salon.service.model.form.MemberBalanceAdjustForm;
import com.wangjin.salon.service.model.query.MemberBalanceLogPageQuery;
import com.wangjin.salon.service.model.vo.MemberBalanceLogVO;
import com.wangjin.salon.service.model.vo.MemberBalanceVO;
import com.wangjin.salon.service.service.MemberAssetService;
import com.wangjin.salon.service.service.MemberBalanceService;
import com.wangjin.salon.service.service.SalonStorePermissionService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

@Service
@RequiredArgsConstructor
public class MemberBalanceServiceImpl implements MemberBalanceService {

    private final SalonMemberMapper memberMapper;
    private final SalonMemberBalanceMapper balanceMapper;
    private final SalonMemberBalanceLogMapper balanceLogMapper;
    private final MemberAssetService memberAssetService;
    private final SalonStorePermissionService storePermissionService;

    @Override
    public MemberBalanceVO getDetail(Long memberId) {
        SalonMember member = memberMapper.selectById(memberId);
        Assert.notNull(member, "会员不存在");
        storePermissionService.assertStoreAccessible(member.getStoreId(), "无权限查看该会员");
        SalonMemberBalance balance = balanceMapper.selectOne(
                Wrappers.<SalonMemberBalance>lambdaQuery().eq(SalonMemberBalance::getMemberId, memberId));
        MemberBalanceVO vo = new MemberBalanceVO();
        if (balance != null) {
            BigDecimal principal = nz(balance.getPrincipalBalance());
            BigDecimal gift = nz(balance.getGiftBalance());
            BigDecimal frozen = nz(balance.getFrozenBalance());
            vo.setPrincipalBalance(principal);
            vo.setGiftBalance(gift);
            vo.setFrozenBalance(frozen);
            // 可用余额 = 本金 + 赠送 - 冻结
            vo.setAvailableBalance(principal.add(gift).subtract(frozen));
            vo.setLastRechargeTime(balance.getLastRechargeTime());
            vo.setLastConsumeTime(balance.getLastConsumeTime());
        }
        return vo;
    }

    @Override
    public Page<MemberBalanceLogVO> getLogPage(MemberBalanceLogPageQuery query) {
        return balanceLogMapper.getLogPage(new Page<>(query.getPageNum(), query.getPageSize()), query);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void adjust(Long memberId, MemberBalanceAdjustForm form) {
        SalonMember member = memberMapper.selectById(memberId);
        Assert.notNull(member, "会员不存在");
        storePermissionService.assertStoreAccessible(member.getStoreId(), "无权限调整该会员余额");
        memberAssetService.changeBalance(memberId, form.getBalanceType(), form.getChangeAmount(),
                5, "MANUAL", null, null, form.getRemark());
    }

    private BigDecimal nz(BigDecimal v) {
        return v == null ? BigDecimal.ZERO : v;
    }
}
