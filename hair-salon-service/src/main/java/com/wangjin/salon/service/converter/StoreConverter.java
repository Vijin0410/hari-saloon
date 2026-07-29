package com.wangjin.salon.service.converter;

import com.wangjin.salon.service.model.entity.SalonStore;
import com.wangjin.salon.service.model.form.StoreForm;
import com.wangjin.salon.service.model.vo.StoreDetailVO;
import com.wangjin.salon.service.model.vo.StorePageVO;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface StoreConverter {

    StorePageVO entity2PageVo(SalonStore entity);

    StoreDetailVO entity2DetailVo(SalonStore entity);

    @Mapping(target = "id", ignore = true)
    SalonStore form2Entity(StoreForm form);
}
