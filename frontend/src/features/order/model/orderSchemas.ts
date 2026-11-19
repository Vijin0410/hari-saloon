import { z } from 'zod';
import { maxRedeemPoints, MIN_REDEEM_POINTS, pointsDeduction, toCents } from './orderSettlement';
import type { SettlementContext } from './orderSettlement';

const optionalMoney = z
  .string()
  .refine((v) => v === '' || /^\d{1,9}(\.\d{1,2})?$/.test(v), '金额格式不正确（最多两位小数）');

export function createOrderPaySchema(context: SettlementContext) {
  return z
    .object({
      usePoints: z
        .string()
        .refine((v) => v === '' || /^\d{1,9}$/.test(v), '积分抵扣数须为非负整数'),
      cashReceived: optionalMoney,
      payments: z
        .array(
          z.object({
            payMethod: z.number().refine((v) => [1, 2, 3, 4, 5, 8].includes(v), '不支持的支付方式'),
            amount: optionalMoney,
          }),
        )
        .max(4, '最多使用四种支付方式'),
    })
    .superRefine((values, ctx) => {
      const points = Number(values.usePoints) || 0;
      const issue = (path: (string | number)[], message: string) =>
        ctx.addIssue({ code: 'custom', path, message });
      if (points > 0) {
        if (!context.pointsEnabled)
          issue(['usePoints'], '当前店铺已关闭会员积分，不能使用积分抵扣');
        else if (!context.member) issue(['usePoints'], '散客订单不能使用积分抵扣');
        else if ((context.member.pointDebt ?? 0) > 0)
          issue(['usePoints'], '会员有待追回积分，暂不能使用积分抵扣');
        else if (points < MIN_REDEEM_POINTS) issue(['usePoints'], '积分抵扣至少使用100积分');
        else if (points > (context.member.points ?? 0)) issue(['usePoints'], '积分不足');
        else if (points > maxRedeemPoints(context))
          issue(['usePoints'], '积分抵扣金额不能超过应收金额');
      }
      const due = toCents(context.payable) - toCents(pointsDeduction(context, points));
      let total = 0;
      let balance = 0;
      let cash = 0;
      const methods = new Set<number>();
      values.payments.forEach((row, index) => {
        const amount = toCents(Number(row.amount) || 0);
        total += amount;
        if (amount <= 0) issue(['payments', index, 'amount'], '支付金额必须大于0');
        if (methods.has(row.payMethod))
          issue(['payments', index, 'payMethod'], '每种支付方式只能添加一次');
        methods.add(row.payMethod);
        if (row.payMethod === 5) {
          balance += amount;
          if (!context.member)
            issue(['payments', index, 'payMethod'], '散客订单不能使用会员余额支付');
        }
        if (row.payMethod === 1) cash += amount;
      });
      if (balance > toCents(context.member?.balance ?? 0)) issue(['payments'], '会员余额不足');
      if (total !== due) issue(['payments'], '支付合计与应收金额不一致');
      if (values.payments.filter((row) => row.payMethod === 2 || row.payMethod === 3).length > 1) {
        issue(['payments'], '扫码支付仅支持一行微信或支付宝（一次只出一种码）');
      }
      if (cash > toCents(Number(values.cashReceived) || 0)) issue(['cashReceived'], '现金投入不足');
    });
}

export type OrderPayValues = z.infer<ReturnType<typeof createOrderPaySchema>>;

export const orderStaffAssignmentSchema = z.object({
  staffId: z.string().min(1, '服务人员不能为空'),
  assistantId: z.string(),
}).refine((row) => !row.assistantId || row.assistantId !== row.staffId, {
  path: ['assistantId'], message: '服务人员和助理不能为同一人',
});

export const orderStaffBatchSchema = orderStaffAssignmentSchema;
export type OrderStaffBatchValues = z.infer<typeof orderStaffBatchSchema>;

export const orderStaffCorrectionSchema = z.object({
  reason: z.string().trim().min(1, '更正原因不能为空').max(255, '更正原因最多255字'),
  items: z.array(orderStaffAssignmentSchema.safeExtend({
    orderItemId: z.string().min(1),
    expectedStaffId: z.string(),
    expectedAssistantId: z.string(),
  })).min(1, '订单明细不能为空').max(500, '订单明细须为1至500项'),
});
export type OrderStaffCorrectionValues = z.infer<typeof orderStaffCorrectionSchema>;

export const orderRefundSchema = z.object({
  refundAmount: z.string().regex(/^\d{1,9}(\.\d{1,2})?$/, '退款金额格式不正确（最多两位小数）'),
  reason: z.string().trim().min(1, '退款原因不能为空').max(255, '退款原因最多255字'),
});
export type OrderRefundValues = z.infer<typeof orderRefundSchema>;
