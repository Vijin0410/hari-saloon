package com.wangjin.salon.service;

import com.baomidou.mybatisplus.core.MybatisConfiguration;
import com.baomidou.mybatisplus.core.conditions.Wrapper;
import com.baomidou.mybatisplus.core.config.GlobalConfig;
import com.baomidou.mybatisplus.extension.spring.MybatisSqlSessionFactoryBean;
import com.wangjin.common.mybatis.config.MybatisPlusConfig;
import com.wangjin.common.security.context.LoginUser;
import com.wangjin.common.security.context.UserContext;
import com.wangjin.salon.service.config.PayProperties;
import com.wangjin.salon.service.converter.OrderRefundConverterImpl;
import com.wangjin.salon.service.mapper.*;
import com.wangjin.salon.service.model.entity.*;
import com.wangjin.salon.service.model.form.*;
import com.wangjin.salon.service.model.vo.OrderRefundVO;
import com.wangjin.salon.service.pay.*;
import com.wangjin.salon.service.service.*;
import com.wangjin.salon.service.service.impl.*;
import com.wangjin.salon.system.mapper.SysTenantMapper;
import com.wangjin.salon.system.service.SysTenantService;
import org.apache.ibatis.session.SqlSessionFactory;
import org.junit.*;
import org.mybatis.spring.annotation.MapperScan;
import org.springframework.context.annotation.*;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import javax.sql.DataSource;
import java.math.BigDecimal;
import java.nio.file.*;
import java.sql.*;
import java.time.LocalDate;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicLong;
import static org.junit.Assert.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/** 使用真实 PostgreSQL、真实 Mapper 与事务；仅支付渠道与无关依赖用桩。所有数据在临时 schema。 */
public class RefundPointsIntegrationTest {
    private static AnnotationConfigApplicationContext context;
    private static String schema;
    private static String url;
    private static JdbcTemplate jdbc;
    private static final AtomicLong IDS = new AtomicLong(100);
    private MemberAssetService assets;
    private OrderRefundService refunds;
    private OrderRefundConfirmExecutor confirm;
    private OrderService orders;

    @Configuration
    @Import({MybatisPlusConfig.class, MemberAssetServiceImpl.class, RefundPointServiceImpl.class,
            MemberSettingsServiceImpl.class, OrderRefundServiceImpl.class, OrderRefundConfirmExecutor.class,
            OrderRefundConverterImpl.class, OrderServiceImpl.class, OrderPayConfirmExecutor.class})
    @MapperScan({"com.wangjin.salon.service.mapper", "com.wangjin.salon.system.mapper"})
    static class Config {
        @Bean DataSource dataSource() {
            return new DriverManagerDataSource(url, System.getenv("SALON_TEST_DB_USER"), System.getenv("SALON_TEST_DB_PASSWORD"));
        }
        @Bean SqlSessionFactory sqlSessionFactory(DataSource ds, GlobalConfig global,
                com.baomidou.mybatisplus.extension.plugins.MybatisPlusInterceptor interceptor) throws Exception {
            MybatisSqlSessionFactoryBean bean = new MybatisSqlSessionFactoryBean();
            bean.setDataSource(ds); bean.setGlobalConfig(global); bean.setPlugins(interceptor);
            MybatisConfiguration cfg = new MybatisConfiguration(); cfg.setMapUnderscoreToCamelCase(true);
            bean.setConfiguration(cfg);
            bean.setMapperLocations(new PathMatchingResourcePatternResolver().getResources("classpath*:/mapper/**/*.xml"));
            return bean.getObject();
        }
        @Bean PlatformTransactionManager transactionManager(DataSource ds) { return new DataSourceTransactionManager(ds); }
        @Bean SalonStorePermissionService storePermission() { return mock(SalonStorePermissionService.class); }
        @Bean MemberLevelService levelService() { return mock(MemberLevelService.class); }
        @Bean TenantPayConfigService payConfigService() {
            TenantPayConfigService service = mock(TenantPayConfigService.class);
            SalonTenantPayConfig config=new SalonTenantPayConfig(); config.setSettleType("self_merchant");
            when(service.requireActiveConfig(anyString())).thenReturn(config); return service;
        }
        @Bean PayProperties payProperties() { PayProperties p = new PayProperties(); p.setNotifyBaseUrl("https://example.test"); return p; }
        @Bean PayChannel channel() {
            PayChannel c = mock(PayChannel.class); when(c.channel()).thenReturn("wxpay");
            when(c.nativePrepay(any(), any())).thenReturn("test-qr"); return c;
        }
        @Bean SysTenantService tenantService(SysTenantMapper mapper) {
            SysTenantService service = mock(SysTenantService.class);
            when(service.getById(any(java.io.Serializable.class))).thenAnswer(i -> mapper.selectById((java.io.Serializable)i.getArgument(0)));
            when(service.getOne(any(Wrapper.class))).thenAnswer(i -> mapper.selectOne(i.getArgument(0)));
            when(service.update(any(Wrapper.class))).thenAnswer(i -> mapper.update(null, i.getArgument(0)) > 0);
            return service;
        }
    }

