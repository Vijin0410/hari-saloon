import type { MemberPageVO } from '@/features/member/model/memberTypes';
import { POINTS_PER_YUAN } from './orderTypes';

/** 至少使用 100 积分才可发起抵扣。 */
export const MIN_REDEEM_POINTS = 100;

export interface PaymentRow {
  payMethod: number;
  amount: string;
}

export interface SettlementContext {
  payable: number;
  member: Pick<MemberPageVO, 'points' | 'balance' | 'pointDebt'> | null;
  pointsEnabled: boolean;
}

/** 金额统一转为分计算，避免积分与组合支付出现浮点尾差。 */
export function toCents(amount: number): number {
  return Math.round(amount * 100);
}

export function maxRedeemPoints({ payable, member, pointsEnabled }: SettlementContext): number {
  if (!pointsEnabled || !member || (member.pointDebt ?? 0) > 0) return 0;
  const limit = Math.min(
    member.points ?? 0,
    Math.floor((toCents(payable) * POINTS_PER_YUAN) / 100),
  );
  return limit >= MIN_REDEEM_POINTS ? limit : 0;
}

export function pointsDeduction(context: SettlementContext, points: number): number {
  if (!Number.isInteger(points) || points < MIN_REDEEM_POINTS || points > maxRedeemPoints(context))
    return 0;
  return Math.floor((points * 100) / POINTS_PER_YUAN) / 100;
}

/** 优先用会员余额，余额不足时仅为差额补一个外部支付行；积分全额抵扣无需支付行。 */
export function allocatePayments(
  receivable: number,
  balance: number,
  preferredMethod = 1,
): PaymentRow[] {
  const due = Math.max(0, toCents(receivable));
  const balancePay = Math.min(due, Math.max(0, toCents(balance)));
  const rows: PaymentRow[] = [];
  if (balancePay > 0) rows.push({ payMethod: 5, amount: (balancePay / 100).toFixed(2) });
  if (due > balancePay)
    rows.push({
      payMethod: preferredMethod === 5 ? 1 : preferredMethod,
      amount: ((due - balancePay) / 100).toFixed(2),
    });
  return rows;
}
