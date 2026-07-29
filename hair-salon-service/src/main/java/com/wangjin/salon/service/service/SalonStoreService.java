package com.wangjin.salon.service.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.IService;
import com.wangjin.salon.service.model.entity.SalonStore;
import com.wangjin.salon.service.model.form.StoreForm;
import com.wangjin.salon.service.model.query.StorePageQuery;
import com.wangjin.salon.service.model.vo.StoreDetailVO;
import com.wangjin.salon.service.model.vo.StorePageVO;

public interface SalonStoreService extends IService<SalonStore> {

    Page<StorePageVO> getStorePage(StorePageQuery query);

    StoreDetailVO getDetail(Long id);

    Long saveStore(StoreForm form);

    boolean updateStore(Long id, StoreForm form);

    boolean deleteStores(String ids);
}
