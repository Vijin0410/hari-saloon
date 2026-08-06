package com.wangjin.salon.service.converter;

import com.wangjin.salon.service.model.entity.SalonMemberLevel;
import com.wangjin.salon.service.model.form.MemberLevelForm;
import com.wangjin.salon.service.model.vo.MemberLevelOptionVO;
import com.wangjin.salon.service.model.vo.MemberLevelPageVO;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface MemberLevelConverter {

    MemberLevelPageVO entity2PageVo(SalonMemberLevel entity);

    MemberLevelOptionVO entity2OptionVo(SalonMemberLevel entity);

    MemberLevelForm entity2Form(SalonMemberLevel entity);

    @Mapping(target = "id", ignore = true)
    SalonMemberLevel form2Entity(MemberLevelForm form);
}
