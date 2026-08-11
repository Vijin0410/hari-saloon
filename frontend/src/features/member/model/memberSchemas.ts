import { z } from 'zod';

const statusSchema = z.union([z.literal(0), z.literal(1)]);

/** 金额/比率（可空）：允许 0.9 / 1.5 / 0.1 等，最多两位小数 */
const rateOptional = z
  .union([z.literal(''), z.string().trim().regex(/^\d{1,9}(\.\d{0,2})?$/, '请输入有效数字')])
  .optional();

/** 整数（必填） */
const intRequired = z
  .string()
  .trim()
  .min(1, '不能为空')
  .regex(/^\d{1,9}$/, '请输入正整数');

/** 整数（可空） */
const intOptional = z
  .union([z.literal(''), z.string().trim().regex(/^\d{1,9}$/, '请输入正整数')])
  .optional();

/**
 * 会员等级表单 schema。数字字段用 string 承载中间态，提交时转 number。
 */
export const memberLevelFormSchema = z.object({
  name: z.string().trim().min(1, '等级名称不能为空'),
  levelNo: intRequired,
  serviceDiscount: rateOptional,
  goodsDiscount: rateOptional,
  pointRate: rateOptional,
  rechargeGiftRate: rateOptional,
  upgradeThreshold: rateOptional,
  rights: z.string().trim().optional(),
  sort: intOptional,
  status: statusSchema,
  remark: z.string().trim().optional(),
});

export type MemberLevelFormValues = z.infer<typeof memberLevelFormSchema>;

/**
 * 会员标签表单 schema。
 */
export const memberTagFormSchema = z.object({
  name: z.string().trim().min(1, '标签名称不能为空'),
  color: z.string().trim().optional(),
  sort: intOptional,
  status: statusSchema,
  remark: z.string().trim().optional(),
});

export type MemberTagFormValues = z.infer<typeof memberTagFormSchema>;

/**
 * 会员表单 schema。手机号可空但格式校验，所属门店必填。
 */
export const memberFormSchema = z.object({
  name: z.string().trim().min(1, '姓名不能为空'),
  phone: z
    .union([z.literal(''), z.string().trim().regex(/^1[3-9]\d{9}$/, '手机号格式不正确')])
    .optional(),
  gender: z.union([z.literal(0), z.literal(1), z.literal(2)]),
  birthday: z.string().trim().optional(),
  levelId: z.string().trim().optional(),
  source: z.string().trim().optional(),
  storeId: z.string().trim().min(1, '请选择所属门店'),
  status: z.union([z.literal(0), z.literal(1)]),
  remark: z.string().trim().optional(),
});

export type MemberFormValues = z.infer<typeof memberFormSchema>;
