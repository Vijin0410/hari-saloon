package com.wangjin.salon.service.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.wangjin.salon.service.model.entity.SalonOrder;
import com.wangjin.salon.service.model.form.OrderPayForm;
import com.wangjin.salon.service.model.form.OrderSaveForm;
import com.wangjin.salon.service.model.query.OrderPageQuery;
import com.wangjin.salon.service.model.vo.OrderDetailVO;
import com.wangjin.salon.service.model.vo.OrderPageVO;
import com.wangjin.salon.service.model.vo.OrderPayStatusVO;
import com.wangjin.salon.service.model.vo.OrderPrepayVO;

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
     * 修改挂单（仅 status=0；明细整体重建；扫码支付挂起期间拒绝）。
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
     * 订单扫码预下单（组合支付中含微信/支付宝行时出码）：
     * 校验（与结算同口径）+ 库存预检 + 支付流水 pending（表单快照）+ 渠道下单；
     * 确认结算由回调/查单补偿驱动（OrderPayConfirmExecutor，幂等）。
     *
     * @param orderId 订单ID（须为挂单）
     * @return 二维码内容（收银台渲染 + 轮询订单状态）
     */
    OrderPrepayVO prepayScan(Long orderId, OrderPayForm form);

    /**
     * 取消订单扫码支付（关 pending 流水，订单保持挂单可重新发起支付/手动结算）。
     */
    void cancelPrepay(Long orderId);

    /**
     * 订单支付状态（收银台扫码轮询）。
     */
    OrderPayStatusVO getPayStatus(Long orderId);

    /**
     * 结算执行（不含订单占坑；手动结算与扫码回调确认共用）：
     * 校验 -> 积分抵扣 -> 余额支付（先赠送后本金）-> 支付明细入库 -> 订单金额落定 ->
     * 商品库存扣减 -> 消费送积分 -> 累计消费 -> 等级升级检查。
     */
    void settle(SalonOrder order, OrderPayForm form);

    /**
     * 取消挂单（仅 status=0；同步关闭挂起的扫码流水）。
     */
    boolean cancel(Long id);
}
