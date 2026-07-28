import { z } from 'zod';

export const loginSchema = z.object({
  username: z.string().trim().min(1, '请输入用户名'),
  password: z.string().trim().min(1, '请输入密码'),
});

export type LoginSchemaValues = z.infer<typeof loginSchema>;
