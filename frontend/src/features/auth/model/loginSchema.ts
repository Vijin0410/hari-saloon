import { z } from 'zod';

export const loginSchema = z.object({
  tenantCode: z.string().trim().optional(),
  username: z.string().trim().min(1, '请输入用户名'),
  password: z.string().trim().min(1, '请输入密码'),
});

export type LoginSchemaValues = z.infer<typeof loginSchema>;

export const changePasswordSchema = z.object({
  oldPassword: z.string().min(1, '请输入原密码'),
  newPassword: z.string().min(6, '新密码至少 6 位'),
});

export type ChangePasswordSchemaValues = z.infer<typeof changePasswordSchema>;
