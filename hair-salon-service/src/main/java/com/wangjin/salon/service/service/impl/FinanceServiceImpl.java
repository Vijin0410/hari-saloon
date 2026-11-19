package com.wangjin.salon.service.service.impl;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.wangjin.common.exception.BizException;
import com.wangjin.common.security.util.SecurityUtils;
import com.wangjin.salon.service.mapper.FinanceMapper;
import com.wangjin.salon.service.mapper.SalonDailySettlementMapper;
import com.wangjin.salon.service.model.entity.SalonDailySettlement;
import com.wangjin.salon.service.model.form.DailySettlementForm;
import com.wangjin.salon.service.model.query.FinanceQuery;
import com.wangjin.salon.service.model.vo.DailySettlementVO;
import com.wangjin.salon.service.model.vo.FinanceLedgerVO;
import com.wangjin.salon.service.model.vo.FinanceReportVO;
import com.wangjin.salon.service.model.vo.FinanceStoreOptionVO;
import com.wangjin.salon.service.service.FinanceService;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Set;

/**
 * 财务查询与日结服务。
 * <p>
 * 按可见门店白名单汇总，不能通过开单人条件扩大整店财务数据范围。
 */
@Service
@RequiredArgsConstructor
public class FinanceServiceImpl implements FinanceService {

    private static final ZoneId BUSINESS_ZONE = ZoneId.of("Asia/Shanghai");

    private final FinanceMapper financeMapper;
    private final SalonDailySettlementMapper settlementMapper;
    private final ObjectMapper objectMapper;

    @Override
    public List<FinanceStoreOptionVO> storeOptions(Long tenantId) {
        if (SecurityUtils.getUserId() == null || SecurityUtils.getTenantId() == null) {
            throw new BizException("请先登录");
        }
        Long effectiveTenantId = SecurityUtils.getTenantId();
        boolean all = SecurityUtils.isRoot() || SecurityUtils.getRoles().contains("TENANT_ADMIN");
        return financeMapper.visibleStoreOptions(effectiveTenantId, SecurityUtils.getUserId(), all);
    }

    @Override
    public FinanceReportVO report(FinanceQuery query) {
        prepareQuery(query);
        return buildReport(query);
    }

    @Override
    public Page<FinanceLedgerVO> ledger(FinanceQuery query) {
        prepareQuery(query);
        return financeMapper.ledger(new Page<>(query.getPageNum(), query.getPageSize()), query);
    }

    @Override
    public List<FinanceLedgerVO> exportLedger(FinanceQuery query) {
        prepareQuery(query);
        List<FinanceLedgerVO> rows = financeMapper.exportLedger(query);
        if (rows.size() > 10000) {
            throw new BizException("明细超过10000条，请缩小日期范围后导出");
        }
        return rows;
    }

    @Override
    public Page<DailySettlementVO> settlements(FinanceQuery query) {
        prepareQuery(query);
        return financeMapper.settlements(new Page<>(query.getPageNum(), query.getPageSize()), query);
    }

    @Override
    @Transactional(rollbackFor = Exception.class, isolation = Isolation.REPEATABLE_READ)
    public Long settle(DailySettlementForm form) {
        if (form.getBusinessDate() == null
                || !form.getBusinessDate().isBefore(LocalDate.now(BUSINESS_ZONE))) {
            throw new BizException("仅能结算已结束的营业日");
        }

        FinanceQuery query = new FinanceQuery();
        query.setStoreId(form.getStoreId());
        query.setStartDate(form.getBusinessDate());
        query.setEndDate(form.getBusinessDate());
        prepareQuery(query);

        Long tenantId = financeMapper.storeTenant(form.getStoreId());
        if (tenantId == null) {
            throw new BizException("门店不存在");
        }

        // 同一事务快照内生成全部汇总，避免日结期间新增交易导致报表内部口径不一致。
        FinanceReportVO report = buildReport(query);
        SalonDailySettlement settlement = new SalonDailySettlement();
        settlement.setTenantId(tenantId);
        settlement.setStoreId(form.getStoreId());
        settlement.setBusinessDate(form.getBusinessDate());
        settlement.setRemark(form.getRemark());
        settlement.setSnapshot(encode(report));
        settlement.setFingerprint(report.getSummary().getFingerprint());
        settlement.setCreateBy(SecurityUtils.getUserId());
        settlement.setCreateTime(LocalDateTime.now(BUSINESS_ZONE));
        try {
            settlementMapper.insert(settlement);
        } catch (DuplicateKeyException ex) {
            throw new BizException("该门店当天已经日结，请查看历史日结记录");
        }
        return settlement.getId();
    }

