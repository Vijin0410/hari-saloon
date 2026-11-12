import { z } from 'zod';

export const orderRefundSchema = z.object({
  refundAmount: z.string().regex(/^\d{1,9}(\.\d{1,2})?$/, '退款金额格式不正确（最多两位小数）'),
  reason: z.string().trim().min(1, '退款原因不能为空').max(255, '退款原因最多255字'),
});
export type OrderRefundValues = z.infer<typeof orderRefundSchema>;
