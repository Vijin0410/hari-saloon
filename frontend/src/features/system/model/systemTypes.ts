import type { OptionNode, PageParams } from '@/types';

export type EntityId = string;
export type StatusValue = 0 | 1;
export type GenderValue = 0 | 1 | 2;
export type DataScopeValue = 1 | 2 | 3 | 4 | 5;
export type MenuTypeValue = 'MENU' | 'CATALOG' | 'EXTLINK' | 'BUTTON';
export type MenuRawType = MenuTypeValue | 1 | 2 | 3 | 4 | '1' | '2' | '3' | '4';

export interface MetaInfo {
  title?: string;
  icon?: string;
  rank?: number;
  extraIcon?: string;
  showLink?: boolean;
  showParent?: boolean;
  hidden?: boolean;
  roles?: string[];
  auths?: string[];
  frameSrc?: string;
  frameLoading?: boolean;
  keepAlive?: boolean;
  alwaysShow?: boolean;
}

export interface UserPageQuery extends PageParams {
  keywords?: string;
  status?: StatusValue;
  deptId?: EntityId;
}

export interface UserPageVO {
  id: EntityId;
  username: string;
  nickname: string;
  phone?: string;
  gender?: GenderValue;
  avatar?: string;
  status?: StatusValue;
  email?: string;
  deptId?: EntityId;
  deptName?: string;
  roleNames?: string;
  createTime?: string;
}

export interface UserFormPayload {
  id?: EntityId;
  username: string;
  nickname: string;
  phone?: string;
  gender?: GenderValue;
  avatar?: string;
  email?: string;
  status?: StatusValue;
  deptId?: EntityId;
  roleIds: EntityId[];
}

export interface RolePageQuery extends PageParams {
  keywords?: string;
}

export interface RolePageVO {
  id: EntityId;
  name: string;
  code: string;
  sort?: number;
  status?: StatusValue;
  dataScope?: DataScopeValue;
}

export interface RoleFormPayload {
  id?: EntityId;
  name: string;
  code: string;
  sort?: number;
  status?: StatusValue;
  dataScope?: DataScopeValue;
  deptIds?: string;
}

export interface MenuQuery {
  keywords?: string;
}

export interface MenuVO {
  id: EntityId;
  parentId?: EntityId;
  name?: string;
  type?: MenuRawType;
  path?: string;
  component?: string;
  redirect?: string;
  treePath?: string;
  meta?: MetaInfo;
  perm?: string;
  apiPath?: string;
  remark?: string;
  children?: MenuVO[];
}

export interface RouteVO {
  name: string;
  path: string;
  component?: string;
  redirect?: string;
  meta?: MetaInfo;
  children?: RouteVO[];
}

export interface MenuFormPayload {
  id?: EntityId;
  parentId?: EntityId;
  name: string;
  type: MenuTypeValue;
  path?: string;
  component?: string;
  redirect?: string;
  meta?: MetaInfo;
  perm?: string;
  apiPath?: string;
  remark?: string;
}

export interface FlatMenuNode extends MenuVO {
  depth: number;
}

export type RoleOption = OptionNode<EntityId>;
export type MenuOption = OptionNode<EntityId>;

export const ROLE_MENU_TYPE_WEB = 1;

export const STATUS_OPTIONS: Array<{ value: StatusValue; label: string }> = [
  { value: 1, label: '启用' },
  { value: 0, label: '禁用' },
];

export const GENDER_OPTIONS: Array<{ value: GenderValue; label: string }> = [
  { value: 0, label: '未知' },
  { value: 1, label: '男' },
  { value: 2, label: '女' },
];

export const DATA_SCOPE_OPTIONS: Array<{ value: DataScopeValue; label: string }> = [
  { value: 1, label: '全部数据' },
  { value: 2, label: '部门及子部门' },
  { value: 3, label: '本部门' },
  { value: 4, label: '仅本人' },
  { value: 5, label: '自定义部门' },
];

export const MENU_TYPE_OPTIONS: Array<{ value: MenuTypeValue; label: string }> = [
  { value: 'CATALOG', label: '目录' },
  { value: 'MENU', label: '菜单' },
  { value: 'EXTLINK', label: '外链' },
  { value: 'BUTTON', label: '按钮' },
];

export function normalizeMenuType(value: unknown): MenuTypeValue {
  if (value === 'CATALOG' || value === 2 || value === '2') {
    return 'CATALOG';
  }
  if (value === 'EXTLINK' || value === 3 || value === '3') {
    return 'EXTLINK';
  }
  if (value === 'BUTTON' || value === 4 || value === '4') {
    return 'BUTTON';
  }
  return 'MENU';
}

export function getMenuTypeLabel(value: unknown): string {
  const normalized = normalizeMenuType(value);
  return MENU_TYPE_OPTIONS.find((item) => item.value === normalized)?.label ?? normalized;
}

export function getStatusLabel(value: number | null | undefined): string {
  return value === 1 ? '启用' : '禁用';
}

export function getGenderLabel(value: number | null | undefined): string {
  return GENDER_OPTIONS.find((item) => item.value === value)?.label ?? '未知';
}

export function getDataScopeLabel(value: number | null | undefined): string {
  return DATA_SCOPE_OPTIONS.find((item) => item.value === value)?.label ?? '未配置';
}

export function getMenuTitle(menu: MenuVO): string {
  return menu.meta?.title || menu.name || '-';
}

export function flattenMenuTree(menuList: MenuVO[], depth = 0): FlatMenuNode[] {
  return menuList.flatMap((menu) => [
    { ...menu, depth },
    ...flattenMenuTree(menu.children ?? [], depth + 1),
  ]);
}

export function collectMenuIds(menuList: MenuVO[]): EntityId[] {
  return menuList.flatMap((menu) => [menu.id, ...collectMenuIds(menu.children ?? [])]);
}