    @BeforeClass public static void start() throws Exception {
        Assume.assumeNotNull(System.getenv("SALON_TEST_DB_URL"));
        String baseUrl = System.getenv("SALON_TEST_DB_URL");
        schema = "refund_points_test_" + UUID.randomUUID().toString().replace("-", "");
        url = baseUrl + (baseUrl.contains("?") ? "&" : "?") + "currentSchema=" + schema;
        try (Connection c = DriverManager.getConnection(baseUrl, System.getenv("SALON_TEST_DB_USER"), System.getenv("SALON_TEST_DB_PASSWORD")); Statement s = c.createStatement()) {
            s.execute("CREATE SCHEMA " + schema); s.execute("SET search_path TO " + schema);
            String ddl = Files.readString(Path.of("../hair-salon-boot/src/main/resources/schema.sql"));
            s.execute(ddl.substring(0, ddl.lastIndexOf("-- PostgreSQL；存量库升级")));
            s.execute("INSERT INTO sys_tenant(id,name,code) VALUES(1,'旧店','old'),(2,'旧店2','old2')");
            String migration = Files.readString(Path.of("../sql/migrate-refund-points-toggle.sql"));
            s.execute(migration); s.execute(migration);
        }
        context = new AnnotationConfigApplicationContext(Config.class);
        jdbc = new JdbcTemplate(context.getBean(DataSource.class));
        assertEquals(1, jdbc.queryForObject("SELECT points_enabled FROM sys_tenant WHERE id=1", Integer.class).intValue());
        jdbc.update("INSERT INTO sys_tenant(id,name,code) VALUES(3,'新店','new')");
        assertEquals(0, jdbc.queryForObject("SELECT points_enabled FROM sys_tenant WHERE id=3", Integer.class).intValue());
    }

    @AfterClass public static void stop() throws Exception {
        if (context != null) context.close();
        if (schema != null) try (Connection c = DriverManager.getConnection(System.getenv("SALON_TEST_DB_URL"), System.getenv("SALON_TEST_DB_USER"), System.getenv("SALON_TEST_DB_PASSWORD")); Statement s = c.createStatement()) {
            s.execute("DROP SCHEMA " + schema + " CASCADE");
        }
        UserContext.clear();
    }

