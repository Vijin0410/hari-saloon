package com.wangjin.salon.service;

import com.baomidou.mybatisplus.core.MybatisConfiguration;
import com.baomidou.mybatisplus.core.conditions.Wrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.core.metadata.TableInfoHelper;
import com.wangjin.common.exception.BizException;
import com.wangjin.common.security.context.LoginUser;
import com.wangjin.common.security.context.UserContext;
import com.wangjin.salon.service.converter.OrderStaffChangeConverter;
import com.wangjin.salon.service.mapper.*;
import com.wangjin.salon.service.model.entity.*;
import com.wangjin.salon.service.model.form.OrderStaffCorrectionForm;
import com.wangjin.salon.service.model.vo.OrderStaffOptionVO;
import com.wangjin.salon.service.service.SalonStorePermissionService;
import com.wangjin.salon.service.service.impl.OrderStaffServiceImpl;
import com.wangjin.salon.system.mapper.SysUserMapper;
import com.wangjin.salon.system.model.entity.SysUser;
import org.apache.ibatis.builder.MapperBuilderAssistant;
import org.junit.After;
import org.junit.Before;
import org.junit.BeforeClass;
import org.junit.Test;
import org.mapstruct.factory.Mappers;
import org.mockito.ArgumentCaptor;

import java.util.List;
import java.util.Set;

import static org.junit.Assert.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/** 人员归属、历史保留及更正审计回归；不依赖外部数据库。 */
public class OrderStaffServiceTest {
    private OrderStaffMapper staffMapper;
    private SalonOrderMapper orderMapper;
    private SalonOrderItemMapper itemMapper;
    private SalonOrderStaffChangeMapper changeMapper;
    private OrderStaffServiceImpl service;
    private SalonOrder order;
    private SalonOrderItem item;

    @BeforeClass public static void metadata() {
        MapperBuilderAssistant builder = new MapperBuilderAssistant(new MybatisConfiguration(), "staff-test");
        TableInfoHelper.initTableInfo(builder, SalonOrder.class);
        TableInfoHelper.initTableInfo(builder, SalonOrderItem.class);
        TableInfoHelper.initTableInfo(builder, SalonOrderStaffChange.class);
    }

    @Before public void prepare() {
        UserContext.set(LoginUser.builder().userId(900L).tenantId(1L).roles(Set.of("TENANT_ADMIN")).build());
        staffMapper = mock(OrderStaffMapper.class);
        orderMapper = mock(SalonOrderMapper.class);
        itemMapper = mock(SalonOrderItemMapper.class);
        changeMapper = mock(SalonOrderStaffChangeMapper.class);
        SysUserMapper users = mock(SysUserMapper.class);
        service = new OrderStaffServiceImpl(staffMapper, mock(SalonStoreMapper.class), orderMapper,
                itemMapper, changeMapper, users, mock(SalonStorePermissionService.class),
                Mappers.getMapper(OrderStaffChangeConverter.class));
        order = new SalonOrder();
        order.setId(1L); order.setTenantId(1L); order.setStoreId(10L); order.setStatus(SalonOrder.STATUS_PAID);
        item = item(11L, 101L, 102L);
        when(orderMapper.selectOne(any(Wrapper.class))).thenReturn(order);
        when(itemMapper.selectList(any(Wrapper.class))).thenReturn(List.of(item));
        when(itemMapper.update(nullable(SalonOrderItem.class), any(Wrapper.class))).thenReturn(1);
        when(staffMapper.listOptions(1L, 10L)).thenReturn(List.of(person(101L), person(102L), person(103L)));
        when(users.selectBatchIds(anyCollection())).thenReturn(List.of(user(101L), user(102L)));
    }

    @After public void clearUser() { UserContext.clear(); }

    private SalonOrderItem item(long id, Long staffId, Long assistantId) {
        SalonOrderItem row = new SalonOrderItem();
        row.setId(id); row.setOrderId(1L); row.setTenantId(1L); row.setItemName("洗剪吹");
        row.setStaffId(staffId); row.setAssistantId(assistantId);
        return row;
    }

    private OrderStaffOptionVO person(long id) {
        OrderStaffOptionVO option = new OrderStaffOptionVO();
        option.setId(id); option.setName("员工" + id); return option;
    }

    private SysUser user(long id) {
        SysUser user = new SysUser();
        user.setId(id); user.setTenantId(1L); user.setNickname("员工" + id); return user;
    }

    private OrderStaffCorrectionForm form(SalonOrderItem... original) {
        OrderStaffCorrectionForm form = new OrderStaffCorrectionForm();
        form.setReason("  补正原人员  ");
        form.setItems(java.util.Arrays.stream(original).map(row -> {
            OrderStaffCorrectionForm.Item value = new OrderStaffCorrectionForm.Item();
            value.setOrderItemId(row.getId()); value.setStaffId(row.getStaffId()); value.setAssistantId(row.getAssistantId());
            value.setExpectedStaffId(row.getStaffId()); value.setExpectedAssistantId(row.getAssistantId());
            return value;
        }).toList());
        return form;
    }

