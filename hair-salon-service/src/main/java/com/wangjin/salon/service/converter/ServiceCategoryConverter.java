package com.wangjin.salon.service.converter;

import com.wangjin.salon.service.model.entity.SalonServiceCategory;
import com.wangjin.salon.service.model.form.ServiceCategoryForm;
import com.wangjin.salon.service.model.vo.ServiceCategoryOptionVO;
import com.wangjin.salon.service.model.vo.ServiceCategoryPageVO;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface ServiceCategoryConverter {

    ServiceCategoryPageVO entity2PageVo(SalonServiceCategory entity);

    ServiceCategoryOptionVO entity2OptionVo(SalonServiceCategory entity);

    ServiceCategoryForm entity2Form(SalonServiceCategory entity);

    @Mapping(target = "id", ignore = true)
    SalonServiceCategory form2Entity(ServiceCategoryForm form);
}
