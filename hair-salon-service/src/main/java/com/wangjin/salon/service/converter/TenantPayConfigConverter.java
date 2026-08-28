package com.wangjin.salon.service.converter;

import com.wangjin.salon.service.model.entity.SalonTenantPayConfig;
import com.wangjin.salon.service.model.form.TenantPayConfigForm;
import com.wangjin.salon.service.model.vo.TenantPayConfigDetailVO;
import com.wangjin.salon.service.model.vo.TenantPayConfigOptionVO;
import com.wangjin.salon.service.model.vo.TenantPayConfigPageVO;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface TenantPayConfigConverter {

    TenantPayConfigPageVO entity2PageVo(SalonTenantPayConfig entity);

    /** 同名字段拷贝；敏感字段（apiV3Key/privateKey 等）在 DetailVO 无同名字段自动忽略，掩码 tail/set 由 Service 补充 */
    TenantPayConfigDetailVO entity2DetailVo(SalonTenantPayConfig entity);

    TenantPayConfigOptionVO entity2OptionVo(SalonTenantPayConfig entity);

    /** 表单转实体：敏感字段加密与状态流转由 Service 处理（Converter 不依赖加密组件） */
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "status", ignore = true)
    SalonTenantPayConfig form2Entity(TenantPayConfigForm form);
}