    @Test public void correctionKeepsItemIdentityAuditsBothRolesAndClearsAssistant() {
        OrderStaffCorrectionForm form = form(item);
        form.getItems().get(0).setStaffId(103L); form.getItems().get(0).setAssistantId(null);
        service.correct(1L, form);
        ArgumentCaptor<SalonOrderStaffChange> audit = ArgumentCaptor.forClass(SalonOrderStaffChange.class);
        verify(changeMapper).insert(audit.capture());
        SalonOrderStaffChange change = audit.getValue();
        assertEquals(Long.valueOf(1), change.getOrderId());
        assertEquals(Long.valueOf(11), change.getOrderItemId());
        assertEquals(Long.valueOf(101), change.getBeforeStaffId());
        assertEquals(Long.valueOf(102), change.getBeforeAssistantId());
        assertEquals(Long.valueOf(103), change.getAfterStaffId());
        assertNull(change.getAfterAssistantId());
        assertEquals("员工101", change.getBeforeStaffName());
        assertEquals("员工103", change.getAfterStaffName());
        assertEquals("补正原人员", change.getReason());
        ArgumentCaptor<Wrapper> update = ArgumentCaptor.forClass(Wrapper.class);
        verify(itemMapper).update(isNull(), update.capture());
        LambdaUpdateWrapper<?> wrapper = (LambdaUpdateWrapper<?>) update.getValue();
        assertTrue(wrapper.getSqlSet().contains("staff_id"));
        assertTrue(wrapper.getSqlSet().contains("assistant_id"));
        assertFalse(wrapper.getSqlSet().contains("subtotal"));
        assertFalse(wrapper.getSqlSet().contains("price"));
        assertTrue(wrapper.getParamNameValuePairs().containsValue(null));
        assertEquals(Long.valueOf(101), item.getStaffId());
    }

    @Test public void unchangedDepartedStaffAndAssistantCanBeRetained() {
        SalonOrderItem departed = item(12L, 999L, 998L);
        when(itemMapper.selectList(any(Wrapper.class))).thenReturn(List.of(departed, item));
        OrderStaffCorrectionForm form = form(departed, item);
        form.getItems().get(1).setAssistantId(null);
        service.correct(1L, form);
        ArgumentCaptor<SalonOrderStaffChange> audit = ArgumentCaptor.forClass(SalonOrderStaffChange.class);
        verify(changeMapper, times(1)).insert(audit.capture());
        assertEquals(Long.valueOf(11), audit.getValue().getOrderItemId());
    }

    @Test public void newAssignmentsMustBeActiveInThisStore() {
        OrderStaffCorrectionForm form = form(item);
        form.getItems().get(0).setStaffId(999L);
        assertThrows(BizException.class, () -> service.correct(1L, form));
        form.getItems().get(0).setStaffId(101L); form.getItems().get(0).setAssistantId(999L);
        assertThrows(BizException.class, () -> service.correct(1L, form));
        verifyNoInteractions(changeMapper);
    }

    @Test public void staleOriginalAssignmentsCannotOverwriteAnotherCorrection() {
        OrderStaffCorrectionForm form = form(item);
        form.getItems().get(0).setExpectedAssistantId(null);
        form.getItems().get(0).setStaffId(103L);
        assertThrows(BizException.class, () -> service.correct(1L, form));
        verifyNoInteractions(changeMapper);
    }

    @Test public void missingDuplicateAndForeignItemsAreRejected() {
        OrderStaffCorrectionForm form = form();
        assertThrows(BizException.class, () -> service.correct(1L, form));
        form.setItems(form(item, item).getItems());
        assertThrows(BizException.class, () -> service.correct(1L, form));
        form.setItems(form(item(99L, 101L, 102L)).getItems());
        assertThrows(BizException.class, () -> service.correct(1L, form));
        verifyNoInteractions(changeMapper);
    }

    @Test public void unchangedPersonnelDoesNotCreateAuditRows() {
        assertThrows(BizException.class, () -> service.correct(1L, form(item)));
        verifyNoInteractions(changeMapper);
    }

    @Test public void correctionRequiresReasonAndSettledOrder() {
        OrderStaffCorrectionForm form = form(item); form.setReason("   ");
        assertThrows(BizException.class, () -> service.correct(1L, form));
        form.setReason("更正人员"); order.setStatus(SalonOrder.STATUS_PENDING);
        assertThrows(BizException.class, () -> service.correct(1L, form));
        order.setStatus(SalonOrder.STATUS_CANCELLED);
        assertThrows(BizException.class, () -> service.correct(1L, form));
        verifyNoInteractions(changeMapper);
    }

    @Test public void correctionRequiresSuccessfulItemUpdate() {
        when(itemMapper.update(nullable(SalonOrderItem.class), any(Wrapper.class))).thenReturn(0);
        OrderStaffCorrectionForm form = form(item); form.getItems().get(0).setStaffId(103L);
        assertThrows(BizException.class, () -> service.correct(1L, form));
    }

    @Test public void checkoutRequiresStaffAndRejectsSamePersonForBothRoles() {
        item.setStaffId(null);
        assertThrows(BizException.class, () -> service.assertReadyForPayment(order));
        item.setStaffId(101L); item.setAssistantId(101L);
        assertThrows(BizException.class, () -> service.assertReadyForPayment(order));
        item.setAssistantId(null);
        service.assertReadyForPayment(order);
    }

    @Test public void checkoutRejectsInactiveStaffEvenThoughHistoricalCorrectionMayRetainIt() {
        item.setStaffId(999L);
        assertThrows(BizException.class, () -> service.assertReadyForPayment(order));
    }
}
