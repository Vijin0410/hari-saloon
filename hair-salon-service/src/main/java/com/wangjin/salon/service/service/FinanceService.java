package com.wangjin.salon.service.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.wangjin.salon.service.model.form.DailySettlementForm;
import com.wangjin.salon.service.model.query.FinanceQuery;
import com.wangjin.salon.service.model.vo.DailySettlementVO;
import com.wangjin.salon.service.model.vo.FinanceLedgerVO;
import com.wangjin.salon.service.model.vo.FinanceReportVO;
import com.wangjin.salon.service.model.vo.FinanceStoreOptionVO;

import java.util.List;

/**
 * 财务查询、经营报表与门店日结。
 */
public interface FinanceService {

    List<FinanceStoreOptionVO> storeOptions(Long tenantId);

    FinanceReportVO report(FinanceQuery query);

    Page<FinanceLedgerVO> ledger(FinanceQuery query);

    List<FinanceLedgerVO> exportLedger(FinanceQuery query);

    Page<DailySettlementVO> settlements(FinanceQuery query);

    /**
     * 按门店及已结束的自然日生成不可变日结快照。
     *
     * @return 日结单ID
     */
    Long settle(DailySettlementForm form);

    /**
     * 查询原日结快照，并比较当前业务数据是否发生变化。
     */
    DailySettlementVO detail(Long id);
}
