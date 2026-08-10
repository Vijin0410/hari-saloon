package com.wangjin.salon.service.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.IService;
import com.wangjin.salon.service.model.entity.SalonGoodsCategory;
import com.wangjin.salon.service.model.form.GoodsCategoryForm;
import com.wangjin.salon.service.model.query.GoodsCategoryPageQuery;
import com.wangjin.salon.service.model.vo.GoodsCategoryOptionVO;
import com.wangjin.salon.service.model.vo.GoodsCategoryPageVO;

import java.util.List;

public interface GoodsCategoryService extends IService<SalonGoodsCategory> {

    Page<GoodsCategoryPageVO> getPage(GoodsCategoryPageQuery query);

    GoodsCategoryForm getForm(Long id);

    Long save(GoodsCategoryForm form);

    boolean update(Long id, GoodsCategoryForm form);

    boolean delete(String ids);

    List<GoodsCategoryOptionVO> options();
}
