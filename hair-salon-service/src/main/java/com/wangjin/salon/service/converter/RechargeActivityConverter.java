package com.wangjin.salon.service.converter;

import com.wangjin.salon.service.model.entity.SalonRechargeActivity;
import com.wangjin.salon.service.model.form.RechargeActivityForm;
import com.wangjin.salon.service.model.vo.RechargeActivityOptionVO;
import com.wangjin.salon.service.model.vo.RechargeActivityPageVO;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface RechargeActivityConverter {

    RechargeActivityPageVO entity2PageVo(SalonRechargeActivity entity);

    RechargeActivityOptionVO entity2OptionVo(SalonRechargeActivity entity);

    RechargeActivityForm entity2Form(SalonRechargeActivity entity);

    @Mapping(target = "id", ignore = true)
    SalonRechargeActivity form2Entity(RechargeActivityForm form);
}
