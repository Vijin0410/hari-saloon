package com.wangjin.salon.service.service.impl;

import cn.hutool.core.lang.Assert;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.wangjin.salon.service.mapper.SalonMemberMapper;
import com.wangjin.salon.service.mapper.SalonMemberPointLogMapper;
import com.wangjin.salon.service.model.entity.SalonMember;
import com.wangjin.salon.service.model.form.MemberPointAdjustForm;
import com.wangjin.salon.service.model.query.MemberPointLogPageQuery;
import com.wangjin.salon.service.model.vo.MemberPointLogVO;
import com.wangjin.salon.service.service.MemberAssetService;
import com.wangjin.salon.service.service.MemberPointService;
import com.wangjin.salon.service.service.SalonStorePermissionService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class MemberPointServiceImpl implements MemberPointService {

    private final SalonMemberMapper memberMapper;
    private final SalonMemberPointLogMapper pointLogMapper;
    private final MemberAssetService memberAssetService;
    private final SalonStorePermissionService storePermissionService;

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
}
