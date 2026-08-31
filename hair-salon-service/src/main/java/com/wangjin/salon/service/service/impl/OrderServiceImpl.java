package com.wangjin.salon.service.service.impl;

import cn.hutool.core.date.DateUtil;
import cn.hutool.core.lang.Assert;
import cn.hutool.core.util.RandomUtil;
import cn.hutool.json.JSONUtil;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.wangjin.common.exception.BizException;
import com.wangjin.common.security.util.SecurityUtils;
import com.wangjin.salon.service.config.PayProperties;
import com.wangjin.salon.service.mapper.SalonGoodsMapper;
import com.wangjin.salon.service.mapper.SalonMemberBalanceMapper;
import com.wangjin.salon.service.mapper.SalonMemberLevelMapper;
import com.wangjin.salon.service.mapper.SalonMemberMapper;
import com.wangjin.salon.service.mapper.SalonOrderItemMapper;
import com.wangjin.salon.service.mapper.SalonOrderMapper;
import com.wangjin.salon.service.mapper.SalonOrderPaymentMapper;
import com.wangjin.salon.service.mapper.SalonPayRecordMapper;
import com.wangjin.salon.service.mapper.SalonServiceItemMapper;
import com.wangjin.salon.service.model.entity.SalonGoods;
import com.wangjin.salon.service.model.entity.SalonMember;
import com.wangjin.salon.service.model.entity.SalonMemberBalance;
import com.wangjin.salon.service.model.entity.SalonMemberLevel;
import com.wangjin.salon.service.model.entity.SalonOrder;
import com.wangjin.salon.service.model.entity.SalonOrderItem;
import com.wangjin.salon.service.model.entity.SalonOrderPayment;
import com.wangjin.salon.service.model.entity.SalonPayRecord;
import com.wangjin.salon.service.model.entity.SalonServiceItem;
import com.wangjin.salon.service.model.entity.SalonTenantPayConfig;
import com.wangjin.salon.service.model.form.OrderPayForm;
import com.wangjin.salon.service.model.form.OrderSaveForm;
import com.wangjin.salon.service.model.query.OrderPageQuery;
import com.wangjin.salon.service.model.vo.OrderDetailVO;
import com.wangjin.salon.service.model.vo.OrderItemVO;
import com.wangjin.salon.service.model.vo.OrderPageVO;
import com.wangjin.salon.service.model.vo.OrderPayStatusVO;
import com.wangjin.salon.service.model.vo.OrderPaymentVO;
import com.wangjin.salon.service.model.vo.OrderPrepayVO;
import com.wangjin.salon.service.pay.AlipayChannelService;
import com.wangjin.salon.service.pay.PayChannel;
import com.wangjin.salon.service.pay.PayPrepayCommand;
import com.wangjin.salon.service.pay.WxpayChannelService;
import com.wangjin.salon.service.service.MemberAssetService;
import com.wangjin.salon.service.service.MemberLevelService;
import com.wangjin.salon.service.service.OrderService;
import com.wangjin.salon.service.service.SalonStorePermissionService;
import com.wangjin.salon.service.service.TenantPayConfigService;
import com.wangjin.salon.system.mapper.SysUserMapper;
import com.wangjin.salon.system.model.entity.SysUser;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class OrderServiceImpl implements OrderService {

    private final SalonOrderMapper orderMapper;
    private final SalonOrderItemMapper orderItemMapper;
    private final SalonOrderPaymentMapper orderPaymentMapper;
    private final SalonMemberMapper memberMapper;
    private final SalonMemberBalanceMapper balanceMapper;
    private final SalonMemberLevelMapper levelMapper;
    private final SalonServiceItemMapper serviceItemMapper;
    private final SalonGoodsMapper goodsMapper;
    private final SysUserMapper sysUserMapper;
    private final MemberAssetService memberAssetService;
    private final MemberLevelService memberLevelService;
    private final SalonStorePermissionService storePermissionService;
    private final SalonPayRecordMapper payRecordMapper;
    private final TenantPayConfigService tenantPayConfigService;
    private final List<PayChannel> payChannels;
    private final PayProperties payProperties;

    /** 余额桶：1本金 2赠送 */
    private static final int BUCKET_PRINCIPAL = 1;
    private static final int BUCKET_GIFT = 2;
    /** 余额变动类型 3=消费扣款；积分变动 1=消费获得 5=抵扣消费 */
    private static final int CT_CONSUME = 3;
    private static final int PT_EARN = 1;
    private static final int PT_DEDUCT = 5;

    /** 支付方式：1现金 2微信 3支付宝 5会员余额 7积分抵扣（6赠送余额由余额支付内部先扣，不单独收银） */
    private static final int METHOD_CASH = 1;
    private static final int METHOD_WXPAY = 2;
    private static final int METHOD_ALIPAY = 3;
    private static final int METHOD_BALANCE = 5;
    private static final int METHOD_POINT = 7;

    /** 积分抵扣比例：100积分=1元。ponytail: 固定比例，P10 门店设置落地时配置化 */
    private static final BigDecimal POINTS_PER_YUAN = new BigDecimal("100");

    /** 订单可用支付方式（余额5/积分7须会员；赠送余额6由余额支付内部自动先扣，不单独收银） */
    private static final Set<Integer> ORDER_PAY_METHODS = Set.of(1, 2, 3, 4, 5, 7, 8);

    @Override
    public Page<OrderPageVO> getPage(OrderPageQuery query) {
        storePermissionService.apply(query);
        return orderMapper.getOrderPage(new Page<>(query.getPageNum(), query.getPageSize()), query);
    }

    @Override
    public OrderDetailVO getDetail(Long id) {
        SalonOrder order = orderMapper.selectById(id);
        Assert.notNull(order, "订单不存在");
        storePermissionService.assertStoreAccessible(order.getStoreId(), "无权限查看该订单");
        OrderDetailVO vo = new OrderDetailVO();
        OrderPageVO base = orderMapper.getOrderById(order.getId());
        if (base != null) {
            org.springframework.beans.BeanUtils.copyProperties(base, vo);
        }
        vo.setStoreId(order.getStoreId());
        vo.setPointDeductPoints(order.getPointDeductPoints());

        List<SalonOrderItem> items = orderItemMapper.selectList(
                Wrappers.<SalonOrderItem>lambdaQuery().eq(SalonOrderItem::getOrderId, id));
        Set<Long> staffIds = items.stream().flatMap(i -> {
            List<Long> ids = new ArrayList<>(2);
            if (i.getStaffId() != null) ids.add(i.getStaffId());
            if (i.getAssistantId() != null) ids.add(i.getAssistantId());
            return ids.stream();
        }).collect(Collectors.toSet());
        Map<Long, String> staffNames = staffIds.isEmpty() ? Map.of()
                : sysUserMapper.selectBatchIds(staffIds).stream()
                        .collect(Collectors.toMap(SysUser::getId, u -> u.getNickname() == null ? u.getUsername() : u.getNickname(), (a, b) -> a));
        vo.setItems(items.stream().map(i -> {
            OrderItemVO itemVo = new OrderItemVO();
            itemVo.setId(i.getId());
            itemVo.setItemType(i.getItemType());
            itemVo.setItemId(i.getItemId());
            itemVo.setItemName(i.getItemName());
            itemVo.setUnitPrice(i.getUnitPrice());
            itemVo.setPrice(i.getPrice());
            itemVo.setQuantity(i.getQuantity());
            itemVo.setDiscountRate(i.getDiscountRate());
            itemVo.setSubtotal(i.getSubtotal());
            itemVo.setStaffId(i.getStaffId());
            itemVo.setAssistantId(i.getAssistantId());
            itemVo.setStaffName(i.getStaffId() == null ? null : staffNames.get(i.getStaffId()));
            itemVo.setAssistantName(i.getAssistantId() == null ? null : staffNames.get(i.getAssistantId()));
            itemVo.setRemark(i.getRemark());
            return itemVo;
        }).toList());

        List<OrderPaymentVO> payments = orderPaymentMapper.selectList(
                        Wrappers.<SalonOrderPayment>lambdaQuery().eq(SalonOrderPayment::getOrderId, id))
                .stream().map(p -> {
                    OrderPaymentVO pvo = new OrderPaymentVO();
                    pvo.setId(p.getId());
                    pvo.setPayMethod(p.getPayMethod());
                    pvo.setAmount(p.getAmount());
                    return pvo;
                }).toList();
        vo.setPayments(payments);
        return vo;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Long savePending(OrderSaveForm form) {
        SalonOrder order = buildOrder(form);
        orderMapper.insert(order);
        insertItems(order.getId(), buildItems(form, order.getMemberId()));
        return order.getId();
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public boolean updatePending(Long id, OrderSaveForm form) {
        SalonOrder exists = orderMapper.selectById(id);
        Assert.notNull(exists, "订单不存在");
        Assert.isTrue(SalonOrder.STATUS_PENDING == exists.getStatus(), "仅挂单订单可修改");
        storePermissionService.assertStoreAccessible(exists.getStoreId(), "无权限修改该订单");
        // 扫码支付挂起期间禁改挂单：已出码金额基于当前明细，改单须先取消扫码支付
        Long paying = payRecordMapper.selectCount(Wrappers.<SalonPayRecord>lambdaQuery()
                .eq(SalonPayRecord::getBizType, SalonPayRecord.BIZ_TYPE_ORDER)
                .eq(SalonPayRecord::getBizId, id)
                .eq(SalonPayRecord::getStatus, SalonPayRecord.STATUS_PENDING));
        if (paying != null && paying > 0) {
            throw new BizException("订单扫码支付进行中，请先取消支付再修改");
        }
        SalonOrder order = buildOrder(form);
        order.setId(id);
        orderMapper.updateById(order);
        orderItemMapper.delete(Wrappers.<SalonOrderItem>lambdaQuery().eq(SalonOrderItem::getOrderId, id));
        insertItems(id, buildItems(form, order.getMemberId()));
        return true;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Long pay(Long orderId, OrderPayForm form) {
        SalonOrder order = orderMapper.selectById(orderId);
        Assert.notNull(order, "订单不存在");
        storePermissionService.assertStoreAccessible(order.getStoreId(), "无权限结算该订单");
        // 条件更新占坑：防并发重复结算（rows=0 即已非挂单）
        int rows = orderMapper.update(null, Wrappers.<SalonOrder>lambdaUpdate()
                .set(SalonOrder::getStatus, SalonOrder.STATUS_PAID)
                .eq(SalonOrder::getId, orderId)
                .eq(SalonOrder::getStatus, SalonOrder.STATUS_PENDING));
        if (rows == 0) {
            throw new BizException("订单已结算或已取消，请刷新");
        }
        settle(order, form);
        return orderId;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public OrderPrepayVO prepayScan(Long orderId, OrderPayForm form) {
        SalonOrder order = orderMapper.selectById(orderId);
        Assert.notNull(order, "订单不存在");
        Assert.isTrue(SalonOrder.STATUS_PENDING == order.getStatus(), "仅挂单订单可发起扫码支付");
        storePermissionService.assertStoreAccessible(order.getStoreId(), "无权限结算该订单");
        SalonMember member = order.getMemberId() == null ? null : memberMapper.selectById(order.getMemberId());
        // 全量校验（与确认结算同口径，防出码后确认时校验失败顾客白付）+ 库存预检
        calcPay(order, member, form);
        assertStockEnough(orderId);

        // 扫码行：微信2/支付宝3 恰好一行（一次只出一种码；渠道由支付方式推导）
        List<OrderPayForm.OrderPaymentForm> scanRows = form.getPayments().stream()
                .filter(p -> p.getPayMethod() == METHOD_WXPAY || p.getPayMethod() == METHOD_ALIPAY)
                .toList();
        if (scanRows.size() != 1) {
            throw new BizException("扫码支付仅支持一行微信或支付宝（一次只出一种码）");
        }
        OrderPayForm.OrderPaymentForm scanRow = scanRows.get(0);
        String channel = scanRow.getPayMethod() == METHOD_WXPAY
                ? WxpayChannelService.CHANNEL : AlipayChannelService.CHANNEL;
        SalonTenantPayConfig payConfig = tenantPayConfigService.requireActiveConfig(channel);
        PayChannel payChannel = payChannels.stream()
                .filter(c -> c.channel().equals(channel))
                .findFirst()
                .orElseThrow(() -> new BizException("支付渠道未接入：" + channel));

        // 重复出码：关旧 pending 流水（旧码作废，渠道侧自然过期）
        payRecordMapper.update(null, Wrappers.<SalonPayRecord>lambdaUpdate()
                .set(SalonPayRecord::getStatus, SalonPayRecord.STATUS_FAILED)
                .set(SalonPayRecord::getRemark, "重新出码关闭")
                .eq(SalonPayRecord::getBizType, SalonPayRecord.BIZ_TYPE_ORDER)
                .eq(SalonPayRecord::getBizId, orderId)
                .eq(SalonPayRecord::getStatus, SalonPayRecord.STATUS_PENDING));

        // 流水：out_trade_no = 订单号-P序号（多次出码递增保证租户内唯一，渠道对账可直读订单归属）
        Long attempt = payRecordMapper.selectCount(Wrappers.<SalonPayRecord>lambdaQuery()
                .eq(SalonPayRecord::getBizType, SalonPayRecord.BIZ_TYPE_ORDER)
                .eq(SalonPayRecord::getBizId, orderId));
        String outTradeNo = order.getOrderNo() + "-P" + (attempt + 1);
        SalonPayRecord record = new SalonPayRecord();
        record.setBizType(SalonPayRecord.BIZ_TYPE_ORDER);
        record.setBizId(orderId);
        record.setOrderId(orderId);
        record.setChannel(channel);
        record.setSettleType(payConfig.getSettleType());
        record.setOutTradeNo(outTradeNo);
        record.setAmount(scanRow.getAmount());
        record.setStatus(SalonPayRecord.STATUS_PENDING);
        // 表单快照：确认链路（回调/查单）反序列化重放结算，保证出码与结算口径一致
        record.setBizForm(JSONUtil.toJsonStr(form));
        payRecordMapper.insert(record);

        // 渠道扫码下单（HTTP 调用在事务内：失败整体回滚，无脏单）
        String codeUrl = payChannel.nativePrepay(
                new PayPrepayCommand(outTradeNo, scanRow.getAmount(),
                        "订单结算-" + (member != null ? member.getName() : order.getOrderNo()),
                        payProperties.buildNotifyUrl(channel, SecurityUtils.getTenantId())),
                payConfig);

        OrderPrepayVO vo = new OrderPrepayVO();
        vo.setOrderId(orderId);
        vo.setOutTradeNo(outTradeNo);
        vo.setCodeUrl(codeUrl);
        vo.setAmount(scanRow.getAmount());
        return vo;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void cancelPrepay(Long orderId) {
        SalonOrder order = orderMapper.selectById(orderId);
        Assert.notNull(order, "订单不存在");
        storePermissionService.assertStoreAccessible(order.getStoreId(), "无权限操作该订单");
        int rows = payRecordMapper.update(null, Wrappers.<SalonPayRecord>lambdaUpdate()
                .set(SalonPayRecord::getStatus, SalonPayRecord.STATUS_FAILED)
                .set(SalonPayRecord::getRemark, "收银员取消扫码支付")
                .eq(SalonPayRecord::getBizType, SalonPayRecord.BIZ_TYPE_ORDER)
                .eq(SalonPayRecord::getBizId, orderId)
                .eq(SalonPayRecord::getStatus, SalonPayRecord.STATUS_PENDING));
        if (rows == 0) {
            throw new BizException("无待支付的扫码流水");
        }
        log.info("订单扫码支付已取消 orderId={} orderNo={}", orderId, order.getOrderNo());
    }

    @Override
    public OrderPayStatusVO getPayStatus(Long orderId) {
        SalonOrder order = orderMapper.selectById(orderId);
        Assert.notNull(order, "订单不存在");
        OrderPayStatusVO vo = new OrderPayStatusVO();
        vo.setOrderId(order.getId());
        vo.setStatus(order.getStatus());
        vo.setPaidTime(order.getPaidTime());
        return vo;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void settle(SalonOrder order, OrderPayForm form) {
        Long orderId = order.getId();
        SalonMember member = order.getMemberId() == null ? null : memberMapper.selectById(order.getMemberId());
        PayContext ctx = calcPay(order, member, form);

        // 1) 余额支付：先扣赠送再扣本金（赠送不可退优先消耗；各行独立流水）
        if (ctx.balancePay().compareTo(BigDecimal.ZERO) > 0) {
            payWithBalance(member, orderId, order.getOrderNo(), ctx.balancePay());
        }

        // 2) 积分抵扣扣减
        if (ctx.usePoints() > 0) {
            memberAssetService.changePoints(member.getId(), -ctx.usePoints(), PT_DEDUCT,
                    "ORDER", orderId, order.getOrderNo(), null, "积分抵扣消费");
        }

        // 3) 支付明细入库（payments 原样 + 积分抵扣行）
        for (OrderPayForm.OrderPaymentForm p : form.getPayments()) {
            insertPayment(orderId, p.getPayMethod(), p.getAmount());
        }
        if (ctx.pointDeductAmount().compareTo(BigDecimal.ZERO) > 0) {
            insertPayment(orderId, METHOD_POINT, ctx.pointDeductAmount());
        }

        // 4) 订单金额落定
        SalonOrder update = new SalonOrder();
        update.setId(orderId);
        update.setPointDeductPoints(ctx.usePoints());
        update.setPointDeductAmount(ctx.pointDeductAmount());
        update.setReceivedAmount(ctx.receivable());
        update.setChangeAmount(ctx.change());
        update.setPaidTime(LocalDateTime.now());
        orderMapper.updateById(update);

        // 5) 商品库存扣减（条件更新防超卖）
        List<SalonOrderItem> items = orderItemMapper.selectList(
                Wrappers.<SalonOrderItem>lambdaQuery().eq(SalonOrderItem::getOrderId, orderId));
        for (SalonOrderItem item : items) {
            if (item.getItemType() == SalonOrderItem.TYPE_GOODS) {
                int deducted = goodsMapper.update(null, Wrappers.<SalonGoods>lambdaUpdate()
                        .setSql("stock_quantity = stock_quantity - " + item.getQuantity())
                        .eq(SalonGoods::getId, item.getItemId())
                        .ge(SalonGoods::getStockQuantity, item.getQuantity()));
                if (deducted == 0) {
                    throw new BizException("商品【" + item.getItemName() + "】库存不足");
                }
            }
        }

        // 6) 消费送积分 + 累计消费 + 等级升级检查（仅会员）
        if (member != null) {
            int earned = ctx.receivable().multiply(pointRateOf(member)).setScale(0, RoundingMode.DOWN).intValueExact();
            if (earned > 0) {
                memberAssetService.changePoints(member.getId(), earned, PT_EARN,
                        "ORDER", orderId, order.getOrderNo(), null, "消费赠送积分");
            }
            memberMapper.update(null, Wrappers.<SalonMember>lambdaUpdate()
                    .setSql("total_consume_amount = COALESCE(total_consume_amount, 0) + " + ctx.receivable())
                    .eq(SalonMember::getId, member.getId()));
            memberLevelService.checkAndUpgrade(member.getId());
        }
    }

    /** 结算校验与中间金额（手动结算/扫码出码/确认结算共用，保证三处口径一致；纯校验计算无副作用） */
    private PayContext calcPay(SalonOrder order, SalonMember member, OrderPayForm form) {
        BigDecimal payable = order.getPayableAmount();

        // 支付方式合法性
        for (OrderPayForm.OrderPaymentForm p : form.getPayments()) {
            if (!ORDER_PAY_METHODS.contains(p.getPayMethod())) {
                throw new BizException("不支持的支付方式");
            }
            if (p.getPayMethod() != METHOD_POINT && p.getPayMethod() != METHOD_BALANCE && p.getPayMethod() != METHOD_CASH
                    && p.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
                throw new BizException("支付金额必须大于0");
            }
        }

        // 积分抵扣（仅会员）
        BigDecimal pointDeductAmount = BigDecimal.ZERO;
        int usePoints = form.getUsePoints() == null ? 0 : form.getUsePoints();
        if (usePoints > 0) {
            Assert.notNull(member, "散客订单不能使用积分抵扣");
            pointDeductAmount = new BigDecimal(usePoints).divide(POINTS_PER_YUAN, 2, RoundingMode.DOWN);
            if (pointDeductAmount.compareTo(payable) > 0) {
                throw new BizException("积分抵扣金额不能超过应收金额");
            }
        }
        BigDecimal receivable = payable.subtract(pointDeductAmount);

        // 渠道支付合计须与应收一致（含余额支付，多退少补不允许；差额找零仅现金场景）
        BigDecimal channelTotal = form.getPayments().stream()
                .map(OrderPayForm.OrderPaymentForm::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        if (channelTotal.compareTo(receivable) != 0) {
            throw new BizException("支付合计与应收金额不一致");
        }

        // 余额支付合计（足额校验在 payWithBalance 内）
        BigDecimal balancePay = form.getPayments().stream()
                .filter(p -> p.getPayMethod() == METHOD_BALANCE)
                .map(OrderPayForm.OrderPaymentForm::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        if (balancePay.compareTo(BigDecimal.ZERO) > 0) {
            Assert.notNull(member, "散客订单不能使用会员余额支付");
        }

        // 找零（现金投入 >= 现金应收）
        BigDecimal cashPayable = form.getPayments().stream()
                .filter(p -> p.getPayMethod() == METHOD_CASH)
                .map(OrderPayForm.OrderPaymentForm::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal cashReceived = form.getCashReceived() == null ? BigDecimal.ZERO : form.getCashReceived();
        BigDecimal change = BigDecimal.ZERO;
        if (cashPayable.compareTo(BigDecimal.ZERO) > 0) {
            if (cashReceived.compareTo(cashPayable) < 0) {
                throw new BizException("现金投入不足");
            }
            change = cashReceived.subtract(cashPayable);
        }
        return new PayContext(usePoints, pointDeductAmount, receivable, balancePay, cashPayable, cashReceived, change);
    }

    /** 库存预检（出码前拦截，防顾客付款后结算失败；结算时条件扣减仍防并发超卖） */
    private void assertStockEnough(Long orderId) {
        List<SalonOrderItem> items = orderItemMapper.selectList(
                Wrappers.<SalonOrderItem>lambdaQuery().eq(SalonOrderItem::getOrderId, orderId));
        for (SalonOrderItem item : items) {
            if (item.getItemType() == SalonOrderItem.TYPE_GOODS) {
                SalonGoods goods = goodsMapper.selectById(item.getItemId());
                if (goods == null || goods.getStockQuantity() == null
                        || goods.getStockQuantity() < item.getQuantity()) {
                    throw new BizException("商品【" + item.getItemName() + "】库存不足");
                }
            }
        }
    }

    /** 结算中间金额（calcPay 产出） */
    private record PayContext(int usePoints, BigDecimal pointDeductAmount, BigDecimal receivable,
                              BigDecimal balancePay, BigDecimal cashPayable, BigDecimal cashReceived,
                              BigDecimal change) {
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public boolean cancel(Long id) {
        SalonOrder order = orderMapper.selectById(id);
        Assert.notNull(order, "订单不存在");
        storePermissionService.assertStoreAccessible(order.getStoreId(), "无权限取消该订单");
        int rows = orderMapper.update(null, Wrappers.<SalonOrder>lambdaUpdate()
                .set(SalonOrder::getStatus, SalonOrder.STATUS_CANCELLED)
                .eq(SalonOrder::getId, id)
                .eq(SalonOrder::getStatus, SalonOrder.STATUS_PENDING));
        if (rows == 0) {
            throw new BizException("仅挂单订单可取消");
        }
        // 挂起的扫码流水同步关闭（渠道侧订单自然过期；顾客后续仍支付成功则回调无 pending 可确认，P8 对账处理）
        payRecordMapper.update(null, Wrappers.<SalonPayRecord>lambdaUpdate()
                .set(SalonPayRecord::getStatus, SalonPayRecord.STATUS_FAILED)
                .set(SalonPayRecord::getRemark, "订单取消关闭")
                .eq(SalonPayRecord::getBizType, SalonPayRecord.BIZ_TYPE_ORDER)
                .eq(SalonPayRecord::getBizId, id)
                .eq(SalonPayRecord::getStatus, SalonPayRecord.STATUS_PENDING));
        return true;
    }

    /** 构建订单头：金额由明细推导（服务端计算，不信前端金额） */
    private SalonOrder buildOrder(OrderSaveForm form) {
        storePermissionService.assertStoreAccessible(form.getStoreId(), "无权限在该门店开单");
        SalonMember member = form.getMemberId() == null ? null : memberMapper.selectById(form.getMemberId());
        if (form.getMemberId() != null) {
            Assert.notNull(member, "会员不存在");
        }
        List<SalonOrderItem> items = buildItems(form, form.getMemberId());
        BigDecimal itemAmount = BigDecimal.ZERO;
        BigDecimal subtotalTotal = BigDecimal.ZERO;
        for (SalonOrderItem item : items) {
            itemAmount = itemAmount.add(item.getUnitPrice().multiply(BigDecimal.valueOf(item.getQuantity())));
            subtotalTotal = subtotalTotal.add(item.getSubtotal());
        }
        SalonOrder order = new SalonOrder();
        order.setStoreId(form.getStoreId());
        order.setOrderNo("SO" + DateUtil.format(new java.util.Date(), "yyMMddHHmmss") + RandomUtil.randomNumbers(3));
        order.setMemberId(form.getMemberId());
        order.setItemAmount(itemAmount);
        order.setDiscountAmount(itemAmount.subtract(subtotalTotal));
        order.setPayableAmount(subtotalTotal);
        order.setStatus(SalonOrder.STATUS_PENDING);
        order.setRemark(form.getRemark());
        return order;
    }

    /** 构建明细行：服务/商品快照 + 会员价 + 会员等级折扣（discountable=0 不折） */
    private List<SalonOrderItem> buildItems(OrderSaveForm form, Long memberId) {
        SalonMember member = memberId == null ? null : memberMapper.selectById(memberId);
        SalonMemberLevel level = member == null || member.getLevelId() == null ? null : levelMapper.selectById(member.getLevelId());
        List<SalonOrderItem> result = new ArrayList<>(form.getItems().size());
        for (OrderSaveForm.OrderItemForm itemForm : form.getItems()) {
            SalonOrderItem item = new SalonOrderItem();
            item.setItemType(itemForm.getItemType());
            item.setItemId(itemForm.getItemId());
            item.setPrice(itemForm.getPrice());
            item.setQuantity(itemForm.getQuantity());
            item.setStaffId(itemForm.getStaffId());
            item.setAssistantId(itemForm.getAssistantId());
            item.setRemark(itemForm.getRemark());
            BigDecimal rate = BigDecimal.ONE;
            if (itemForm.getItemType() == SalonOrderItem.TYPE_SERVICE) {
                SalonServiceItem service = serviceItemMapper.selectById(itemForm.getItemId());
                Assert.notNull(service, "服务项目不存在");
                Assert.isTrue(service.getStatus() == 1, "服务项目已停用：" + service.getName());
                item.setItemName(service.getName());
                BigDecimal unit = service.getStandardPrice();
                if (member != null && service.getMemberPrice() != null) {
                    unit = service.getMemberPrice();
                }
                item.setUnitPrice(unit);
                rate = rowRate(service.getDiscountable(), level == null ? null : level.getServiceDiscount());
            } else if (itemForm.getItemType() == SalonOrderItem.TYPE_GOODS) {
                SalonGoods goods = goodsMapper.selectById(itemForm.getItemId());
                Assert.notNull(goods, "商品不存在");
                Assert.isTrue(goods.getStatus() == 1, "商品已停用：" + goods.getName());
                item.setItemName(goods.getName());
                item.setUnitPrice(goods.getSalePrice());
                rate = rowRate(goods.getDiscountable(), level == null ? null : level.getGoodsDiscount());
            } else {
                throw new BizException("非法明细类型");
            }
            item.setDiscountRate(rate);
            item.setSubtotal(itemForm.getPrice()
                    .multiply(BigDecimal.valueOf(itemForm.getQuantity()))
                    .multiply(rate)
                    .setScale(2, RoundingMode.HALF_UP));
            result.add(item);
        }
        return result;
    }

    private BigDecimal rowRate(Integer discountable, BigDecimal levelDiscount) {
        if (discountable == null || discountable != 1 || levelDiscount == null) {
            return BigDecimal.ONE;
        }
        return levelDiscount.compareTo(BigDecimal.ZERO) > 0 ? levelDiscount : BigDecimal.ONE;
    }

    /** 余额支付：先扣赠送再扣本金（赠送桶含冻结占用，可用赠送=赠送-冻结；各桶独立流水，余额不足抛错） */
    private void payWithBalance(SalonMember member, Long orderId, String orderNo, BigDecimal amount) {
        SalonMemberBalance balance = balanceMapper.selectOne(
                Wrappers.<SalonMemberBalance>lambdaQuery().eq(SalonMemberBalance::getMemberId, member.getId()));
        BigDecimal gift = balance == null || balance.getGiftBalance() == null ? BigDecimal.ZERO : balance.getGiftBalance();
        BigDecimal principal = balance == null || balance.getPrincipalBalance() == null ? BigDecimal.ZERO : balance.getPrincipalBalance();
        BigDecimal frozen = balance == null || balance.getFrozenBalance() == null ? BigDecimal.ZERO : balance.getFrozenBalance();
        BigDecimal giftAvailable = gift.subtract(frozen).max(BigDecimal.ZERO);
        BigDecimal available = giftAvailable.add(principal);
        if (available.compareTo(amount) < 0) {
            throw new BizException("会员可用余额不足");
        }
        BigDecimal deductGift = giftAvailable.min(amount);
        if (deductGift.compareTo(BigDecimal.ZERO) > 0) {
            memberAssetService.changeBalance(member.getId(), BUCKET_GIFT, deductGift.negate(),
                    CT_CONSUME, "ORDER", orderId, orderNo, "会员余额支付（赠送）");
        }
        BigDecimal rest = amount.subtract(deductGift);
        if (rest.compareTo(BigDecimal.ZERO) > 0) {
            memberAssetService.changeBalance(member.getId(), BUCKET_PRINCIPAL, rest.negate(),
                    CT_CONSUME, "ORDER", orderId, orderNo, "会员余额支付（本金）");
        }
    }

    private BigDecimal pointRateOf(SalonMember member) {
        if (member.getLevelId() == null) {
            return BigDecimal.ONE;
        }
        SalonMemberLevel level = levelMapper.selectById(member.getLevelId());
        return level != null && level.getPointRate() != null ? level.getPointRate() : BigDecimal.ONE;
    }

    private void insertItems(Long orderId, List<SalonOrderItem> items) {
        for (SalonOrderItem item : items) {
            item.setOrderId(orderId);
            orderItemMapper.insert(item);
        }
    }

    private void insertPayment(Long orderId, Integer payMethod, BigDecimal amount) {
        SalonOrderPayment payment = new SalonOrderPayment();
        payment.setOrderId(orderId);
        payment.setPayMethod(payMethod);
        payment.setAmount(amount);
        orderPaymentMapper.insert(payment);
    }
}
