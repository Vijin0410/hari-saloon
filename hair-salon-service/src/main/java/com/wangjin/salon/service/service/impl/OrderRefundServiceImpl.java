package com.wangjin.salon.service.service.impl;

import cn.hutool.core.date.DateUtil;
import cn.hutool.core.lang.Assert;
import cn.hutool.core.util.RandomUtil;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.wangjin.common.exception.BizException;
import com.wangjin.salon.service.config.PayProperties;
import com.wangjin.salon.service.mapper.SalonOrderMapper;
import com.wangjin.salon.service.mapper.SalonOrderPaymentMapper;
import com.wangjin.salon.service.mapper.SalonPayRecordMapper;
import com.wangjin.salon.service.mapper.SalonRefundOrderMapper;
import com.wangjin.salon.service.mapper.SalonRefundPaymentMapper;
import com.wangjin.salon.service.model.entity.SalonOrder;
import com.wangjin.salon.service.model.entity.SalonOrderPayment;
import com.wangjin.salon.service.model.entity.SalonPayRecord;
import com.wangjin.salon.service.model.entity.SalonRefundOrder;
import com.wangjin.salon.service.model.entity.SalonRefundPayment;
import com.wangjin.salon.service.model.entity.SalonTenantPayConfig;
import com.wangjin.salon.service.model.form.OrderRefundForm;
import com.wangjin.salon.service.model.vo.OrderRefundVO;
import com.wangjin.salon.service.pay.AlipayChannelService;
import com.wangjin.salon.service.pay.ChannelRefundResult;
import com.wangjin.salon.service.pay.OrderRefundConfirmExecutor;
import com.wangjin.salon.service.pay.PayChannel;
import com.wangjin.salon.service.pay.RefundCommand;
import com.wangjin.salon.service.pay.WxpayChannelService;
import com.wangjin.salon.service.service.OrderRefundService;
import com.wangjin.salon.service.service.SalonStorePermissionService;
import com.wangjin.salon.service.service.TenantPayConfigService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

