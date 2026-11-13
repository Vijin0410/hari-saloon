package com.wangjin.salon.service.mapper;

import com.baomidou.mybatisplus.annotation.InterceptorIgnore;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.wangjin.salon.service.model.query.FinanceQuery;
import com.wangjin.salon.service.model.vo.DailySettlementVO;
import com.wangjin.salon.service.model.vo.FinanceChannelVO;
import com.wangjin.salon.service.model.vo.FinanceGroupVO;
import com.wangjin.salon.service.model.vo.FinanceLedgerVO;
import com.wangjin.salon.service.model.vo.FinanceSummaryVO;
import com.wangjin.salon.service.model.vo.FinanceStoreOptionVO;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

/**
 * 财务聚合查询。
 * <p>
 * 支持 ROOT 跨租户查询，由 Service 重算门店白名单，SQL 关联同时匹配租户ID。
 */
@Mapper
@InterceptorIgnore(tenantLine = "true")
public interface FinanceMapper {

    List<Long> visibleStores(@Param("tenantId") Long tenantId, @Param("userId") Long userId,
                             @Param("all") boolean all);

    List<FinanceStoreOptionVO> visibleStoreOptions(@Param("tenantId") Long tenantId,
                                                  @Param("userId") Long userId, @Param("all") boolean all);

    Long storeTenant(@Param("storeId") Long storeId);

    FinanceSummaryVO summary(@Param("q") FinanceQuery query);

    List<FinanceChannelVO> channels(@Param("q") FinanceQuery query);

    List<FinanceGroupVO> trend(@Param("q") FinanceQuery query);

    List<FinanceGroupVO> stores(@Param("q") FinanceQuery query);

    List<FinanceGroupVO> items(@Param("q") FinanceQuery query, @Param("type") int type);

    List<FinanceGroupVO> members(@Param("q") FinanceQuery query);

    Page<FinanceLedgerVO> ledger(Page<FinanceLedgerVO> page, @Param("q") FinanceQuery query);

    List<FinanceLedgerVO> exportLedger(@Param("q") FinanceQuery query);

    Page<DailySettlementVO> settlements(Page<DailySettlementVO> page, @Param("q") FinanceQuery query);

    DailySettlementVO settlement(@Param("id") Long id);
}
