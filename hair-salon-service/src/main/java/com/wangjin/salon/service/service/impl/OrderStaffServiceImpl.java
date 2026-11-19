package com.wangjin.salon.service.service.impl;

import cn.hutool.core.lang.Assert;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.wangjin.common.exception.BizException;
import com.wangjin.common.security.util.SecurityUtils;
import com.wangjin.salon.service.converter.OrderStaffChangeConverter;
import com.wangjin.salon.service.mapper.*;
import com.wangjin.salon.service.model.entity.*;
import com.wangjin.salon.service.model.form.OrderStaffCorrectionForm;
import com.wangjin.salon.service.model.vo.OrderStaffChangeVO;
import com.wangjin.salon.service.model.vo.OrderStaffOptionVO;
import com.wangjin.salon.service.service.OrderStaffService;
import com.wangjin.salon.service.service.SalonStorePermissionService;
import com.wangjin.salon.system.mapper.SysUserMapper;
import com.wangjin.salon.system.model.entity.SysUser;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class OrderStaffServiceImpl implements OrderStaffService {
    private final OrderStaffMapper staffMapper;
    private final SalonStoreMapper storeMapper;
    private final SalonOrderMapper orderMapper;
    private final SalonOrderItemMapper itemMapper;
    private final SalonOrderStaffChangeMapper changeMapper;
    private final SysUserMapper userMapper;
    private final SalonStorePermissionService storePermissionService;
    private final OrderStaffChangeConverter converter;

    @Override
    public List<OrderStaffOptionVO> listOptions(Long storeId) {
        storePermissionService.assertStoreAccessible(storeId, "无权限查看该门店人员");
        SalonStore store = storeMapper.selectById(storeId);
        Assert.notNull(store, "门店不存在");
        return staffMapper.listOptions(store.getTenantId(), storeId);
    }

    @Override
    public void assertReadyForPayment(SalonOrder order) {
        List<SalonOrderItem> items = items(order.getId());
        if (items.isEmpty()) throw new BizException("订单明细不能为空");
        Map<Long, OrderStaffOptionVO> available = options(order);
        for (SalonOrderItem item : items) validate(item.getItemName(), item.getStaffId(), item.getAssistantId(), available, null);
    }

    private Map<Long, OrderStaffOptionVO> options(SalonOrder order) {
        return staffMapper.listOptions(order.getTenantId(), order.getStoreId()).stream()
                .collect(Collectors.toMap(OrderStaffOptionVO::getId, Function.identity()));
    }

    private List<SalonOrderItem> items(Long orderId) {
        return itemMapper.selectList(Wrappers.<SalonOrderItem>lambdaQuery()
                .eq(SalonOrderItem::getOrderId, orderId).orderByAsc(SalonOrderItem::getId));
    }

    /** 结算只能使用有效人员；历史更正允许保留原岗位人员，避免离店后被迫改写提成归属。 */
    private void validate(String itemName, Long staffId, Long assistantId, Map<Long, OrderStaffOptionVO> available, SalonOrderItem previous) {
        if (staffId == null) throw new BizException("请为“" + itemName + "”选择服务人员");
        if (!available.containsKey(staffId) && (previous == null || !Objects.equals(staffId, previous.getStaffId())))
            throw new BizException("“" + itemName + "”的服务人员已停用或不属于本门店");
        if (assistantId != null && !available.containsKey(assistantId)
                && (previous == null || !Objects.equals(assistantId, previous.getAssistantId())))
            throw new BizException("“" + itemName + "”的助理已停用或不属于本门店");
        if (Objects.equals(staffId, assistantId)) throw new BizException("服务人员和助理不能为同一人");
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void correct(Long orderId, OrderStaffCorrectionForm form) {
        SalonOrder order = orderMapper.selectOne(Wrappers.<SalonOrder>lambdaQuery()
                .eq(SalonOrder::getId, orderId).last("FOR UPDATE"));
        Assert.notNull(order, "订单不存在");
        storePermissionService.assertStoreAccessible(order.getStoreId(), "无权限更正该订单人员");
        if (!Set.of(SalonOrder.STATUS_PAID, SalonOrder.STATUS_PART_REFUNDED, SalonOrder.STATUS_REFUNDED).contains(order.getStatus()))
            throw new BizException("仅已结算订单可更正人员，挂单请在收银台修改");
        if (form.getReason() == null || form.getReason().isBlank()) throw new BizException("更正原因不能为空");
        List<SalonOrderItem> items = items(orderId);
        Map<Long, OrderStaffCorrectionForm.Item> requested = new HashMap<>();
        for (OrderStaffCorrectionForm.Item row : form.getItems()) {
            if (requested.put(row.getOrderItemId(), row) != null) throw new BizException("订单明细不能重复");
        }
        if (items.size() != requested.size() || items.stream().anyMatch(item -> !requested.containsKey(item.getId())))
            throw new BizException("订单明细已变化，请刷新后重试");
        Map<Long, OrderStaffOptionVO> available = options(order);
        Set<Long> previousIds = new HashSet<>();
        for (SalonOrderItem item : items) {
            if (item.getStaffId() != null) previousIds.add(item.getStaffId());
            if (item.getAssistantId() != null) previousIds.add(item.getAssistantId());
        }
        Map<Long, String> previousNames = previousIds.isEmpty() ? Map.of()
                : userMapper.selectBatchIds(previousIds).stream()
                    .filter(user -> Objects.equals(user.getTenantId(), order.getTenantId()))
                    .collect(Collectors.toMap(SysUser::getId, user -> user.getNickname() == null ? user.getUsername() : user.getNickname()));
        boolean changed = false;
        Map<Long, String> names = new HashMap<>(previousNames);
        available.values().forEach(option -> names.put(option.getId(), option.getName()));
        for (SalonOrderItem item : items) {
            OrderStaffCorrectionForm.Item row = requested.get(item.getId());
            if (!Objects.equals(row.getExpectedStaffId(), item.getStaffId())
                    || !Objects.equals(row.getExpectedAssistantId(), item.getAssistantId()))
                throw new BizException("订单人员已被其他人更正，请刷新后重试");
            validate(item.getItemName(), row.getStaffId(), row.getAssistantId(), available, item);
            if (Objects.equals(item.getStaffId(), row.getStaffId()) && Objects.equals(item.getAssistantId(), row.getAssistantId())) continue;
            SalonOrderStaffChange change = converter.createChange(item, row, form.getReason(),
                    SecurityUtils.getNickname() == null ? SecurityUtils.getUsername() : SecurityUtils.getNickname(), names);
            changeMapper.insert(change);
            int updated = itemMapper.update(null, Wrappers.<SalonOrderItem>lambdaUpdate()
                    .eq(SalonOrderItem::getId, item.getId()).eq(SalonOrderItem::getOrderId, orderId)
                    .set(SalonOrderItem::getStaffId, row.getStaffId())
                    .set(SalonOrderItem::getAssistantId, row.getAssistantId()));
            if (updated != 1) throw new BizException("订单明细已变化，请刷新后重试");
            changed = true;
        }
        if (!changed) throw new BizException("服务人员与助理未发生变化");
    }

    @Override
    public List<OrderStaffChangeVO> listChanges(Long orderId) {
        SalonOrder order = orderMapper.selectById(orderId);
        Assert.notNull(order, "订单不存在");
        storePermissionService.assertStoreAccessible(order.getStoreId(), "无权限查看该订单");
        return changeMapper.selectList(Wrappers.<SalonOrderStaffChange>lambdaQuery()
                .eq(SalonOrderStaffChange::getOrderId, orderId)
                .orderByDesc(SalonOrderStaffChange::getCreateTime, SalonOrderStaffChange::getId))
                .stream().map(converter::entity2Vo).toList();
    }
}
