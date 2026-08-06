package com.wangjin.salon.service.service.impl;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.wangjin.salon.service.converter.MemberProfileConverter;
import com.wangjin.salon.service.mapper.SalonMemberProfileMapper;
import com.wangjin.salon.service.model.entity.SalonMemberProfile;
import com.wangjin.salon.service.model.form.MemberProfileForm;
import com.wangjin.salon.service.model.vo.MemberProfileVO;
import com.wangjin.salon.service.service.MemberProfileService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class MemberProfileServiceImpl implements MemberProfileService {

    private final SalonMemberProfileMapper profileMapper;
    private final MemberProfileConverter profileConverter;

    @Override
    public MemberProfileVO get(Long memberId) {
        SalonMemberProfile profile = profileMapper.selectOne(
                Wrappers.<SalonMemberProfile>lambdaQuery().eq(SalonMemberProfile::getMemberId, memberId));
        return profile == null ? new MemberProfileVO() : profileConverter.entity2Vo(profile);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void update(Long memberId, MemberProfileForm form) {
        SalonMemberProfile exist = profileMapper.selectOne(
                Wrappers.<SalonMemberProfile>lambdaQuery().eq(SalonMemberProfile::getMemberId, memberId));
        if (exist == null) {
            SalonMemberProfile entity = profileConverter.form2Entity(form);
            entity.setMemberId(memberId);
            profileMapper.insert(entity);
        } else {
            SalonMemberProfile entity = profileConverter.form2Entity(form);
            entity.setId(exist.getId());
            entity.setMemberId(memberId);
            profileMapper.updateById(entity);
        }
    }
}
