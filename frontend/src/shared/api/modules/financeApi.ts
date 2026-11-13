import { get, post } from '@/shared/api/client';
import type { PageData } from '@/types';
import type {
  FinanceQuery,
  FinanceReport,
  FinanceLedger,
  DailySettlement,
} from '@/features/finance/model/financeTypes';
import type { SettlementValues } from '@/features/finance/model/financeSchemas';
import type { StoreOption } from '@/features/system/model/systemTypes';
export const financeApi = {
  storeOptions: (tenantId?: string) =>
    get<StoreOption[]>('/v1/finance/stores/options', { params: { tenantId } }),
  report: (params: FinanceQuery) => get<FinanceReport>('/v1/finance/report', { params }),
  ledger: (params: FinanceQuery) =>
    get<PageData<FinanceLedger>>('/v1/finance/ledger/page', { params }),
  exportLedger: (params: FinanceQuery) =>
    get<FinanceLedger[]>('/v1/finance/ledger/export', { params }),
  settlements: (params: FinanceQuery) =>
    get<PageData<DailySettlement>>('/v1/finance/settlements/page', { params }),
  settle: (payload: SettlementValues) => post<string>('/v1/finance/settlements/add', payload),
  detail: (id: string) => get<DailySettlement>('/v1/finance/settlements/' + id + '/detail'),
};
