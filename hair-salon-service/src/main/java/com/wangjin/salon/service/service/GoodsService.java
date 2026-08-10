package com.wangjin.salon.service.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.IService;
import com.wangjin.salon.service.model.entity.SalonGoods;
import com.wangjin.salon.service.model.form.GoodsForm;
import com.wangjin.salon.service.model.query.GoodsPageQuery;
import com.wangjin.salon.service.model.vo.GoodsOptionVO;
import com.wangjin.salon.service.model.vo.GoodsPageVO;

import java.util.List;

public interface GoodsService extends IService<SalonGoods> {

    Page<GoodsPageVO> getPage(GoodsPageQuery query);

    GoodsForm getForm(Long id);

    Long save(GoodsForm form);

    boolean update(Long id, GoodsForm form);

    boolean delete(String ids);

    List<GoodsOptionVO> options();
}