    private static void login(long tenant) { UserContext.set(LoginUser.builder().userId(5L).tenantId(tenant).roles(Set.of("TENANT_ADMIN")).build()); }
    @Before public void prepare() {
        login(1);
        jdbc.execute("TRUNCATE salon_member_point_log,salon_member,salon_order,salon_order_payment,salon_refund_order,salon_refund_payment,salon_pay_record,salon_member_balance,salon_member_balance_log,salon_member_settings_audit");
        jdbc.update("UPDATE sys_tenant SET points_enabled=1");
        jdbc.update("INSERT INTO salon_member(id,name,store_id,tenant_id,points,point_debt) VALUES(10,'测试会员',1,1,0,0)");
        assets=context.getBean(MemberAssetService.class); refunds=context.getBean(OrderRefundService.class);
        confirm=context.getBean(OrderRefundConfirmExecutor.class); orders=context.getBean(OrderService.class);
    }
    private static BigDecimal money(String s) { return new BigDecimal(s); }
    private long order(String received, int used, int earned) {
        long id=IDS.incrementAndGet();
        jdbc.update("INSERT INTO salon_order(id,tenant_id,store_id,order_no,member_id,payable_amount,received_amount,point_deduct_points,point_deduct_amount,status) VALUES(?,1,1,?,10,?,?,?,?,1)", id,"TEST"+id,money(received).add(BigDecimal.valueOf(used,2)),money(received),used,BigDecimal.valueOf(used,2));
        if (used>0) { assets.changePoints(10L,used,4,"MANUAL",null,null,LocalDate.now().plusDays(10),"初始积分"); assets.changePoints(10L,-used,5,"ORDER",id,"TEST"+id,null,"抵扣"); }
        if (earned>0) assets.changePoints(10L,earned,1,"ORDER",id,"TEST"+id,null,"消费奖励");
        if (money(received).signum()>0) jdbc.update("INSERT INTO salon_order_payment(id,tenant_id,order_id,pay_method,amount) VALUES(?,1,?,1,?)",IDS.incrementAndGet(),id,money(received));
        return id;
    }
    private OrderRefundVO refund(long id,String amount) { OrderRefundForm f=new OrderRefundForm(); f.setRefundAmount(money(amount)); f.setReason("集成回归"); return refunds.apply(id,f); }
    private int points() { return jdbc.queryForObject("SELECT points FROM salon_member WHERE id=10",Integer.class); }
    private int debt() { return jdbc.queryForObject("SELECT point_debt FROM salon_member WHERE id=10",Integer.class); }
    private int count(String sql) { return jdbc.queryForObject(sql,Integer.class); }

