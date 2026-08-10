package com.wangjin.salon.service.converter;

import com.wangjin.salon.service.model.entity.SalonServiceItem;
import com.wangjin.salon.service.model.form.ServiceItemForm;
import com.wangjin.salon.service.model.vo.ServiceItemOptionVO;
import com.wangjin.salon.service.model.vo.ServiceItemPageVO;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface ServiceItemConverter {

    ServiceItemPageVO entity2PageVo(SalonServiceItem entity);

    ServiceItemOptionVO entity2OptionVo(SalonServiceItem entity);

    ServiceItemForm entity2Form(SalonServiceItem entity);

    @Mapping(target = "id", ignore = true)
    SalonServiceItem form2Entity(ServiceItemForm form);
}
