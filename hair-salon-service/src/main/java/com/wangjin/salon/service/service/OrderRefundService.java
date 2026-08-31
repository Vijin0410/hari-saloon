package com.wangjin.salon.service.service;

import com.wangjin.salon.service.model.form.OrderRefundForm;
import com.wangjin.salon.service.model.vo.OrderRefundVO;

import java.util.List;

/**
 * 订单退款（P6，docs/payment-design.md §9 阶段5）。
 */
public interface OrderRefundService {

    /**
     * 发起退款（整单或部分金额）：门店权限校验 -> 校验可退余额（实收-已退-处理中）->
     * 服务端贪心分摊（先系统内后外部：余额->现金->银行卡->其他->微信->支付宝）->
     * 落退款单（处理中）+ 分摊行 -> 外部渠道行调渠道退款（支付宝同步/微信异步）->
     * 无异步渠道行时同步确认生效（系统内退回 + 订单状态流转，见 OrderRefundConfirmExecutor）。
     *
     * @param orderId 订单ID（须为已支付/部分退款）
     * @param form   退款表单（金额 + 原因）
     * @return 退款记录（status=0 处理中=渠道异步确认 / 1 成功=已生效）
     */
    OrderRefundVO apply(Long orderId, OrderRefundForm form);

    /**
     * 订单退款记录（含分摊明细，时间倒序）。
     */
    List<OrderRefundVO> listByOrder(Long orderId);
}
