import type { EntityId } from '@/features/system/model/systemTypes';
export interface FinanceQuery {
  tenantId?: EntityId;
  storeId?: EntityId;
  startDate: string;
  endDate: string;
  kind?: string;
  trendPeriod?: 'DAY' | 'MONTH';
  pageNum?: number;
  pageSize?: number;
}
export interface FinanceSummary {
  orderCount: number;
  rechargeCount: number;
  refundCount: number;
  memberCount: number;
  newMemberCount: number;
  consumptionAmount: number;
  refundAmount: number;
  netConsumption: number;
  rechargeAmount: number;
  rechargeGift: number;
  externalInflow: number;
  externalRefund: number;
  netCashflow: number;
  pointAmount: number;
  principalOpening: number;
  principalChange: number;
  principalClosing: number;
}
export interface FinanceChannel {
  payMethod: number;
  payMethod_text?: string;
  orderAmount: number;
  rechargeAmount: number;
  refundAmount: number;
  netAmount: number;
}
export interface FinanceGroup {
  label: string;
  entityId?: EntityId;
  tenantId?: EntityId;
  count: number;
  amount: number;
  refundAmount: number;
  rechargeAmount: number;
}
export interface FinanceReport {
  trendPeriod?: 'DAY' | 'MONTH';
  summary: FinanceSummary;
  channels: FinanceChannel[];
  trend: FinanceGroup[];
  stores: FinanceGroup[];
  services: FinanceGroup[];
  goods: FinanceGroup[];
  members: FinanceGroup[];
}
export interface FinanceLedger {
  id: EntityId;
  tenantId: EntityId;
  storeId: EntityId;
  storeName: string;
  kind: string;
  bizNo: string;
  relatedNo?: string;
  memberName?: string;
  eventTime: string;
  amount: number;
  giftAmount: number;
  externalAmount: number;
  pointAmount: number;
  operatorId?: EntityId;
}
export interface DailySettlement {
  id: EntityId;
  tenantId: EntityId;
  storeId: EntityId;
  storeName: string;
  businessDate: string;
  createBy: EntityId;
  operatorName?: string;
  createTime: string;
  remark?: string;
  snapshot?: FinanceReport;
  changed?: boolean;
}
