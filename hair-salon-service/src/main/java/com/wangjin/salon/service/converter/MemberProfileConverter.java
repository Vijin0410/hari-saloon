package com.wangjin.salon.service.converter;

import com.wangjin.salon.service.model.entity.SalonMemberProfile;
import com.wangjin.salon.service.model.form.MemberProfileForm;
import com.wangjin.salon.service.model.vo.MemberProfileVO;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface MemberProfileConverter {

    MemberProfileVO entity2Vo(SalonMemberProfile entity);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "memberId", ignore = true)
    SalonMemberProfile form2Entity(MemberProfileForm form);
}