/**
 * 订单退款（P6）：分摊、渠道调用与确认编排。
 * <p>
 * 退款单是整体生效/失败的事务边界：渠道退款 API 异常抛错整体回滚（与扫码出码同模式，无脏单）；
 * 微信退款异步（PROCESSING）提交后由回调/查单兜底驱动确认，失败时系统内不生效（余额/积分未退、订单状态不动）。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class OrderRefundServiceImpl implements OrderRefundService {

    /** 支付方式：1现金 2微信 3支付宝 4银行卡 5会员余额 8其他（与 OrderServiceImpl 一致） */
    private static final int METHOD_CASH = 1;
    private static final int METHOD_WXPAY = 2;
    private static final int METHOD_ALIPAY = 3;
    private static final int METHOD_BANK_CARD = 4;
    private static final int METHOD_BALANCE = 5;
    private static final int METHOD_OTHER = 8;

    /**
     * 分摊优先级（贪心，先系统内后外部，商家资金占用最少）：
     * 余额 -> 现金 -> 银行卡 -> 其他 -> 微信 -> 支付宝；7 积分抵扣不参与资金分摊（积分按累计成功资金比例处理）。
     */
    private static final List<Integer> ALLOCATE_PRIORITY = List.of(
            METHOD_BALANCE, METHOD_CASH, METHOD_BANK_CARD, METHOD_OTHER, METHOD_WXPAY, METHOD_ALIPAY);



    private final com.wangjin.salon.service.converter.OrderRefundConverter refundConverter;
    private final SalonOrderMapper orderMapper;
    private final SalonOrderPaymentMapper orderPaymentMapper;
    private final SalonPayRecordMapper payRecordMapper;
    private final SalonRefundOrderMapper refundOrderMapper;
    private final SalonRefundPaymentMapper refundPaymentMapper;
    private final SalonStorePermissionService storePermissionService;
    private final TenantPayConfigService tenantPayConfigService;
    private final List<PayChannel> payChannels;
    private final PayProperties payProperties;
    private final OrderRefundConfirmExecutor confirmExecutor;
    private final com.wangjin.salon.service.service.RefundPointService refundPointService;

    @Override
    @Transactional(rollbackFor = Exception.class)
    public OrderRefundVO apply(Long orderId, OrderRefundForm form) {
        SalonOrder order = orderMapper.selectOne(Wrappers.<SalonOrder>lambdaQuery()
                .eq(SalonOrder::getId, orderId).last("FOR UPDATE"));
        Assert.notNull(order, "订单不存在");
        storePermissionService.assertStoreAccessible(order.getStoreId(), "无权限退款该订单");
        Assert.isTrue(order.getStatus() == SalonOrder.STATUS_PAID
                        || order.getStatus() == SalonOrder.STATUS_PART_REFUNDED,
                "仅已支付订单可退款");

        // 可退资金 = 实收 - 已占用（处理中+已成功的退款单都占额度，防并发/处理中超退）
        BigDecimal occupied = sumOccupied(orderId);
        BigDecimal refundable = order.getReceivedAmount().subtract(occupied);
        if (form.getRefundAmount().compareTo(refundable) > 0) {
            throw new BizException("退款金额不能超过可退金额 " + refundable.stripTrailingZeros().toPlainString());
        }

        if (refundOrderMapper.selectCount(Wrappers.<SalonRefundOrder>lambdaQuery()
                .eq(SalonRefundOrder::getOrderId, orderId)
                .eq(SalonRefundOrder::getStatus, SalonRefundOrder.STATUS_PROCESSING)) > 0) {
            throw new BizException("该订单已有处理中退款，请等待结果后重试");
        }
        boolean pointsOnly = order.getReceivedAmount().signum() == 0
                && order.getPointDeductPoints() != null && order.getPointDeductPoints() > 0;
        if (form.getRefundAmount().signum() < 0 || (!pointsOnly && form.getRefundAmount().signum() == 0)) {
            throw new BizException("资金退款金额必须大于0；纯积分订单请提交0元全单退积分");
        }

        // 分摊（服务端贪心，不信前端）
        List<Allocation> allocations = allocate(orderId, form.getRefundAmount());
        if (allocations.isEmpty() && !pointsOnly) {
            throw new BizException("无可退款的支付方式");
        }
        BigDecimal balanceRefund = allocations.stream()
                .filter(a -> a.payMethod == METHOD_BALANCE)
                .map(a -> a.amount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // 退款单 + 分摊行（处理中）
        SalonRefundOrder refund = new SalonRefundOrder();
        refund.setStoreId(order.getStoreId());
        refund.setRefundNo("SR" + DateUtil.format(new java.util.Date(), "yyMMddHHmmss") + RandomUtil.randomNumbers(3));
        refund.setOrderId(orderId);
        refund.setOrderNo(order.getOrderNo());
        refund.setMemberId(order.getMemberId());
        refund.setRefundAmount(form.getRefundAmount());
        refundPointService.preview(order, refund);
        refund.setBalanceRefundAmount(balanceRefund);
        refund.setReason(form.getReason());
        refund.setStatus(SalonRefundOrder.STATUS_PROCESSING);
        refundOrderMapper.insert(refund);

        boolean channelPending = false;
        for (Allocation alloc : allocations) {
            SalonRefundPayment row = new SalonRefundPayment();
            row.setRefundId(refund.getId());
            row.setPayMethod(alloc.payMethod);
            row.setAmount(alloc.amount);
            row.setChannelStatus(SalonRefundPayment.CHANNEL_STATUS_PROCESSING);
            // 外部渠道行：绑定原支付流水调渠道退款（原路退回）；手动记账无流水 -> 线下退款（系统内记成功）
            SalonPayRecord boundRecord = null;
            if (alloc.payMethod == METHOD_WXPAY || alloc.payMethod == METHOD_ALIPAY) {
                String channel = alloc.payMethod == METHOD_WXPAY
                        ? WxpayChannelService.CHANNEL : AlipayChannelService.CHANNEL;
                boundRecord = payRecordMapper.selectOne(Wrappers.<SalonPayRecord>lambdaQuery()
                        .eq(SalonPayRecord::getBizType, SalonPayRecord.BIZ_TYPE_ORDER)
                        .eq(SalonPayRecord::getBizId, orderId)
                        .eq(SalonPayRecord::getChannel, channel)
                        .eq(SalonPayRecord::getStatus, SalonPayRecord.STATUS_PAID)
                        .last("LIMIT 1"));
                if (boundRecord != null) {
                    row.setChannel(channel);
                    row.setPayRecordId(boundRecord.getId());
                    row.setOutRefundNo(refund.getRefundNo());
                } else {
                    row.setRemark("线下退款-无系统支付流水");
                }
            }
            refundPaymentMapper.insert(row);
            if (row.getChannel() != null) {
                ChannelRefundResult result = invokeChannelRefund(row, boundRecord, order.getTenantId(), form.getReason());
                if (ChannelRefundResult.PROCESSING.equals(result.status())) {
                    channelPending = true;
                }
            }
        }

        // 无异步渠道行：同步确认生效（余额/积分退回 + 订单状态流转 + 流水 refunded，同一事务）
        if (!channelPending) {
            confirmExecutor.confirm(refund.getId());
        }
        log.info("订单退款发起完成 orderId={} refundNo={} 金额={} 积分退回={} 状态={}",
                orderId, refund.getRefundNo(), refund.getRefundAmount(), refund.getPointRefundPoints(),
                channelPending ? "处理中(渠道异步)" : "已生效");
        return getRefundVO(refund.getId());
    }

    @Override
    public List<OrderRefundVO> listByOrder(Long orderId) {
        SalonOrder order = orderMapper.selectById(orderId);
        Assert.notNull(order, "订单不存在");
        storePermissionService.assertStoreAccessible(order.getStoreId(), "无权限查看该订单退款");
        List<SalonRefundOrder> refunds = refundOrderMapper.selectList(
                Wrappers.<SalonRefundOrder>lambdaQuery()
                        .eq(SalonRefundOrder::getOrderId, orderId)
                        .orderByDesc(SalonRefundOrder::getCreateTime));
        if (refunds.isEmpty()) {
            return List.of();
        }
        List<Long> refundIds = refunds.stream().map(SalonRefundOrder::getId).toList();
        Map<Long, List<SalonRefundPayment>> rowsByRefund = refundPaymentMapper.selectList(
                        Wrappers.<SalonRefundPayment>lambdaQuery().in(SalonRefundPayment::getRefundId, refundIds))
                .stream().collect(Collectors.groupingBy(SalonRefundPayment::getRefundId));
        return refunds.stream()
                .map(r -> toVO(r, rowsByRefund.getOrDefault(r.getId(), List.of())))
                .toList();
    }

    /** 分摊行渠道退款调用（事务内外部 HTTP，失败抛错整体回滚--与扫码出码同模式）；返回 PROCESSING 时由回调/查单兜底确认 */
    private ChannelRefundResult invokeChannelRefund(SalonRefundPayment row, SalonPayRecord record,
                                                    Long tenantId, String reason) {
        PayChannel payChannel = payChannels.stream()
                .filter(c -> c.channel().equals(row.getChannel()))
                .findFirst()
                .orElseThrow(() -> new BizException("支付渠道未接入：" + row.getChannel()));
        SalonTenantPayConfig cfg = tenantPayConfigService.requireActiveConfig(row.getChannel());
        String notifyUrl = AlipayChannelService.CHANNEL.equals(row.getChannel()) ? null
                : payProperties.buildNotifyUrl("wxpay-refund", tenantId);
        try {
            ChannelRefundResult result = payChannel.refund(new RefundCommand(
                    record.getOutTradeNo(), row.getOutRefundNo(), row.getAmount(),
                    record.getAmount(), reason, notifyUrl), cfg);
            if (ChannelRefundResult.FAILED.equals(result.status())) {
                throw new BizException("渠道退款失败：" + row.getChannel());
            }
            refundPaymentMapper.update(null, Wrappers.<SalonRefundPayment>lambdaUpdate()
                    .set(SalonRefundPayment::getChannelRefundNo, result.channelRefundNo())
                    .set(SalonRefundPayment::getRawPayload, result.rawPayload())
                    .eq(SalonRefundPayment::getId, row.getId()));
            return result;
        } catch (BizException e) {
            throw e;
        } catch (Exception e) {
            log.error("渠道退款调用异常 refundNo={} channel={}", row.getOutRefundNo(), row.getChannel(), e);
            throw new BizException("渠道退款失败：" + e.getMessage());
        }
    }

    /**
     * 贪心分摊：按优先级逐方式吃容量（原支付行金额 - 该方式累计已退，处理中+成功均占用）。
     * 手动结算的同方式多行按容量聚合，不逐行绑定。
     */
    private List<Allocation> allocate(Long orderId, BigDecimal refundAmount) {
        // 原支付行按方式聚合（7 积分抵扣不参与资金分摊）
        Map<Integer, BigDecimal> paidByMethod = orderPaymentMapper.selectList(
                        Wrappers.<SalonOrderPayment>lambdaQuery().eq(SalonOrderPayment::getOrderId, orderId))
                .stream()
                .filter(p -> p.getPayMethod() != null && p.getPayMethod() != SalonOrderPayment.METHOD_POINT)
                .collect(Collectors.groupingBy(SalonOrderPayment::getPayMethod,
                        Collectors.reducing(BigDecimal.ZERO, SalonOrderPayment::getAmount, BigDecimal::add)));
        if (paidByMethod.isEmpty()) {
            return List.of();
        }
        // 已退占用按方式聚合
        List<Long> refundIds = refundOrderMapper.selectList(Wrappers.<SalonRefundOrder>lambdaQuery()
                        .select(SalonRefundOrder::getId)
                        .eq(SalonRefundOrder::getOrderId, orderId)
                        .in(SalonRefundOrder::getStatus, SalonRefundOrder.STATUS_PROCESSING, SalonRefundOrder.STATUS_SUCCESS))
                .stream().map(SalonRefundOrder::getId).toList();
        Map<Integer, BigDecimal> refundedByMethod = refundIds.isEmpty() ? Map.of()
                : refundPaymentMapper.selectList(Wrappers.<SalonRefundPayment>lambdaQuery()
                                .in(SalonRefundPayment::getRefundId, refundIds))
                        .stream()
                        .collect(Collectors.groupingBy(SalonRefundPayment::getPayMethod,
                                Collectors.reducing(BigDecimal.ZERO, SalonRefundPayment::getAmount, BigDecimal::add)));
        List<Allocation> result = new ArrayList<>();
        BigDecimal remaining = refundAmount;
        for (int method : ALLOCATE_PRIORITY) {
            if (remaining.compareTo(BigDecimal.ZERO) <= 0) {
                break;
            }
            BigDecimal capacity = paidByMethod.getOrDefault(method, BigDecimal.ZERO)
                    .subtract(refundedByMethod.getOrDefault(method, BigDecimal.ZERO))
                    .max(BigDecimal.ZERO);
            if (capacity.compareTo(BigDecimal.ZERO) <= 0) {
                continue;
            }
            BigDecimal take = remaining.min(capacity);
            result.add(new Allocation(method, take));
            remaining = remaining.subtract(take);
        }
        return remaining.compareTo(BigDecimal.ZERO) > 0 ? List.of() : result;
    }

    /** 订单已占用退款额度（处理中+成功退款单汇总，防并发/处理中超退） */
    private BigDecimal sumOccupied(Long orderId) {
        return refundOrderMapper.selectList(Wrappers.<SalonRefundOrder>lambdaQuery()
                        .select(SalonRefundOrder::getRefundAmount)
                        .eq(SalonRefundOrder::getOrderId, orderId)
                        .in(SalonRefundOrder::getStatus, SalonRefundOrder.STATUS_PROCESSING, SalonRefundOrder.STATUS_SUCCESS))
                .stream()
                .map(SalonRefundOrder::getRefundAmount)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    @Override
    public OrderRefundVO preview(Long orderId, BigDecimal amount) {
        SalonOrder order = orderMapper.selectById(orderId);
        Assert.notNull(order, "订单不存在");
        storePermissionService.assertStoreAccessible(order.getStoreId(), "无权限退款该订单");
        Assert.isTrue(order.getStatus() == SalonOrder.STATUS_PAID || order.getStatus() == SalonOrder.STATUS_PART_REFUNDED, "仅已支付订单可退款");
        BigDecimal available = order.getReceivedAmount().subtract(sumOccupied(orderId));
        Assert.isTrue(amount.signum() >= 0 && amount.compareTo(available) <= 0, "退款金额超出可退范围");
        SalonRefundOrder refund = new SalonRefundOrder();
        refund.setOrderId(orderId); refund.setRefundAmount(amount);
        refundPointService.preview(order, refund);
        return toVO(refund, List.of());
    }

    private OrderRefundVO getRefundVO(Long refundId) {
        SalonRefundOrder refund = refundOrderMapper.selectById(refundId);
        List<SalonRefundPayment> rows = refundPaymentMapper.selectList(
                Wrappers.<SalonRefundPayment>lambdaQuery().eq(SalonRefundPayment::getRefundId, refundId));
        return toVO(refund, rows);
    }

    private OrderRefundVO toVO(SalonRefundOrder refund, List<SalonRefundPayment> rows) {
        OrderRefundVO vo = refundConverter.entity2Vo(refund);
        vo.setPayments(rows.stream()
                .sorted(Comparator.comparing(SalonRefundPayment::getId))
                .map(refundConverter::payment2Vo).toList());
        return vo;
    }

    /** 分摊结果（方式 + 金额） */
    private record Allocation(int payMethod, BigDecimal amount) {
    }
}
