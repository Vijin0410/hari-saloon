package com.wangjin.salon.service.converter;

import com.wangjin.salon.service.model.entity.SalonGoods;
import com.wangjin.salon.service.model.form.GoodsForm;
import com.wangjin.salon.service.model.vo.GoodsOptionVO;
import com.wangjin.salon.service.model.vo.GoodsPageVO;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface GoodsConverter {

    GoodsPageVO entity2PageVo(SalonGoods entity);

    GoodsOptionVO entity2OptionVo(SalonGoods entity);

    GoodsForm entity2Form(SalonGoods entity);

    @Mapping(target = "id", ignore = true)
    SalonGoods form2Entity(GoodsForm form);
}