    @Test public void fullRefundReturns1000AndClaws90Separately() {
        long id=order("90",1000,90); OrderRefundVO r=refund(id,"90");
        assertEquals(1000,r.getPointRefundPoints().intValue()); assertEquals(90,r.getPointClawbackDeducted().intValue()); assertEquals(1000,points());
        assertEquals(1,count("SELECT count(*) FROM salon_member_point_log WHERE change_type=9"));
        assertEquals(1,count("SELECT count(*) FROM salon_member_point_log WHERE change_type=10"));
        assertFalse(confirm.confirm(r.getId())); assertEquals(1000,points());
    }
    @Test public void partialRefundsUseCumulativeRoundingAndFinalRemainder() {
        long id=order("3",1000,7);
        OrderRefundVO a=refund(id,"1"), b=refund(id,"1"), c=refund(id,"1");
        assertEquals(List.of(333,333,334),List.of(a.getPointRefundPoints(),b.getPointRefundPoints(),c.getPointRefundPoints()));
        assertEquals(List.of(2,2,3),List.of(a.getPointClawbackPoints(),b.getPointClawbackPoints(),c.getPointClawbackPoints()));
        assertEquals(1000,points());
    }
    @Test public void purePointsRefundHasNoMoneyRowsAndCannotRepeat() {
        long id=order("0",1000,0); OrderRefundVO r=refund(id,"0");
        assertEquals(1000,points()); assertEquals(0,r.getRefundAmount().signum()); assertTrue(r.getPayments().isEmpty());
        assertThrows(RuntimeException.class,()->refund(id,"0"));
    }
    @Test public void spentRewardBecomesDebtWithoutTakingReturnedPoints() {
        long id=order("90",1000,90); assets.changePoints(10L,-90,7,"MANUAL",null,null,null,"已用完奖励");
        OrderRefundVO r=refund(id,"90"); assertEquals(90,r.getPointClawbackDebt().intValue()); assertEquals(1000,points()); assertEquals(90,debt());
        assets.changePoints(10L,40,1,"ORDER",999L,"NEXT",null,"新消费奖励"); assertEquals(50,debt()); assertEquals(1000,points());
        assets.changePoints(10L,70,1,"ORDER",998L,"NEXT2",null,"新消费奖励"); assertEquals(0,debt()); assertEquals(1020,points());
    }
    @Test public void expiredRewardIsNotDeductedAgainAndReturnGetsGrace() {
        long id=order("90",1000,90);
        jdbc.update("UPDATE salon_member_point_log SET expire_time=CURRENT_DATE-1 WHERE change_points>0");
        OrderRefundVO r=refund(id,"90"); assertEquals(90,r.getPointClawbackExpired().intValue()); assertEquals(0,debt()); assertEquals(1000,points());
        assertEquals(LocalDate.now().plusDays(30),jdbc.queryForObject("SELECT expire_time::date FROM salon_member_point_log WHERE change_type=9",LocalDate.class));
    }
    @Test public void disabledRejectsAdjustmentAndDeductionButPreservesHistoricalRefund() {
        long id=order("90",1000,90); MemberSettingsForm f=new MemberSettingsForm(); f.setPointsEnabled(false);
        context.getBean(MemberSettingsService.class).update(f);
        assertThrows(RuntimeException.class,()->assets.changePoints(10L,1,4,"MANUAL",null,null,null,"不允许"));
        long next=order("10",0,0); jdbc.update("UPDATE salon_order SET status=0 WHERE id=?",next);
        OrderPayForm pay=new OrderPayForm(); pay.setUsePoints(1); pay.setCashReceived(money("9.99"));
        OrderPayForm.OrderPaymentForm row=new OrderPayForm.OrderPaymentForm(); row.setPayMethod(1); row.setAmount(money("9.99")); pay.setPayments(List.of(row));
        assertThrows(RuntimeException.class,()->orders.pay(next,pay));
        refund(id,"90"); assertEquals(1000,points()); assertEquals(1,count("SELECT count(*) FROM salon_member_settings_audit"));
        login(2); assertTrue(context.getBean(MemberSettingsService.class).pointsEnabled()); login(1);
    }
    @Test public void disabledNewCashOrderDoesNotEarnPoints() {
        long id=order("10",0,0); jdbc.update("UPDATE salon_order SET status=0 WHERE id=?",id); jdbc.update("DELETE FROM salon_order_payment WHERE order_id=?",id);
        jdbc.update("UPDATE sys_tenant SET points_enabled=0 WHERE id=1");
        OrderPayForm p=cashPay("10"); orders.pay(id,p); assertEquals(0,points());
    }
    private OrderPayForm cashPay(String amount) {
        OrderPayForm p=new OrderPayForm(); p.setUsePoints(0); p.setCashReceived(money(amount));
        OrderPayForm.OrderPaymentForm r=new OrderPayForm.OrderPaymentForm(); r.setPayMethod(1); r.setAmount(money(amount)); p.setPayments(List.of(r)); return p;
    }
    @Test public void pendingFailureDoesNotChangePointsAndReleasesQuota() {
        long id=order("90",1000,90); long rid=IDS.incrementAndGet();
        jdbc.update("INSERT INTO salon_refund_order(id,tenant_id,store_id,refund_no,order_id,member_id,refund_amount,status) VALUES(?,1,1,?,?,10,45,0)",rid,"R"+rid,id);
        assertThrows(RuntimeException.class,()->refund(id,"45")); assertEquals(90,points());
        assertTrue(confirm.fail(rid,"模拟失败")); assertEquals(90,points());
        OrderRefundVO r=refund(id,"45"); assertEquals(500,r.getPointRefundPoints().intValue()); assertEquals(545,points());
    }
    @Test public void concurrentFullRefundOnlyOneSucceeds() throws Exception {
        long id=order("90",1000,90); ExecutorService executor=Executors.newFixedThreadPool(2);
        CountDownLatch start=new CountDownLatch(1);
        Callable<Boolean> action=()-> { login(1); start.await(); try { refund(id,"90"); return true; } catch(RuntimeException e) { return false; } finally { UserContext.clear(); } };
        try { Future<Boolean> a=executor.submit(action), b=executor.submit(action); start.countDown(); assertNotEquals(a.get(15,TimeUnit.SECONDS),b.get(15,TimeUnit.SECONDS)); }
        finally { executor.shutdownNow(); }
        assertEquals(1000,points()); assertEquals(1,count("SELECT count(*) FROM salon_refund_order WHERE status=1"));
    }

