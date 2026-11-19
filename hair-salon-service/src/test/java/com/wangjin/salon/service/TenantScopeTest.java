package com.wangjin.salon.service;

import com.baomidou.mybatisplus.core.MybatisConfiguration;
import com.baomidou.mybatisplus.core.metadata.TableInfoHelper;
import com.baomidou.mybatisplus.extension.plugins.inner.TenantLineInnerInterceptor;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.wangjin.common.exception.BizException;
import com.wangjin.common.mybatis.config.MybatisProperties;
import com.wangjin.common.mybatis.handler.MyMetaObjectHandler;
import com.wangjin.common.mybatis.handler.WjTenantLineHandler;
import com.wangjin.common.security.context.LoginUser;
import com.wangjin.common.security.context.TenantContext;
import com.wangjin.common.security.context.UserContext;
import com.wangjin.common.security.util.SecurityUtils;
import com.wangjin.common.redis.service.RedisService;
import com.wangjin.common.constant.CacheConstants;
import com.wangjin.salon.system.cache.SystemCacheServiceImpl;
import com.wangjin.salon.system.mapper.SystemCacheMapper;
import com.wangjin.salon.system.service.SysDictService;
import com.wangjin.salon.system.model.entity.SysDept;
import com.wangjin.salon.service.mapper.FinanceMapper;
import com.wangjin.salon.service.mapper.SalonDailySettlementMapper;
import com.wangjin.salon.service.model.query.FinanceQuery;
import com.wangjin.salon.service.service.impl.FinanceServiceImpl;
import com.wangjin.salon.system.handler.SalonTenantInterceptor;
import com.wangjin.salon.system.model.entity.SysTenant;
import com.wangjin.salon.system.model.entity.SysUser;
import com.wangjin.salon.system.service.SysTenantService;
import com.wangjin.salon.system.service.impl.SysTenantServiceImpl;
import com.wangjin.salon.system.util.TenantContextRunner;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.apache.ibatis.builder.MapperBuilderAssistant;
import org.apache.ibatis.reflection.SystemMetaObject;
import org.junit.After;
import org.junit.Before;
import org.junit.Test;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import static org.junit.Assert.*;
import static org.mockito.Mockito.*;

/** 租户切换、SQL 隔离和写入归属回归，不依赖外部数据库。 */
public class TenantScopeTest {
    private SysTenantService tenants;
    private SalonTenantInterceptor interceptor;
    private HttpServletRequest request;
    private HttpServletResponse response;

    @Before
    public void prepare() {
        TenantContext.clear();
        UserContext.set(LoginUser.builder().userId(9L).tenantId(1L).roles(Set.of("ROOT")).build());
        tenants = mock(SysTenantService.class);
        interceptor = new SalonTenantInterceptor(tenants);
        request = mock(HttpServletRequest.class);
        response = mock(HttpServletResponse.class);
        when(request.getRequestURI()).thenReturn("/api/v1/members/page");
        when(request.getContextPath()).thenReturn("");
        Map<String, Object> attributes = new HashMap<>();
        doAnswer(a -> { attributes.put(a.getArgument(0), a.getArgument(1)); return null; })
                .when(request).setAttribute(anyString(), any());
        when(request.getAttribute(anyString())).thenAnswer(a -> attributes.get(a.getArgument(0)));
        doAnswer(a -> { attributes.remove(a.getArgument(0)); return null; })
                .when(request).removeAttribute(anyString());
    }

    @After
    public void clear() {
        TenantContext.clear();
        UserContext.clear();
    }

    @Test
    public void rootSelectionPreservesIdentityAndIsReleasedOnFailure() {
        when(request.getHeader(SalonTenantInterceptor.TENANT_HEADER)).thenReturn("77");
        assertTrue(interceptor.preHandle(request, response, this));
        verify(tenants).requireAvailableTenant(77L);
        assertEquals(Long.valueOf(77), SecurityUtils.getTenantId());
        assertEquals(Long.valueOf(1), UserContext.getTenantId());
        assertEquals(Long.valueOf(9), SecurityUtils.getUserId());
        assertTrue(SecurityUtils.isRoot());
        interceptor.afterCompletion(request, response, this, new RuntimeException("business failure"));
        assertNull(TenantContext.getTenantId());
        assertEquals(Long.valueOf(1), SecurityUtils.getTenantId());
    }

