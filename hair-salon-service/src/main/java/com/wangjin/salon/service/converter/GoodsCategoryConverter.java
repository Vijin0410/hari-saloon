package com.wangjin.salon.service.converter;

import com.wangjin.salon.service.model.entity.SalonGoodsCategory;
import com.wangjin.salon.service.model.form.GoodsCategoryForm;
import com.wangjin.salon.service.model.vo.GoodsCategoryOptionVO;
import com.wangjin.salon.service.model.vo.GoodsCategoryPageVO;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface GoodsCategoryConverter {

    GoodsCategoryPageVO entity2PageVo(SalonGoodsCategory entity);

    GoodsCategoryOptionVO entity2OptionVo(SalonGoodsCategory entity);

    GoodsCategoryForm entity2Form(SalonGoodsCategory entity);

    @Mapping(target = "id", ignore = true)
    SalonGoodsCategory form2Entity(GoodsCategoryForm form);
}
