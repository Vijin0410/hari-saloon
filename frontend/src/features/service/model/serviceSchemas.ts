import { z } from 'zod';

const statusSchema = z.union([z.literal(0), z.literal(1)]);

/** 金额（必填）：正数，最多两位小数，整数最多 9 位 */
const priceRequired = z
  .string()
  .trim()
  .min(1, '标准价格不能为空')
  .regex(/^\d{1,9}(\.\d{1,2})?$/, '金额格式不正确（最多两位小数）');

/** 金额（可空）：空串放行，有值则校验格式 */
const priceOptional = z
  .union([
    z.literal(''),
    z.string().trim().regex(/^\d{1,9}(\.\d{1,2})?$/, '金额格式不正确'),
  ])
  .optional();

/** 整数（可空）：空串放行，有值则正整数最多 9 位 */
const intOptional = z
  .union([z.literal(''), z.string().trim().regex(/^\d{1,9}$/, '请输入正整数')])
  .optional();

/**
 * 服务项目表单 schema。
 * 数字字段用 string 承载输入中间态（如 "100."），提交时由调用方转 number。
 * 与后端 jakarta validation 双层保险，正则保持一致（见 CLAUDE.md 第 11 条 / 2.2）。
 */
export const serviceItemFormSchema = z.object({
  name: z.string().trim().min(1, '项目名称不能为空'),
  categoryId: z.string().trim().optional(),
  standardPrice: priceRequired,
  memberPrice: priceOptional,
  duration: intOptional,
  discountable: statusSchema,
  commissionable: statusSchema,
  sort: intOptional,
  status: statusSchema,
  remark: z.string().trim().optional(),
});

export type ServiceItemFormValues = z.infer<typeof serviceItemFormSchema>;
