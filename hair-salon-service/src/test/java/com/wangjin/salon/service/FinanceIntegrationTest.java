package com.wangjin.salon.service;

import com.baomidou.mybatisplus.core.MybatisConfiguration;
import com.baomidou.mybatisplus.core.config.GlobalConfig;
import com.baomidou.mybatisplus.extension.plugins.MybatisPlusInterceptor;
import com.baomidou.mybatisplus.extension.spring.MybatisSqlSessionFactoryBean;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.wangjin.common.mybatis.config.MybatisPlusConfig;
import com.wangjin.common.security.context.LoginUser;
import com.wangjin.common.security.context.UserContext;
import com.wangjin.salon.service.controller.FinanceController;
import com.wangjin.salon.service.model.form.DailySettlementForm;
import com.wangjin.salon.service.model.query.FinanceQuery;
import com.wangjin.salon.service.model.vo.DailySettlementVO;
import com.wangjin.salon.service.model.vo.FinanceReportVO;
import com.wangjin.salon.service.model.vo.FinanceSummaryVO;
import com.wangjin.salon.service.service.FinanceService;
import com.wangjin.salon.service.service.impl.FinanceServiceImpl;
import org.apache.ibatis.session.SqlSessionFactory;
import org.junit.AfterClass;
import org.junit.Assume;
import org.junit.Before;
import org.junit.BeforeClass;
import org.junit.Test;
import org.mybatis.spring.annotation.MapperScan;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.PlatformTransactionManager;

import javax.sql.DataSource;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.Statement;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertThrows;
import static org.junit.Assert.assertTrue;

/**
 * 真实 PostgreSQL 财务集成回归，覆盖租户插件、方法鉴权、日结事务及幂等。
 * <p>
 * 仅在随机临时 schema 内写入数据，测试结束后清理，不修改业务数据。
 */
public class FinanceIntegrationTest {

    private static final LocalDate BUSINESS_DATE = LocalDate.now(ZoneId.of("Asia/Shanghai")).minusDays(2);

    private static AnnotationConfigApplicationContext context;
    private static String schema;
    private static String url;
    private static JdbcTemplate jdbc;

    private FinanceService financeService;

    @Configuration
    @EnableMethodSecurity
    @Import({MybatisPlusConfig.class, FinanceServiceImpl.class, FinanceController.class})
    @MapperScan("com.wangjin.salon.service.mapper")
    static class Config {

        @Bean
        DataSource dataSource() {
            return new DriverManagerDataSource(url,
                    System.getenv("SALON_TEST_DB_USER"), System.getenv("SALON_TEST_DB_PASSWORD"));
        }

        @Bean
        ObjectMapper objectMapper() {
            return new ObjectMapper().findAndRegisterModules();
        }

        @Bean
        SqlSessionFactory sqlSessionFactory(DataSource dataSource, GlobalConfig globalConfig,
                                           MybatisPlusInterceptor interceptor) throws Exception {
            MybatisSqlSessionFactoryBean factory = new MybatisSqlSessionFactoryBean();
            factory.setDataSource(dataSource);
            factory.setGlobalConfig(globalConfig);
            factory.setPlugins(interceptor);
            MybatisConfiguration configuration = new MybatisConfiguration();
            configuration.setMapUnderscoreToCamelCase(true);
            factory.setConfiguration(configuration);
            factory.setMapperLocations(new PathMatchingResourcePatternResolver()
                    .getResources("classpath*:/mapper/**/*.xml"));
            return factory.getObject();
        }

        @Bean
        PlatformTransactionManager transactionManager(DataSource dataSource) {
            return new DataSourceTransactionManager(dataSource);
        }
    }

    @BeforeClass
    public static void start() throws Exception {
        Assume.assumeNotNull(System.getenv("SALON_TEST_DB_URL"));
        String baseUrl = System.getenv("SALON_TEST_DB_URL");
        schema = "finance_test_" + UUID.randomUUID().toString().replace("-", "");
        url = baseUrl + (baseUrl.contains("?") ? "&" : "?") + "currentSchema=" + schema;
        try (Connection connection = openConnection(); Statement statement = connection.createStatement()) {
            statement.execute("CREATE SCHEMA " + schema);
            statement.execute("SET search_path TO " + schema);
            statement.execute(Files.readString(Path.of("../hair-salon-boot/src/main/resources/schema.sql")));
            String migration = Files.readString(Path.of("../sql/migrate-p8-p9-finance.sql"));
            // 同一迁移重复执行，验证存量库升级脚本的幂等性。
            statement.execute(migration);
            statement.execute(migration);
        }
        context = new AnnotationConfigApplicationContext(Config.class);
        jdbc = new JdbcTemplate(context.getBean(DataSource.class));
    }

