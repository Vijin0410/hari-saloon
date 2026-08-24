package com.wangjin.salon.service.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.wangjin.salon.service.model.entity.SalonRechargeOrder;
import com.wangjin.salon.service.model.query.RechargeOrderPageQuery;
import com.wangjin.salon.service.model.vo.RechargeOrderPageVO;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface SalonRechargeOrderMapper extends BaseMapper<SalonRechargeOrder> {

    /**
     * 充值记录分页（关联会员/门店/活动/操作人，含门店数据权限过滤）。
     */
    Page<RechargeOrderPageVO> getRechargePage(Page<RechargeOrderPageVO> page, @Param("q") RechargeOrderPageQuery query);

    /**
     * 充值记录详情（按 id，关联会员/门店/活动/操作人）。
     */
    RechargeOrderPageVO getRechargeById(@Param("id") Long id);
}
