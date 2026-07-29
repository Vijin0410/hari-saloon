package com.wangjin.salon.system.converter;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.wangjin.salon.system.model.entity.SysTenant;
import com.wangjin.salon.system.model.form.TenantForm;
import com.wangjin.salon.system.model.vo.TenantPageVO;
import org.mapstruct.BeanMapping;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.ReportingPolicy;

/**
 * 租户对象转换器
 */
@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface TenantConverter {

    Page<TenantPageVO> entity2Page(Page<SysTenant> page);

    @Mapping(target = "adminUsername", ignore = true)
    @Mapping(target = "adminNickname", ignore = true)
    @Mapping(target = "adminPassword", ignore = true)
    TenantForm entity2Form(SysTenant entity);

    @BeanMapping(ignoreUnmappedSourceProperties = {"adminUsername", "adminNickname", "adminPassword"})
    @Mapping(target = "id", ignore = true)
    SysTenant form2Entity(TenantForm form);
}
