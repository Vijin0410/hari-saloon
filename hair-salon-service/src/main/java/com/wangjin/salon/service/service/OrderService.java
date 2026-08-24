package com.wangjin.salon.service.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.wangjin.salon.service.model.form.OrderPayForm;
import com.wangjin.salon.service.model.form.OrderSaveForm;
import com.wangjin.salon.service.model.query.OrderPageQuery;
import com.wangjin.salon.service.model.vo.OrderDetailVO;
import com.wangjin.salon.service.model.vo.OrderPageVO;

public interface OrderService {

    Page<OrderPageVO> getPage(OrderPageQuery query);

    OrderDetailVO getDetail(Long id);

    /**
     * 开单挂单：明细快照 + 金额计算（会员等级折扣按行），status=0 待结算。
     *
     * @return 订单ID
     */
    Long savePending(OrderSaveForm form);

    /**
     * 修改挂单（仅 status=0；明细整体重建）。
     */
    boolean updatePending(Long id, OrderSaveForm form);

    /**
     * 结算支付（手动确认收款模式）：
     * 条件更新占坑 -> 积分抵扣 -> 余额支付（先赠送后本金）-> 支付明细入库 -> 找零 ->
     * 商品库存扣减 -> 消费送积分 -> 累计消费 -> 等级升级检查。
     *
     * @param orderId 订单ID（须为挂单）
     * @return 订单ID
     */
    Long pay(Long orderId, OrderPayForm form);

    /**
     * 取消挂单（仅 status=0）。
     */
    boolean cancel(Long id);
}
