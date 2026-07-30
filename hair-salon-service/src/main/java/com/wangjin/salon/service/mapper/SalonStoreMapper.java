package com.wangjin.salon.service.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.wangjin.salon.service.model.entity.SalonStore;
import com.wangjin.salon.service.model.query.StorePageQuery;
import com.wangjin.salon.service.model.vo.StorePageVO;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface SalonStoreMapper extends BaseMapper<SalonStore> {

    Page<StorePageVO> getStorePage(Page<StorePageVO> page, @Param("q") StorePageQuery query);
}
