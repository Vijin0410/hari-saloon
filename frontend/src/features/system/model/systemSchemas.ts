import { z } from 'zod';

const statusSchema = z.union([z.literal(0), z.literal(1)]);
const genderSchema = z.union([z.literal(0), z.literal(1), z.literal(2)]);
const dataScopeSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
]);
const menuTypeValues = ['CATALOG', 'MENU', 'EXTLINK', 'BUTTON'] as const;

export const userFormSchema = z.object({
  id: z.string().optional(),
  username: z.string().trim().min(1, '用户名不能为空'),
  nickname: z.string().trim().min(1, '昵称不能为空'),
  phone: z.string().trim().optional(),
  gender: genderSchema,
  avatar: z.string().trim().optional(),
  email: z.union([z.literal(''), z.string().email('邮箱格式不正确')]).optional(),
  status: statusSchema,
  deptId: z.string().trim().optional(),
  roleIds: z.array(z.string()).min(1, '请至少选择一个角色'),
  storeIds: z.array(z.string()).optional(),
});

export type UserFormValues = z.infer<typeof userFormSchema>;

export const deptFormSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, '部门名称不能为空'),
  parentId: z.string().trim().min(1, '请选择上级部门'),
  status: statusSchema,
  sort: z.number().int().min(0, '排序不能小于 0'),
  leaderId: z.string().trim().optional(),
});

export type DeptFormValues = z.infer<typeof deptFormSchema>;

export const roleFormSchema = z
  .object({
    id: z.string().optional(),
    name: z.string().trim().min(1, '角色名称不能为空'),
    code: z.string().trim().min(1, '角色编码不能为空'),
    sort: z.number().int().min(0, '排序不能小于 0'),
    status: statusSchema,
    dataScope: dataScopeSchema,
    deptIds: z.string().trim().optional(),
  })
  .refine((value) => value.dataScope !== 5 || Boolean(value.deptIds?.trim()), {
    path: ['deptIds'],
    message: '自定义数据范围需要填写部门 ID',
  });

export type RoleFormValues = z.infer<typeof roleFormSchema>;

export const menuFormSchema = z.object({
  id: z.string().optional(),
  parentId: z.string().optional(),
  name: z.string().trim().min(1, '菜单名称不能为空'),
  type: z.enum(menuTypeValues),
  path: z.string().trim().optional(),
  component: z.string().trim().optional(),
  redirect: z.string().trim().optional(),
  perm: z.string().trim().optional(),
  apiPath: z.string().trim().optional(),
  remark: z.string().trim().optional(),
  metaTitle: z.string().trim().min(1, '显示标题不能为空'),
  metaIcon: z.string().trim().optional(),
  metaRank: z.number().int().min(0, '排序不能小于 0'),
  metaShowLink: z.boolean(),
  metaShowParent: z.boolean(),
  metaHidden: z.boolean(),
  metaKeepAlive: z.boolean(),
  metaAlwaysShow: z.boolean(),
  metaFrameSrc: z.string().trim().optional(),
  metaFrameLoading: z.boolean(),
});

export type MenuFormValues = z.infer<typeof menuFormSchema>;

export const storeFormSchema = z.object({
  name: z.string().trim().min(1, '门店名称不能为空'),
  code: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  address: z.string().trim().optional(),
  businessHours: z.string().trim().optional(),
  openTime: z.string().trim().optional(),
  closeTime: z.string().trim().optional(),
  restDays: z.string().trim().optional(),
  status: statusSchema,
  remark: z.string().trim().optional(),
  userIds: z.array(z.string()).optional(),
});

export type StoreFormValues = z.infer<typeof storeFormSchema>;

export const tenantFormSchema = z.object({
  name: z.string().trim().min(1, '租户名称不能为空'),
  code: z.string().trim().min(1, '租户编码不能为空'),
  status: statusSchema,
  adminUsername: z.string().trim().min(1, '管理员用户名不能为空'),
  adminPassword: z.string().trim().optional(),
  contact: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  store: z.object({
    name: z.string(),
    code: z.string(),
    phone: z.string(),
    address: z.string(),
  }),
  syncModules: z.array(z.string()).optional(),
});

export type TenantFormValues = z.infer<typeof tenantFormSchema>;
