package com.wangjin.salon.service.pay;

import cn.hutool.core.util.StrUtil;
import cn.hutool.json.JSONUtil;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.wangjin.common.exception.BizException;
import com.wangjin.salon.service.mapper.SalonOrderMapper;
import com.wangjin.salon.service.mapper.SalonPayRecordMapper;
import com.wangjin.salon.service.model.entity.SalonOrder;
import com.wangjin.salon.service.model.entity.SalonPayRecord;
import com.wangjin.salon.service.model.form.OrderPayForm;
import com.wangjin.salon.service.service.OrderService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * 订单扫码支付确认执行器（回调与查单补偿共用，渠道无关：微信/支付宝同链路）。
 * <p>
 * 独立 bean 保证 {@code @Transactional} 生效（占坑与结算须同事务，防自调用失效）；
 * 订单条件更新 status 0->1 占坑防并发/重复回调，占坑失败即已处理过（幂等成功返回）；
 * 结算表单取自流水快照 biz_form（出码时落），保证与出码口径一致；须在租户上下文内调用。
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class OrderPayConfirmExecutor {

    private final SalonPayRecordMapper payRecordMapper;
    private final SalonOrderMapper orderMapper;
    private final OrderService orderService;

    /**
     * 确认支付并结算（幂等：重复回调/回调与查单补偿竞争时只结算一次）。
     *
     * @param record 支付流水（pending，bizType=订单）
     * @param params 渠道确认参数（金额口径见 {@link PayConfirmParams}）
     * @return true=本次完成结算；false=此前已处理（幂等跳过）
     */
    @Transactional(rollbackFor = Exception.class)
    public boolean confirm(SalonPayRecord record, PayConfirmParams params) {
        // 金额校验：渠道订单金额须与扫码行下单金额一致（分）；不一致拒绝自动结算（告警人工介入，渠道重试也无害）
        int expectedFen = record.getAmount().multiply(BigDecimal.valueOf(100))
                .setScale(0, RoundingMode.HALF_UP).intValueExact();
        if (params.totalFen() == null || params.totalFen() != expectedFen) {
            log.error("支付金额与下单金额不一致，拒绝自动结算 outTradeNo={} 下单分={} 渠道分={}",
                    record.getOutTradeNo(), expectedFen, params.totalFen());
            throw new BizException("支付金额与下单金额不一致，已拒绝自动结算");
        }
        // 订单占坑：status 0->1 条件更新（并发/重试只成功一次；结算失败整体回滚回到挂单）
        int claimed = orderMapper.update(null, Wrappers.<SalonOrder>lambdaUpdate()
                .set(SalonOrder::getStatus, SalonOrder.STATUS_PAID)
                .eq(SalonOrder::getId, record.getBizId())
                .eq(SalonOrder::getStatus, SalonOrder.STATUS_PENDING));
        if (claimed == 0) {
            log.info("订单已确认过，幂等跳过结算 orderId={} outTradeNo={}", record.getBizId(), record.getOutTradeNo());
            markRecordPaid(record, params);
            return false;
        }
        SalonOrder order = orderMapper.selectById(record.getBizId());
        // 结算：反序列化出码时的表单快照重放（校验/扣减/明细/库存/积分，与手动结算同链路）
        OrderPayForm form = parseBizForm(record);
        var snapshot = JSONUtil.parseObj(record.getBizForm());
        if (snapshot.containsKey("pointsEnabledSnapshot")) {
            order.setPointsEnabledSnapshot(snapshot.getInt("pointsEnabledSnapshot"));
            order.setPointRateSnapshot(snapshot.getBigDecimal("pointRateSnapshot"));
        }
        orderService.settle(order, form);
        markRecordPaid(record, params);
        log.info("订单扫码支付确认完成 orderId={} outTradeNo={} transactionId={} source={}",
                record.getBizId(), record.getOutTradeNo(), params.transactionId(), params.source());
        return true;
    }

    /** 流水 pending->paid（条件更新兜底，已 paid 时无变化；同时落用户实付） */
    private void markRecordPaid(SalonPayRecord record, PayConfirmParams params) {
        payRecordMapper.update(null, Wrappers.<SalonPayRecord>lambdaUpdate()
                .set(SalonPayRecord::getStatus, SalonPayRecord.STATUS_PAID)
                .set(SalonPayRecord::getTransactionId, params.transactionId())
                .set(SalonPayRecord::getSource, params.source())
                .set(SalonPayRecord::getPaidAt, params.paidAt())
                .set(SalonPayRecord::getRawPayload, params.rawPayload())
                .set(SalonPayRecord::getPayerAmount, RechargePayConfirmExecutor.fenToYuan(params.payerTotalFen()))
                .eq(SalonPayRecord::getId, record.getId())
                .eq(SalonPayRecord::getStatus, SalonPayRecord.STATUS_PENDING));
    }

    /** 表单快照反序列化（出码时落库，缺失/损坏即数据异常拒绝自动结算） */
    private OrderPayForm parseBizForm(SalonPayRecord record) {
        if (StrUtil.isBlank(record.getBizForm())) {
            throw new BizException("订单扫码流水缺少结算表单快照 outTradeNo=" + record.getOutTradeNo());
        }
        try {
            return JSONUtil.toBean(record.getBizForm(), OrderPayForm.class);
        } catch (Exception e) {
            throw new BizException("订单扫码流水表单快照解析失败 outTradeNo=" + record.getOutTradeNo());
        }
    }
}