    @AfterClass
    public static void stop() throws Exception {
        if (context != null) {
            context.close();
        }
        if (schema != null) {
            try (Connection connection = openConnection(); Statement statement = connection.createStatement()) {
                statement.execute("DROP SCHEMA " + schema + " CASCADE");
            }
        }
        UserContext.clear();
        SecurityContextHolder.clearContext();
    }

    @Before
    public void seed() {
        login(1, "TENANT_ADMIN");
        financeService = context.getBean(FinanceService.class);
        jdbc.execute("TRUNCATE salon_daily_settlement, salon_store_user, salon_store, salon_member, "
                + "salon_order, salon_order_item, salon_order_payment, salon_recharge_order, "
                + "salon_refund_order, salon_refund_payment, salon_member_balance_log");
        jdbc.update("INSERT INTO salon_store (id, tenant_id, name, create_by) "
                + "VALUES (1, 1, '门店一', 99), (2, 1, '未授权店', 99), (3, 2, '其他租户', 99)");
        jdbc.update("INSERT INTO salon_store_user (id, tenant_id, store_id, user_id) VALUES (1, 1, 1, 5)");
        jdbc.update("INSERT INTO salon_member (id, tenant_id, store_id, name, create_time) "
                + "VALUES (10, 1, 1, '会员', ?)", BUSINESS_DATE.atTime(9, 0));
        jdbc.update("INSERT INTO salon_order (id, tenant_id, store_id, order_no, member_id, status, "
                + "received_amount, point_deduct_amount, paid_time) VALUES "
                + "(100, 1, 1, 'O100', 10, 2, 100, 10, ?), "
                + "(101, 1, 1, 'PENDING', NULL, 0, 999, 0, ?), "
                + "(102, 1, 2, 'S2', NULL, 1, 500, 0, ?), "
                + "(103, 2, 3, 'T2', NULL, 1, 700, 0, ?)",
                BUSINESS_DATE.atTime(10, 0), BUSINESS_DATE.atTime(10, 0),
                BUSINESS_DATE.atTime(10, 0), BUSINESS_DATE.atTime(10, 0));
        jdbc.update("INSERT INTO salon_order_payment (id, tenant_id, order_id, pay_method, amount) "
                + "VALUES (1, 1, 100, 1, 60), (2, 1, 100, 5, 40), (3, 1, 100, 7, 10), "
                + "(4, 1, 102, 1, 500), (5, 2, 103, 1, 700)");
        jdbc.update("INSERT INTO salon_order_item (id, tenant_id, order_id, item_type, item_id, "
                + "item_name, quantity, unit_price, price, subtotal) "
                + "VALUES (1, 1, 100, 1, 1, '剪发', 1, 80, 80, 80), "
                + "(2, 1, 100, 2, 2, '洗发水', 1, 30, 30, 30)");
        jdbc.update("INSERT INTO salon_recharge_order (id, tenant_id, store_id, member_id, recharge_no, "
                + "status, principal_amount, gift_amount, pay_method, pay_time) "
                + "VALUES (200, 1, 1, 10, 'R200', 1, 200, 20, 2, ?)", BUSINESS_DATE.atTime(11, 0));
        jdbc.update("INSERT INTO salon_refund_order (id, tenant_id, store_id, order_id, order_no, "
                + "refund_no, status, refund_amount, point_refund_amount, success_time) "
                + "VALUES (300, 1, 1, 100, 'O100', 'F300', 1, 30, 3, ?), "
                + "(301, 1, 1, 100, 'O100', 'FAIL', 2, 999, 0, ?)",
                BUSINESS_DATE.atTime(12, 0), BUSINESS_DATE.atTime(12, 0));
        jdbc.update("INSERT INTO salon_refund_payment (id, tenant_id, refund_id, pay_method, amount) "
                + "VALUES (1, 1, 300, 1, 10), (2, 1, 300, 5, 20)");
        jdbc.update("INSERT INTO salon_member_balance_log (id, tenant_id, member_id, store_id, "
                + "balance_type, change_type, before_amount, change_amount, after_amount, create_time) "
                + "VALUES (1, 1, 10, 1, 1, 1, 0, 50, 50, ?), "
                + "(2, 1, 10, 1, 1, 1, 50, 200, 250, ?), "
                + "(3, 1, 10, 1, 1, 3, 250, -40, 210, ?), "
                + "(4, 1, 10, 1, 1, 4, 210, 20, 230, ?)",
                BUSINESS_DATE.minusDays(1).atTime(10, 0), BUSINESS_DATE.atTime(11, 0),
                BUSINESS_DATE.atTime(11, 30), BUSINESS_DATE.atTime(12, 0));
    }

