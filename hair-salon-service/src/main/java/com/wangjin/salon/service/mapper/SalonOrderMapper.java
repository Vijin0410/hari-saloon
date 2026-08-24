package com.wangjin.salon.service.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.wangjin.salon.service.model.entity.SalonOrder;
import com.wangjin.salon.service.model.query.OrderPageQuery;
import com.wangjin.salon.service.model.vo.OrderPageVO;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface SalonOrderMapper extends BaseMapper<SalonOrder> {

    /**
     * 订单分页（关联会员/门店，含门店数据权限过滤）。
     */
    Page<OrderPageVO> getOrderPage(Page<OrderPageVO> page, @Param("q") OrderPageQuery query);

    /**
     * 订单详情基础信息（按 id，关联会员/门店）。
     */
    OrderPageVO getOrderById(@Param("id") Long id);
}
