package com.wangjin.salon.system.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.IService;
import com.wangjin.common.web.model.Option;
import com.wangjin.salon.system.model.entity.SysTenant;
import com.wangjin.salon.system.model.form.TenantForm;
import com.wangjin.salon.system.model.query.TenantPageQuery;
import com.wangjin.salon.system.model.vo.TenantPageVO;

import java.util.List;

public interface SysTenantService extends IService<SysTenant> {

    Page<TenantPageVO> getTenantPage(TenantPageQuery query);

    TenantForm getTenantForm(Long id);

    boolean saveTenant(TenantForm form);

    boolean updateTenant(Long id, TenantForm form);

    boolean deleteTenants(String ids);

    boolean updateStatus(Long id, Integer status);

    List<Option<Long>> listOptions();

    /**
     * 按编码查启用中的租户（登录用）。
     */
    SysTenant getByCode(String code);
}
