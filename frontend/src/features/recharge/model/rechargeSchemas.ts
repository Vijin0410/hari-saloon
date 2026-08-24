import { z } from 'zod';

/** 金额：最多两位小数 */
const AMOUNT_RE = /^\d{1,9}(\.\d{1,2})?$/;
const INT_RE = /^\d{1,9}$/;

export const rechargeActivityFormSchema = z.object({
  name: z.string().trim().min(1, '活动名称不能为空').max(64, '活动名称长度不能超过64'),
  thresholdAmount: z.string().trim().min(1, '充值门槛不能为空').regex(AMOUNT_RE, '充值门槛格式不正确（最多两位小数）'),
  giftAmount: z.string().trim().min(1, '赠送金额不能为空').regex(AMOUNT_RE, '赠送金额格式不正确（最多两位小数）'),
  startTime: z.string(),
  endTime: z.string(),
  sort: z.string().trim().refine((v) => !v || INT_RE.test(v), '排序须为整数'),
  status: z.union([z.literal(0), z.literal(1)]),
  remark: z.string().trim().max(255, '备注长度不能超过255'),
});

export type RechargeActivityFormValues = z.infer<typeof rechargeActivityFormSchema>;