    @Test
    public void separatesConsumptionRechargeRefundAndExternalCash() {
        FinanceQuery query = query();
        query.setStoreId(1L);
        FinanceReportVO report = financeService.report(query);
        FinanceSummaryVO summary = report.getSummary();
        assertAmount("100", summary.getConsumptionAmount());
        assertAmount("70", summary.getNetConsumption());
        assertAmount("200", summary.getRechargeAmount());
        assertAmount("20", summary.getRechargeGift());
        assertAmount("250", summary.getNetCashflow());
        assertAmount("50", summary.getPrincipalOpening());
        assertAmount("230", summary.getPrincipalClosing());
        assertEquals(1L, summary.getOrderCount().longValue());
        assertAmount("80", report.getServices().get(0).getAmount());
        assertAmount("30", report.getGoods().get(0).getAmount());
        assertEquals(3, financeService.ledger(query).getTotal());
        assertEquals(3, financeService.exportLedger(query).size());
    }

    @Test
    public void tenantAndStoreFiltersCannotBeForged() {
        login(1, "STORE_MANAGER");
        FinanceQuery query = query();
        query.setTenantId(2L);
        query.setAllowedStoreIds(List.of(3L));
        assertAmount("100", financeService.report(query).getSummary().getConsumptionAmount());

        FinanceQuery deniedQuery = query();
        deniedQuery.setStoreId(2L);
        assertThrows(RuntimeException.class, () -> financeService.report(deniedQuery));
        login(1, "TENANT_ADMIN");
        assertAmount("600", financeService.report(query()).getSummary().getConsumptionAmount());
        login(1, "ROOT");
        assertAmount("1300", financeService.report(query()).getSummary().getConsumptionAmount());
    }

    @Test
    public void noStoresReturnsZeroWithoutLeaking() {
        login(9, "STORE_MANAGER");
        FinanceReportVO report = financeService.report(query());
        assertAmount("0", report.getSummary().getConsumptionAmount());
        assertTrue(report.getStores().isEmpty());
    }

    @Test
    public void storeOptionsMatchReportScopeAndIgnoreStoreCreator() {
        login(1, "STORE_MANAGER");
        jdbc.update("UPDATE salon_store SET create_by = 5 WHERE id = 2");
        assertEquals(List.of(1L), financeService.storeOptions(2L).stream()
                .map(option -> option.getValue()).toList());
        assertAmount("100", financeService.report(query()).getSummary().getConsumptionAmount());
        FinanceQuery deniedQuery = query();
        deniedQuery.setStoreId(2L);
        assertThrows(RuntimeException.class, () -> financeService.report(deniedQuery));
        login(1, "TENANT_ADMIN");
        assertEquals(2, financeService.storeOptions(2L).size());
        login(1, "ROOT");
        assertEquals(3, financeService.storeOptions(null).size());
        assertEquals(1, financeService.storeOptions(2L).size());
        login(9, "STORE_MANAGER");
        assertTrue(financeService.storeOptions(null).isEmpty());
    }

    @Test
    public void yearlyRangeIncludesLeapDayAndMonthlyTotals() {
        jdbc.update("UPDATE salon_order SET paid_time = '2024-02-29 10:00:00' WHERE id = 100");
        jdbc.update("UPDATE salon_order SET paid_time = '2024-12-31 10:00:00' WHERE id = 102");
        FinanceQuery query = query();
        query.setStartDate(LocalDate.of(2024, 1, 1));
        query.setEndDate(LocalDate.of(2024, 12, 31));
        assertAmount("600", financeService.report(query).getSummary().getConsumptionAmount());
        assertEquals(366, financeService.report(query).getTrend().size());
        query.setTrendPeriod("MONTH");
        FinanceReportVO yearlyReport = financeService.report(query);
        assertEquals("MONTH", yearlyReport.getTrendPeriod());
        assertEquals(12, yearlyReport.getTrend().size());
        assertEquals("2024-02", yearlyReport.getTrend().get(1).getLabel());
        assertAmount("100", yearlyReport.getTrend().get(1).getAmount());
        assertAmount("500", yearlyReport.getTrend().get(11).getAmount());
        assertAmount("0", yearlyReport.getTrend().get(0).getAmount());
        query.setTrendPeriod("DAY");
        query.setStartDate(LocalDate.of(2024, 2, 1));
        query.setEndDate(LocalDate.of(2024, 2, 29));
        assertAmount("100", financeService.report(query).getSummary().getConsumptionAmount());
        assertEquals(29, financeService.report(query).getTrend().size());
    }

