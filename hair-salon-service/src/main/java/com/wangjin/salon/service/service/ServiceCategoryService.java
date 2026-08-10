package com.wangjin.salon.service.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.IService;
import com.wangjin.salon.service.model.entity.SalonServiceCategory;
import com.wangjin.salon.service.model.form.ServiceCategoryForm;
import com.wangjin.salon.service.model.query.ServiceCategoryPageQuery;
import com.wangjin.salon.service.model.vo.ServiceCategoryOptionVO;
import com.wangjin.salon.service.model.vo.ServiceCategoryPageVO;

import java.util.List;

public interface ServiceCategoryService extends IService<SalonServiceCategory> {

    Page<ServiceCategoryPageVO> getPage(ServiceCategoryPageQuery query);

    ServiceCategoryForm getForm(Long id);

    Long save(ServiceCategoryForm form);

    boolean update(Long id, ServiceCategoryForm form);

    boolean delete(String ids);

    List<ServiceCategoryOptionVO> options();
}
