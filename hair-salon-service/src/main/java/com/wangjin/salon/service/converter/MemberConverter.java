package com.wangjin.salon.service.converter;

import com.wangjin.salon.service.model.entity.SalonMember;
import com.wangjin.salon.service.model.form.MemberForm;
import com.wangjin.salon.service.model.vo.MemberDetailVO;
import com.wangjin.salon.service.model.vo.MemberPageVO;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface MemberConverter {

    MemberPageVO entity2PageVo(SalonMember entity);

    MemberDetailVO entity2DetailVo(SalonMember entity);

    @Mapping(target = "id", ignore = true)
    SalonMember form2Entity(MemberForm form);
}
