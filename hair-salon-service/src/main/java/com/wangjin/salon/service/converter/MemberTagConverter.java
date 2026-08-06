package com.wangjin.salon.service.converter;

import com.wangjin.salon.service.model.entity.SalonMemberTag;
import com.wangjin.salon.service.model.form.MemberTagForm;
import com.wangjin.salon.service.model.vo.MemberTagOptionVO;
import com.wangjin.salon.service.model.vo.MemberTagVO;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface MemberTagConverter {

    MemberTagVO entity2Vo(SalonMemberTag entity);

    MemberTagOptionVO entity2OptionVo(SalonMemberTag entity);

    MemberTagForm entity2Form(SalonMemberTag entity);

    @Mapping(target = "id", ignore = true)
    SalonMemberTag form2Entity(MemberTagForm form);
}
