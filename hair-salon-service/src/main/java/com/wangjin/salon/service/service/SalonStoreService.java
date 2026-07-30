package com.wangjin.salon.service.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.IService;
import com.wangjin.salon.service.model.entity.SalonStore;
import com.wangjin.salon.service.model.form.StoreForm;
import com.wangjin.salon.service.model.query.StorePageQuery;
import com.wangjin.salon.service.model.vo.StoreDetailVO;
import com.wangjin.salon.service.model.vo.StorePageVO;
import com.wangjin.common.web.model.Option;

import java.util.List;

public interface SalonStoreService extends IService<SalonStore> {

    Page<StorePageVO> getStorePage(StorePageQuery query);

    List<Option<Long>> listStoreOptions();

    StoreDetailVO getDetail(Long id);

    Long saveStore(StoreForm form);

    boolean updateStore(Long id, StoreForm form);

    boolean deleteStores(String ids);
}
