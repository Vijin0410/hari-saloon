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

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "tenantId", ignore = true)
    @Mapping(target = "createBy", ignore = true)
    @Mapping(target = "createTime", ignore = true)
    @Mapping(target = "updateBy", ignore = true)
    @Mapping(target = "updateTime", ignore = true)
    @Mapping(target = "deleted", ignore = true)
    @Mapping(target = "cardImage", ignore = true)
    SalonMemberLevel copyForTenant(SalonMemberLevel source);
}