    @Override
    public DailySettlementVO detail(Long id) {
        SalonDailySettlement settlement = settlementMapper.selectById(id);
        if (settlement == null) {
            throw new BizException("日结记录不存在");
        }

        FinanceQuery query = new FinanceQuery();
        query.setStoreId(settlement.getStoreId());
        query.setStartDate(settlement.getBusinessDate());
        query.setEndDate(settlement.getBusinessDate());
        prepareQuery(query);

        DailySettlementVO detail = financeMapper.settlement(id);
        try {
            detail.setSnapshot(objectMapper.readValue(settlement.getSnapshot(), FinanceReportVO.class));
        } catch (JsonProcessingException ex) {
            throw new BizException("日结快照读取失败", ex);
        }
        // 早期快照没有趋势粒度，按原有的每日趋势兼容比较。
        if (detail.getSnapshot().getTrendPeriod() == null) {
            detail.getSnapshot().setTrendPeriod("DAY");
        }
        // 比较完整报表，支付分摊、项目名称、会员及本金流水变更均需提示核对。
        detail.setChanged(!encode(detail.getSnapshot()).equals(encode(buildReport(query))));
        return detail;
    }

    /**
     * 服务端重算查询范围，覆盖客户端传入的租户及门店权限辅助字段。
     */
    private void prepareQuery(FinanceQuery query) {
        if (SecurityUtils.getUserId() == null || SecurityUtils.getTenantId() == null) {
            throw new BizException("请先登录");
        }
        query.setTenantId(SecurityUtils.getTenantId());

        LocalDate today = LocalDate.now(BUSINESS_ZONE);
        if (query.getStartDate() == null) {
            query.setStartDate(today.withDayOfMonth(1));
        }
        if (query.getEndDate() == null) {
            query.setEndDate(today);
        }
        long days = ChronoUnit.DAYS.between(query.getStartDate(), query.getEndDate());
        if (days < 0 || days > 365 || query.getEndDate().isAfter(today)) {
            throw new BizException("日期范围须在今天及以前，且不超过366天");
        }
        if (query.getKind() != null && !query.getKind().isBlank()
                && !Set.of("ORDER", "RECHARGE", "REFUND").contains(query.getKind())) {
            throw new BizException("业务类型不正确");
        }
        if (query.getTrendPeriod() == null || query.getTrendPeriod().isBlank()) {
            query.setTrendPeriod("DAY");
        } else if (!Set.of("DAY", "MONTH").contains(query.getTrendPeriod())) {
            throw new BizException("趋势粒度不正确");
        }

        boolean all = SecurityUtils.isRoot() || SecurityUtils.getRoles().contains("TENANT_ADMIN");
        List<Long> storeIds = financeMapper.visibleStores(query.getTenantId(), SecurityUtils.getUserId(), all);
        if (query.getStoreId() != null) {
            if (!storeIds.contains(query.getStoreId())) {
                throw new BizException("无权查看该门店财务数据");
            }
            storeIds = List.of(query.getStoreId());
        }
        // 无授权门店时保留必定不匹配的条件，避免空集合被误当作全量查询。
        query.setAllowedStoreIds(storeIds.isEmpty() ? List.of(-1L) : List.copyOf(storeIds));
        query.setStartTime(query.getStartDate().atStartOfDay());
        query.setEndTime(query.getEndDate().plusDays(1).atStartOfDay());
        query.setPageNum(query.getPageNum() == null ? 1 : Math.max(1, query.getPageNum()));
        query.setPageSize(query.getPageSize() == null ? 20 : Math.max(1, Math.min(100, query.getPageSize())));
    }

    private FinanceReportVO buildReport(FinanceQuery query) {
        FinanceReportVO report = new FinanceReportVO();
        report.setTrendPeriod(query.getTrendPeriod());
        report.setSummary(financeMapper.summary(query));
        report.setChannels(financeMapper.channels(query));
        report.setTrend(financeMapper.trend(query));
        report.setStores(financeMapper.stores(query));
        report.setServices(financeMapper.items(query, 1));
        report.setGoods(financeMapper.items(query, 2));
        report.setMembers(financeMapper.members(query));
        return report;
    }

    private String encode(FinanceReportVO report) {
        try {
            return objectMapper.writeValueAsString(report);
        } catch (JsonProcessingException ex) {
            throw new BizException("日结快照生成失败", ex);
        }
    }
}
