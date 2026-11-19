package com.wangjin.salon.service.converter;

import com.wangjin.salon.service.model.entity.SalonOrderStaffChange;
import com.wangjin.salon.service.model.vo.OrderStaffChangeVO;
import org.mapstruct.Mapper;
import org.mapstruct.BeanMapping;
import org.mapstruct.Context;
import org.mapstruct.Mapping;
import com.wangjin.salon.service.model.entity.SalonOrderItem;
import com.wangjin.salon.service.model.form.OrderStaffCorrectionForm;
import java.util.Map;

@Mapper(componentModel = "spring")
public interface OrderStaffChangeConverter {
    OrderStaffChangeVO entity2Vo(SalonOrderStaffChange entity);

    @BeanMapping(ignoreByDefault = true)
    @Mapping(target = "tenantId", source = "before.tenantId")
    @Mapping(target = "orderId", source = "before.orderId")
    @Mapping(target = "orderItemId", source = "before.id")
    @Mapping(target = "itemName", source = "before.itemName")
    @Mapping(target = "beforeStaffId", source = "before.staffId")
    @Mapping(target = "beforeAssistantId", source = "before.assistantId")
    @Mapping(target = "afterStaffId", source = "after.staffId")
    @Mapping(target = "afterAssistantId", source = "after.assistantId")
    @Mapping(target = "beforeStaffName", expression = "java(name(before.getStaffId(), names))")
    @Mapping(target = "beforeAssistantName", expression = "java(name(before.getAssistantId(), names))")
    @Mapping(target = "afterStaffName", expression = "java(name(after.getStaffId(), names))")
    @Mapping(target = "afterAssistantName", expression = "java(name(after.getAssistantId(), names))")
    @Mapping(target = "reason", expression = "java(reason.trim())")
    @Mapping(target = "operatorName", source = "operatorName")
    SalonOrderStaffChange createChange(SalonOrderItem before, OrderStaffCorrectionForm.Item after,
                                      String reason, String operatorName, @Context Map<Long,String> names);

    default String name(Long id, @Context Map<Long,String> names) {
        return id == null ? null : names.get(id);
    }
}
