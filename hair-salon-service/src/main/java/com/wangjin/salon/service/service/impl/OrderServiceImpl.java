package com.wangjin.salon.service.service.impl;

import cn.hutool.core.date.DateUtil;
import cn.hutool.core.lang.Assert;
import cn.hutool.core.util.RandomUtil;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.wangjin.common.exception.BizException;
import com.wangjin.salon.service.mapper.SalonGoodsMapper;
import com.wangjin.salon.service.mapper.SalonMemberBalanceMapper;
import com.wangjin.salon.service.mapper.SalonMemberLevelMapper;
import com.wangjin.salon.service.mapper.SalonMemberMapper;
import com.wangjin.salon.service.mapper.SalonOrderItemMapper;
import com.wangjin.salon.service.mapper.SalonOrderMapper;
import com.wangjin.salon.service.mapper.SalonOrderPaymentMapper;
import com.wangjin.salon.service.mapper.SalonServiceItemMapper;
import com.wangjin.salon.service.model.entity.SalonGoods;
import com.wangjin.salon.service.model.entity.SalonMember;
import com.wangjin.salon.service.model.entity.SalonMemberBalance;
import com.wangjin.salon.service.model.entity.SalonMemberLevel;
import com.wangjin.salon.service.model.entity.SalonOrder;
import com.wangjin.salon.service.model.entity.SalonOrderItem;
import com.wangjin.salon.service.model.entity.SalonOrderPayment;
import com.wangjin.salon.service.model.entity.SalonServiceItem;
import com.wangjin.salon.service.model.form.OrderPayForm;
import com.wangjin.salon.service.model.form.OrderSaveForm;
import com.wangjin.salon.service.model.query.OrderPageQuery;
import com.wangjin.salon.service.model.vo.OrderDetailVO;
import com.wangjin.salon.service.model.vo.OrderItemVO;
import com.wangjin.salon.service.model.vo.OrderPageVO;
import com.wangjin.salon.service.model.vo.OrderPaymentVO;
import com.wangjin.salon.service.service.MemberAssetService;
import com.wangjin.salon.service.service.MemberLevelService;
import com.wangjin.salon.service.service.OrderService;
import com.wangjin.salon.service.service.SalonStorePermissionService;
import com.wangjin.salon.system.mapper.SysUserMapper;
import com.wangjin.salon.system.model.entity.SysUser;
import lombok.RequiredArgsConstructor;
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

    /** 余额桶：1本金 2赠送 */
    private static final int BUCKET_PRINCIPAL = 1;
    private static final int BUCKET_GIFT = 2;
    /** 余额变动类型 3=消费扣款；积分变动 1=消费获得 5=抵扣消费 */
    private static final int CT_CONSUME = 3;
    private static final int PT_EARN = 1;
    private static final int PT_DEDUCT = 5;

    /** 支付方式：1现金 5会员余额 6赠送余额 7积分抵扣 */
    private static final int METHOD_CASH = 1;
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
        SalonMember member = order.getMemberId() == null ? null : memberMapper.selectById(order.getMemberId());
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

        // 1) 积分抵扣（仅会员）
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

        // 2) 渠道支付合计须与应收一致（含余额支付，多退少补不允许；差额找零仅现金场景）
        BigDecimal channelTotal = form.getPayments().stream()
                .map(OrderPayForm.OrderPaymentForm::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        if (channelTotal.compareTo(receivable) != 0) {
            throw new BizException("支付合计与应收金额不一致");
        }

        // 3) 余额支付：先扣赠送再扣本金（赠送不可退优先消耗；各行独立流水）
        BigDecimal balancePay = form.getPayments().stream()
                .filter(p -> p.getPayMethod() == METHOD_BALANCE)
                .map(OrderPayForm.OrderPaymentForm::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        if (balancePay.compareTo(BigDecimal.ZERO) > 0) {
            Assert.notNull(member, "散客订单不能使用会员余额支付");
            payWithBalance(member, orderId, order.getOrderNo(), balancePay);
        }

        // 4) 积分抵扣扣减
        if (usePoints > 0) {
            memberAssetService.changePoints(member.getId(), -usePoints, PT_DEDUCT,
                    "ORDER", orderId, order.getOrderNo(), null, "积分抵扣消费");
        }

        // 5) 找零（现金投入 >= 现金应收）
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

        // 6) 支付明细入库（payments 原样 + 积分抵扣行）
        for (OrderPayForm.OrderPaymentForm p : form.getPayments()) {
            insertPayment(orderId, p.getPayMethod(), p.getAmount());
        }
        if (pointDeductAmount.compareTo(BigDecimal.ZERO) > 0) {
            insertPayment(orderId, METHOD_POINT, pointDeductAmount);
        }

        // 7) 订单金额落定
        SalonOrder update = new SalonOrder();
        update.setId(orderId);
        update.setPointDeductPoints(usePoints);
        update.setPointDeductAmount(pointDeductAmount);
        update.setReceivedAmount(receivable);
        update.setChangeAmount(change);
        update.setPaidTime(LocalDateTime.now());
        orderMapper.updateById(update);

        // 8) 商品库存扣减（条件更新防超卖）
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

        // 9) 消费送积分 + 累计消费 + 等级升级检查（仅会员）
        if (member != null) {
            int earned = receivable.multiply(pointRateOf(member)).setScale(0, RoundingMode.DOWN).intValueExact();
            if (earned > 0) {
                memberAssetService.changePoints(member.getId(), earned, PT_EARN,
                        "ORDER", orderId, order.getOrderNo(), null, "消费赠送积分");
            }
            memberMapper.update(null, Wrappers.<SalonMember>lambdaUpdate()
                    .setSql("total_consume_amount = COALESCE(total_consume_amount, 0) + " + receivable)
                    .eq(SalonMember::getId, member.getId()));
            memberLevelService.checkAndUpgrade(member.getId());
        }
        return orderId;
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

    /** 余额支付：先扣赠送再扣本金（各桶独立流水，余额不足抛错） */
    private void payWithBalance(SalonMember member, Long orderId, String orderNo, BigDecimal amount) {
        SalonMemberBalance balance = balanceMapper.selectOne(
                Wrappers.<SalonMemberBalance>lambdaQuery().eq(SalonMemberBalance::getMemberId, member.getId()));
        BigDecimal gift = balance == null || balance.getGiftBalance() == null ? BigDecimal.ZERO : balance.getGiftBalance();
        BigDecimal principal = balance == null || balance.getPrincipalBalance() == null ? BigDecimal.ZERO : balance.getPrincipalBalance();
        BigDecimal available = gift.add(principal);
        if (available.compareTo(amount) < 0) {
            throw new BizException("会员可用余额不足");
        }
        BigDecimal deductGift = gift.min(amount);
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