    @Test
    public void rootMustChooseTenantForBusiness() {
        assertThrows(BizException.class, () -> interceptor.preHandle(request, response, this));
        assertNull(TenantContext.getTenantId());
    }

    @Test
    public void invalidTenantHeaderFailsBeforeOpeningScope() {
        for (String value : List.of("-1", "0", "abc", "99999999999999999999999999")) {
            when(request.getHeader(SalonTenantInterceptor.TENANT_HEADER)).thenReturn(value);
            assertThrows(BizException.class, () -> interceptor.preHandle(request, response, this));
            assertNull(TenantContext.getTenantId());
        }
        verifyNoInteractions(tenants);
    }

    @Test
    public void disabledOrMissingTenantCannotOpenScope() {
        when(request.getHeader(SalonTenantInterceptor.TENANT_HEADER)).thenReturn("77");
        doThrow(new BizException("租户不存在或已禁用")).when(tenants).requireAvailableTenant(77L);
        assertThrows(BizException.class, () -> interceptor.preHandle(request, response, this));
        assertNull(TenantContext.getTenantId());
    }

    @Test
    public void ordinaryUserCannotForgeAnotherTenant() {
        UserContext.set(LoginUser.builder().userId(9L).tenantId(77L).roles(Set.of("TENANT_ADMIN")).build());
        when(request.getHeader(SalonTenantInterceptor.TENANT_HEADER)).thenReturn("88");
        assertThrows(BizException.class, () -> interceptor.preHandle(request, response, this));
        assertNull(TenantContext.getTenantId());
    }

    @Test
    public void ordinaryUserUsesOwnTenantWithoutHeader() {
        UserContext.set(LoginUser.builder().userId(9L).tenantId(77L).roles(Set.of("TENANT_ADMIN")).build());
        assertTrue(interceptor.preHandle(request, response, this));
        assertEquals(Long.valueOf(77), SecurityUtils.getTenantId());
        interceptor.afterConcurrentHandlingStarted(request, response, this);
        assertNull(TenantContext.getTenantId());
    }

    @Test
    public void platformOperationsUseLoginTenantDespiteSelection() {
        when(request.getRequestURI()).thenReturn("/api/v1/tenants/add");
        when(request.getHeader(SalonTenantInterceptor.TENANT_HEADER)).thenReturn("77");
        assertTrue(interceptor.preHandle(request, response, this));
        assertEquals(Long.valueOf(1), SecurityUtils.getTenantId());
        verifyNoInteractions(tenants);
        interceptor.afterCompletion(request, response, this, null);
    }

    @Test
    public void nestedTaskRestoresScopeAfterException() {
        try (TenantContext.Scope scope = TenantContext.use(77L)) {
            assertThrows(BizException.class, () -> TenantContextRunner.run(88L, (Runnable) () -> {
                assertEquals(Long.valueOf(88), SecurityUtils.getTenantId());
                assertEquals(Long.valueOf(1), UserContext.getTenantId());
                throw new BizException("failed task");
            }));
            assertEquals(Long.valueOf(77), SecurityUtils.getTenantId());
        }
        assertNull(TenantContext.getTenantId());
    }

    @Test
    public void explicitRootScopeFiltersReadUpdateDeleteAndInsert() {
        MybatisProperties properties = new MybatisProperties();
        properties.getIgnoreTables().add("platform_table");
        WjTenantLineHandler handler = new WjTenantLineHandler(properties);
        assertTrue(handler.ignoreTable("scoped_record"));
        TenantLineInnerInterceptor sql = new TenantLineInnerInterceptor(handler);
        try (TenantContext.Scope scope = TenantContext.use(77L)) {
            assertFalse(handler.ignoreTable("scoped_record"));
            assertTrue(handler.ignoreTable("platform_table"));
            for (String statement : List.of("SELECT id FROM scoped_record",
                    "UPDATE scoped_record SET name = 'sample' WHERE id = 1",
                    "DELETE FROM scoped_record WHERE id = 1")) {
                assertTrue(sql.parserSingle(statement, null).contains("tenant_id = 77"));
            }
            String insert = sql.parserSingle("INSERT INTO scoped_record (id, name) VALUES (1, 'sample')", null);
            assertTrue(insert.contains("tenant_id"));
            assertTrue(insert.contains("77"));
        }
        assertTrue(handler.ignoreTable("scoped_record"));
    }

