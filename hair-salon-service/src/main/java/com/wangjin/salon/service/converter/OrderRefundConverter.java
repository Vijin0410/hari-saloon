package com.wangjin.salon.service.converter;

import com.wangjin.salon.service.model.entity.SalonRefundOrder;
import com.wangjin.salon.service.model.entity.SalonRefundPayment;
import com.wangjin.salon.service.model.vo.OrderRefundVO;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface OrderRefundConverter {
    @Mapping(target = "payments", ignore = true)
    OrderRefundVO entity2Vo(SalonRefundOrder entity);
    OrderRefundVO.Payment payment2Vo(SalonRefundPayment entity);
}
