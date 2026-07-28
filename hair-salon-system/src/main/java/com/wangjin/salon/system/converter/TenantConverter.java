package com.wangjin.salon.system.converter;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.wangjin.salon.system.model.entity.SysTenant;
import com.wangjin.salon.system.model.form.TenantForm;
import com.wangjin.salon.system.model.vo.TenantPageVO;
import org.mapstruct.Mapper;

/**
 * 租户对象转换器
 */
@Mapper(componentModel = "spring")
public interface TenantConverter {

    Page<TenantPageVO> entity2Page(Page<SysTenant> page);

    TenantForm entity2Form(SysTenant entity);

    SysTenant form2Entity(TenantForm form);
}
