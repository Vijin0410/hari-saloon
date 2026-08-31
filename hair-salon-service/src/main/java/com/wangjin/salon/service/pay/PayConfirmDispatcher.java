package com.wangjin.salon.service.pay;

import com.wangjin.salon.service.model.entity.SalonPayRecord;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * 支付确认分发器：按流水 bizType 路由到业务确认链路（充值/订单），
 * 回调（微信/支付宝）与查单补偿统一走这里，新业务类型加分支即可。
 */
@Component
@RequiredArgsConstructor
public class PayConfirmDispatcher {

    private final RechargePayConfirmExecutor rechargeExecutor;
    private final OrderPayConfirmExecutor orderExecutor;

    /**
     * 确认支付并入账（幂等：重复回调/回调与查单补偿竞争时只入账一次）。
     *
     * @return true=本次完成入账；false=此前已处理（幂等跳过）
     */
    public boolean confirm(SalonPayRecord record, PayConfirmParams params) {
        if (record.getBizType() == null) {
            throw new IllegalArgumentException("支付流水缺少业务类型：" + record.getId());
        }
        return switch (record.getBizType()) {
            case SalonPayRecord.BIZ_TYPE_RECHARGE -> rechargeExecutor.confirm(record, params);
            case SalonPayRecord.BIZ_TYPE_ORDER -> orderExecutor.confirm(record, params);
            default -> throw new IllegalArgumentException("不支持的支付业务类型：" + record.getBizType());
        };
    }
}
