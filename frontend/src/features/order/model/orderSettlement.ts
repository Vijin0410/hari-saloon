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

/** 初次结算默认预填会员余额，收银员可自由切换支付方式；积分全额抵扣无需支付行。 */
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

/** 积分变化时沿用已选方式，保留前面的分摊金额，由最后一行补齐差额。 */
export function reallocatePayments(
  receivable: number,
  balance: number,
  preferences: PaymentRow[],
): PaymentRow[] {
  if (preferences.length === 0) return allocatePayments(receivable, balance);
  let remaining = Math.max(0, toCents(receivable));
  let availableBalance = Math.max(0, toCents(balance));
  const rows = preferences.map((row, index) => {
    const limit = row.payMethod === 5 ? Math.min(remaining, availableBalance) : remaining;
    const amount =
      index === preferences.length - 1
        ? limit
        : Math.min(limit, Math.max(0, toCents(Number(row.amount) || 0)));
    remaining -= amount;
    if (row.payMethod === 5) availableBalance -= amount;
    return { payMethod: row.payMethod, amount: (amount / 100).toFixed(2) };
  });
  if (remaining > 0) {
    const external = rows.find((row) => row.payMethod !== 5);
    if (external)
      external.amount = ((toCents(Number(external.amount)) + remaining) / 100).toFixed(2);
    else rows.push({ payMethod: 1, amount: (remaining / 100).toFixed(2) });
  }
  return rows.filter((row) => Number(row.amount) > 0);
}
