package com.wangjin.salon.service.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.IService;
import com.wangjin.salon.service.model.entity.SalonServiceItem;
import com.wangjin.salon.service.model.form.ServiceItemForm;
import com.wangjin.salon.service.model.query.ServiceItemPageQuery;
import com.wangjin.salon.service.model.vo.ServiceItemOptionVO;
import com.wangjin.salon.service.model.vo.ServiceItemPageVO;

import java.util.List;

public interface ServiceItemService extends IService<SalonServiceItem> {

    Page<ServiceItemPageVO> getPage(ServiceItemPageQuery query);

    ServiceItemForm getForm(Long id);

    Long save(ServiceItemForm form);

    boolean update(Long id, ServiceItemForm form);

    boolean delete(String ids);

    List<ServiceItemOptionVO> options();
}