    @Test
    public void crossDayRefundBelongsToSuccessDayAndTrendIncludesEmptyDays() {
        jdbc.update("UPDATE salon_refund_order SET success_time = ? WHERE id = 300",
                BUSINESS_DATE.plusDays(1).atTime(0, 1));
        FinanceQuery query = query();
        query.setStoreId(1L);
        assertAmount("100", financeService.report(query).getSummary().getNetConsumption());
        query.setStartDate(BUSINESS_DATE.plusDays(1));
        query.setEndDate(BUSINESS_DATE.plusDays(1));
        assertAmount("-30", financeService.report(query).getSummary().getNetConsumption());
        query.setStartDate(BUSINESS_DATE.minusDays(1));
        assertEquals(3, financeService.report(query).getTrend().size());
    }

    @Test
    public void snapshotIsImmutableAndDetectsLateData() {
        DailySettlementForm form = new DailySettlementForm();
        form.setStoreId(1L);
        form.setBusinessDate(BUSINESS_DATE);
        Long id = financeService.settle(form);
        assertFalse(financeService.detail(id).getChanged());
        jdbc.update("UPDATE salon_order SET received_amount = 110 WHERE id = 100");
        DailySettlementVO detail = financeService.detail(id);
        assertTrue(detail.getChanged());
        assertAmount("100", detail.getSnapshot().getSummary().getConsumptionAmount());
        assertThrows(RuntimeException.class, () -> financeService.settle(form));
        assertEquals(1, financeService.settlements(query()).getTotal());
        login(2, "TENANT_ADMIN");
        assertThrows(RuntimeException.class, () -> financeService.detail(id));
    }

    @Test
    public void concurrentSettlementHasOneWinner() throws Exception {
        ExecutorService pool = Executors.newFixedThreadPool(2);
        try {
            List<Callable<Boolean>> jobs = List.of(this::settleOnce, this::settleOnce);
            int wins = 0;
            for (Future<Boolean> result : pool.invokeAll(jobs)) {
                if (result.get()) {
                    wins++;
                }
            }
            assertEquals(1, wins);
        } finally {
            pool.shutdownNow();
        }
    }

    @Test
    public void rejectsInvalidRangeAndCurrentDaySettlement() {
        FinanceQuery query = query();
        query.setEndDate(BUSINESS_DATE.minusDays(1));
        assertThrows(RuntimeException.class, () -> financeService.report(query));
        DailySettlementForm form = new DailySettlementForm();
        form.setStoreId(1L);
        form.setBusinessDate(LocalDate.now(ZoneId.of("Asia/Shanghai")));
        assertThrows(RuntimeException.class, () -> financeService.settle(form));
    }

    @Test
    public void methodPermissionsDenyOrdinaryStaffAndAllowRoot() {
        login(1, "STORE_STAFF");
        FinanceController controller = context.getBean(FinanceController.class);
        assertThrows(AccessDeniedException.class, () -> controller.report(query()));
        login(1, "ROOT");
        assertNotNull(controller.report(query()));
    }

    private static Connection openConnection() throws Exception {
        return DriverManager.getConnection(System.getenv("SALON_TEST_DB_URL"),
                System.getenv("SALON_TEST_DB_USER"), System.getenv("SALON_TEST_DB_PASSWORD"));
    }

    private static void login(long tenantId, String role) {
        UserContext.set(LoginUser.builder().userId(5L).tenantId(tenantId).roles(Set.of(role)).build());
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("test", "test", List.of()));
    }

    private FinanceQuery query() {
        FinanceQuery query = new FinanceQuery();
        query.setStartDate(BUSINESS_DATE);
        query.setEndDate(BUSINESS_DATE);
        return query;
    }

    private void assertAmount(String expected, BigDecimal actual) {
        assertEquals(0, new BigDecimal(expected).compareTo(actual));
    }

    private boolean settleOnce() {
        login(1, "TENANT_ADMIN");
        try {
            DailySettlementForm form = new DailySettlementForm();
            form.setStoreId(1L);
            form.setBusinessDate(BUSINESS_DATE);
            financeService.settle(form);
            return true;
        } catch (RuntimeException ex) {
            return false;
        } finally {
            UserContext.clear();
            SecurityContextHolder.clearContext();
        }
    }
}
