import { z } from 'zod';

const statusSchema = z.union([z.literal(0), z.literal(1)]);

export const dictTypeFormSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, '字典类型名称不能为空'),
  code: z.string().trim().min(1, '字典编码不能为空'),
  status: statusSchema,
  groupCode: z.string().trim().optional(),
  remark: z.string().trim().optional(),
});

export type DictTypeFormValues = z.infer<typeof dictTypeFormSchema>;

export const dictFormSchema = z.object({
  id: z.string().optional(),
  typeCode: z.string().trim().min(1, '请选择字典类型'),
  name: z.string().trim().min(1, '字典项名称不能为空'),
  value: z.string().trim().min(1, '字典项值不能为空'),
  status: statusSchema,
  sort: z.number().int().min(0, '排序不能小于 0'),
  remark: z.string().trim().optional(),
});

export type DictFormValues = z.infer<typeof dictFormSchema>;