    @Test public void mixedExpiredSpentAndAvailableRewardIsProcessedOnceAcrossParts() {
        long id=order("90",1000,90);
        // 原奖励90：30已使用，20仍可用，40已过期。
        jdbc.update("UPDATE salon_member_point_log SET remaining_points=20 WHERE change_type=1");
        jdbc.update("UPDATE salon_member SET points=20 WHERE id=10");
        jdbc.update("INSERT INTO salon_member_point_log(id,tenant_id,member_id,store_id,change_type,before_points,change_points,after_points,source_log_id) SELECT ?,1,10,1,8,60,-40,20,id FROM salon_member_point_log WHERE change_type=1",IDS.incrementAndGet());
        OrderRefundVO a=refund(id,"45"),b=refund(id,"45");
        assertEquals(90,a.getPointClawbackPoints()+b.getPointClawbackPoints());
        assertEquals(20,a.getPointClawbackDeducted()+b.getPointClawbackDeducted());
        assertEquals(40,a.getPointClawbackExpired()+b.getPointClawbackExpired());
        assertEquals(30,a.getPointClawbackDebt()+b.getPointClawbackDebt());
        assertEquals(1000,points()); assertEquals(30,debt());
    }
    @Test public void refundKeepsOriginalExpiryAndTenantCannotReadAnotherOrder() {
        long id=order("90",1000,90); refund(id,"45");
        assertEquals(LocalDate.now().plusDays(10),jdbc.queryForObject("SELECT expire_time::date FROM salon_member_point_log WHERE change_type=9",LocalDate.class));
        login(2); assertThrows(RuntimeException.class,()->refunds.preview(id,money("1"))); login(1);
    }
    @Test public void pointDebtPreventsNewRedemptionAndPurePointsCanBePaid() {
        assets.changePoints(10L,2000,4,"MANUAL",null,null,null,"初始积分");
        long id=order("10",0,0); jdbc.update("UPDATE salon_order SET status=0 WHERE id=?",id); jdbc.update("DELETE FROM salon_order_payment WHERE order_id=?",id);
        jdbc.update("UPDATE salon_member SET point_debt=1 WHERE id=10");
        assertThrows(RuntimeException.class,()->assets.changePoints(10L,-1,5,"ORDER",id,"TEST"+id,null,"待追回期间禁止抵扣"));
        OrderPayForm p=new OrderPayForm();p.setUsePoints(1000);p.setCashReceived(BigDecimal.ZERO);p.setPayments(List.of());
        assertThrows(RuntimeException.class,()->orders.pay(id,p));
        jdbc.update("UPDATE salon_member SET point_debt=0 WHERE id=10");
        orders.pay(id,p); assertEquals(1000,points());
        refund(id,"0"); assertEquals(2000,points());
    }

    @Test public void prepaySnapshotSurvivesDisableAndRateChange() {
        long id=order("10",0,0); jdbc.update("UPDATE salon_order SET status=0 WHERE id=?",id); jdbc.update("DELETE FROM salon_order_payment WHERE order_id=?",id);
        OrderPayForm p=cashPay("10"); p.getPayments().get(0).setPayMethod(2); orders.prepayScan(id,p);
        jdbc.update("UPDATE sys_tenant SET points_enabled=0 WHERE id=1"); jdbc.update("UPDATE salon_order SET points_enabled_snapshot=0,point_rate_snapshot=99 WHERE id=?",id);
        SalonPayRecord record=context.getBean(SalonPayRecordMapper.class).selectOne(com.baomidou.mybatisplus.core.toolkit.Wrappers.<SalonPayRecord>lambdaQuery().eq(SalonPayRecord::getBizId,id));
        context.getBean(OrderPayConfirmExecutor.class).confirm(record,new PayConfirmParams("TX",java.time.LocalDateTime.now(),1000,1000,"notify","{}"));
        assertEquals(10,points());
    }
}