    @Test
    public void insertFillUsesSelectedTenantAndActualOperator() {
        TableInfoHelper.initTableInfo(new MapperBuilderAssistant(new MybatisConfiguration(), "tenant-fill"), SysUser.class);
        SysUser entity = new SysUser();
        try (TenantContext.Scope scope = TenantContext.use(77L)) {
            new MyMetaObjectHandler().insertFill(SystemMetaObject.forObject(entity));
        }
        assertEquals(Long.valueOf(77), entity.getTenantId());
        assertEquals(Long.valueOf(9), entity.getCreateBy());
    }

    @Test
    public void financeIgnoresClientTenantWhenMapperBypassesTenantLine() {
        FinanceMapper mapper = mock(FinanceMapper.class);
        when(mapper.visibleStores(77L, 9L, true)).thenReturn(List.of(13L));
        FinanceServiceImpl service = new FinanceServiceImpl(mapper, mock(SalonDailySettlementMapper.class), new ObjectMapper());
        FinanceQuery query = new FinanceQuery();
        query.setTenantId(88L);
        try (TenantContext.Scope scope = TenantContext.use(77L)) {
            service.ledger(query);
            service.storeOptions(88L);
        }
        assertEquals(Long.valueOf(77), query.getTenantId());
        assertEquals(List.of(13L), query.getAllowedStoreIds());
        verify(mapper).visibleStores(77L, 9L, true);
        verify(mapper).visibleStoreOptions(77L, 9L, true);
    }

    @Test
    public void tenantValidationRejectsMissingDisabledAndExpiredTargets() {
        SysTenantServiceImpl service = mock(SysTenantServiceImpl.class, CALLS_REAL_METHODS);
        doReturn(null).when(service).getById(77L);
        assertThrows(BizException.class, () -> service.requireAvailableTenant(77L));
        SysTenant tenant = new SysTenant();
        tenant.setStatus(0);
        doReturn(tenant).when(service).getById(77L);
        assertThrows(BizException.class, () -> service.requireAvailableTenant(77L));
        tenant.setStatus(1);
        tenant.setExpireTime(LocalDateTime.now(ZoneId.of("Asia/Shanghai")).minusSeconds(1));
        assertThrows(BizException.class, () -> service.requireAvailableTenant(77L));
        tenant.setExpireTime(null);
        service.requireAvailableTenant(77L);
    }

    @Test
    public void globalIdCachesRebuildAllTenantsAndRestoreRequestScope() {
        RedisService redis = mock(RedisService.class);
        SystemCacheMapper rows = mock(SystemCacheMapper.class);
        SysUser firstUser = new SysUser();
        firstUser.setId(10L);
        firstUser.setTenantId(1L);
        SysUser secondUser = new SysUser();
        secondUser.setId(770L);
        secondUser.setTenantId(77L);
        when(rows.listUsersForCache()).thenReturn(List.of(firstUser, secondUser));
        SysDept firstDept = new SysDept();
        firstDept.setId(10L);
        firstDept.setTenantId(1L);
        SysDept secondDept = new SysDept();
        secondDept.setId(770L);
        secondDept.setTenantId(77L);
        when(rows.listDeptsForCache()).thenReturn(List.of(firstDept, secondDept));
        SystemCacheServiceImpl caches = new SystemCacheServiceImpl(redis, mock(SysDictService.class),
                rows);
        try (TenantContext.Scope scope = TenantContext.use(77L)) {
            caches.refreshUserCache();
            caches.refreshDeptCache();
            assertEquals(Long.valueOf(77), SecurityUtils.getTenantId());
            assertEquals(Long.valueOf(9), SecurityUtils.getUserId());
        }
        verify(redis).setCacheMap(eq(CacheConstants.SYS_USER_KEY + 10), anyMap());
        verify(redis).setCacheMap(eq(CacheConstants.SYS_USER_KEY + 770), anyMap());
        verify(redis).setCacheMap(eq(CacheConstants.SYS_DEPT_KEY + 10), anyMap());
        verify(redis).setCacheMap(eq(CacheConstants.SYS_DEPT_KEY + 770), anyMap());
        verify(rows).listUsersForCache();
        verify(rows).listDeptsForCache();
        assertNull(TenantContext.getTenantId());
    }
}
