import { deleteRequest, get, patch, post, put } from '@/shared/api/client';
import type { PageData } from '@/types';
import type {
  EntityId,
  DeptFormPayload,
  DeptOption,
  DeptQuery,
  DeptVO,
  MenuFormPayload,
  MenuOption,
  MenuQuery,
  MenuVO,
  RoleFormPayload,
  RoleOption,
  RolePageQuery,
  RolePageVO,
  RouteVO,
  StoreOption,
  UserFormPayload,
  UserPageQuery,
  UserPageVO,
} from '@/features/system/model/systemTypes';
import type {
  DictFormPayload,
  DictOption,
  DictPageQuery,
  DictPageVO,
  DictTypeFormPayload,
  DictTypePageQuery,
  DictTypePageVO,
  TenantLoginOption,
} from '@/features/system/model/dictTypes';

export const userApi = {
  list(params: UserPageQuery): Promise<PageData<UserPageVO>> {
    return get<PageData<UserPageVO>>('/v1/users/page', { params });
  },

  getForm(userId: EntityId): Promise<UserFormPayload> {
    return get<UserFormPayload>(`/v1/users/form/${userId}`);
  },

  create(payload: UserFormPayload): Promise<void> {
    return post<void, UserFormPayload>('/v1/users', payload);
  },

  update(userId: EntityId, payload: UserFormPayload): Promise<void> {
    return put<void, UserFormPayload>(`/v1/users/update/${userId}`, payload);
  },

  remove(ids: EntityId[]): Promise<void> {
    return deleteRequest<void>('/v1/users/delete', { params: { ids: ids.join(',') } });
  },

  updateStatus(userId: EntityId, status: number): Promise<void> {
    return patch<void>(`/v1/users/status/${userId}`, undefined, { params: { status } });
  },

  resetPassword(userId: EntityId, password: string): Promise<void> {
    return patch<void>(`/v1/users/password/${userId}`, undefined, { params: { password } });
  },
};

export const roleApi = {
  list(params: RolePageQuery): Promise<PageData<RolePageVO>> {
    return get<PageData<RolePageVO>>('/v1/roles/page', { params });
  },

  options(): Promise<RoleOption[]> {
    return get<RoleOption[]>('/v1/roles/options');
  },

  getForm(roleId: EntityId): Promise<RoleFormPayload> {
    return get<RoleFormPayload>(`/v1/roles/form/${roleId}`);
  },

  create(payload: RoleFormPayload): Promise<void> {
    return post<void, RoleFormPayload>('/v1/roles', payload);
  },

  update(roleId: EntityId, payload: RoleFormPayload): Promise<void> {
    return put<void, RoleFormPayload>(`/v1/roles/update/${roleId}`, payload);
  },

  remove(ids: EntityId[]): Promise<void> {
    return deleteRequest<void>('/v1/roles/delete', { params: { ids: ids.join(',') } });
  },

  updateStatus(roleId: EntityId, status: number): Promise<void> {
    return put<void>(`/v1/roles/status/${roleId}`, undefined, { params: { status } });
  },

  menuIds(roleId: EntityId, type: number): Promise<EntityId[]> {
    return get<EntityId[]>(`/v1/roles/menuIds/${roleId}/${type}`);
  },

  updateMenus(roleId: EntityId, type: number, menuIds: EntityId[]): Promise<void> {
    return put<void, EntityId[]>(`/v1/roles/menus/${roleId}/${type}`, menuIds);
  },
};

export const menuApi = {
  list(params?: MenuQuery): Promise<MenuVO[]> {
    return get<MenuVO[]>('/v1/menus', { params });
  },

  options(menuType?: string): Promise<MenuOption[]> {
    return get<MenuOption[]>('/v1/menus/options', { params: menuType ? { menuType } : undefined });
  },

  routes(): Promise<RouteVO[]> {
    return get<RouteVO[]>('/v1/menus/routes');
  },

  getForm(menuId: EntityId): Promise<MenuFormPayload> {
    return get<MenuFormPayload>(`/v1/menus/form/${menuId}`);
  },

  create(payload: MenuFormPayload): Promise<void> {
    return post<void, MenuFormPayload>('/v1/menus', payload);
  },

  update(menuId: EntityId, payload: MenuFormPayload): Promise<void> {
    return put<void, MenuFormPayload>(`/v1/menus/update/${menuId}`, payload);
  },

  remove(ids: EntityId[]): Promise<void> {
    return deleteRequest<void>('/v1/menus/delete', { params: { ids: ids.join(',') } });
  },
};

export const deptApi = {
  list(params?: DeptQuery): Promise<DeptVO[]> {
    return get<DeptVO[]>('/v1/dept', { params });
  },
  options(): Promise<DeptOption[]> {
    return get<DeptOption[]>('/v1/dept/options');
  },
  getForm(deptId: EntityId): Promise<DeptFormPayload> {
    return get<DeptFormPayload>(`/v1/dept/form/${deptId}`);
  },
  create(payload: DeptFormPayload): Promise<EntityId> {
    return post<EntityId, DeptFormPayload>('/v1/dept', payload);
  },
  update(deptId: EntityId, payload: DeptFormPayload): Promise<void> {
    return put<void, DeptFormPayload>(`/v1/dept/update/${deptId}`, payload);
  },
  remove(ids: EntityId[]): Promise<void> {
    return deleteRequest<void>('/v1/dept/delete', { params: { ids: ids.join(',') } });
  },
};

export interface TenantPageQuery {
  pageNum: number;
  pageSize: number;
  keywords?: string;
  status?: number;
}

export interface TenantPageVO {
  id: EntityId;
  name: string;
  code: string;
  status?: number;
  contact?: string;
  phone?: string;
  expireTime?: string;
  remark?: string;
  createTime?: string;
}

export interface InitialStoreInfoPayload {
  name?: string;
  code?: string;
  phone?: string;
  address?: string;
}

export interface TenantFormPayload {
  id?: EntityId;
  name: string;
  code: string;
  status?: number;
  contact?: string;
  phone?: string;
  expireTime?: string;
  remark?: string;
  adminUsername?: string;
  adminNickname?: string;
  adminPassword?: string;
  /** 开通时联合创建的初始门店（可选；name 空则不建门店，仅新增） */
  store?: InitialStoreInfoPayload;
}

export const tenantApi = {
  list(params: TenantPageQuery): Promise<PageData<TenantPageVO>> {
    return get<PageData<TenantPageVO>>('/v1/tenants/page', { params });
  },
  getForm(id: EntityId): Promise<TenantFormPayload> {
    return get<TenantFormPayload>(`/v1/tenants/form/${id}`);
  },
  create(payload: TenantFormPayload): Promise<void> {
    return post<void, TenantFormPayload>('/v1/tenants', payload);
  },
  update(id: EntityId, payload: TenantFormPayload): Promise<void> {
    return put<void, TenantFormPayload>(`/v1/tenants/update/${id}`, payload);
  },
  remove(ids: EntityId[]): Promise<void> {
    return deleteRequest<void>('/v1/tenants/delete', { params: { ids: ids.join(',') } });
  },
  updateStatus(id: EntityId, status: number): Promise<void> {
    return patch<void>(`/v1/tenants/status/${id}`, undefined, { params: { status } });
  },

  /** 登录页公开租户下拉（无需鉴权）：value=租户编码 code，label=租户名称 */
  optionsPublic(): Promise<TenantLoginOption[]> {
    return get<TenantLoginOption[]>('/v1/tenants/options-public');
  },
};

export interface StorePageQuery {
  pageNum: number;
  pageSize: number;
  keywords?: string;
  status?: number;
}

export interface StorePageVO {
  id: EntityId;
  name: string;
  code?: string;
  phone?: string;
  address?: string;
  businessHours?: string;
  openTime?: string;
  closeTime?: string;
  restDays?: string;
  status?: number;
  sort?: number;
  remark?: string;
  createTime?: string;
}

export interface StoreFormPayload {
  id?: EntityId;
  name: string;
  code?: string;
  phone?: string;
  address?: string;
  province?: string;
  city?: string;
  district?: string;
  businessHours?: string;
  openTime?: string;
  closeTime?: string;
  restDays?: string;
  status?: number;
  sort?: number;
  remark?: string;
  userIds?: EntityId[];
}

export const storeApi = {
  list(params: StorePageQuery): Promise<PageData<StorePageVO>> {
    return get<PageData<StorePageVO>>('/v1/stores/page', { params });
  },
  detail(id: EntityId): Promise<StoreFormPayload> {
    return get<StoreFormPayload>(`/v1/stores/detail/${id}`);
  },
  options(): Promise<StoreOption[]> {
    return get<StoreOption[]>('/v1/stores/options');
  },
  create(payload: StoreFormPayload): Promise<EntityId> {
    return post<EntityId, StoreFormPayload>('/v1/stores', payload);
  },
  update(id: EntityId, payload: StoreFormPayload): Promise<void> {
    return put<void, StoreFormPayload>(`/v1/stores/update/${id}`, payload);
  },
  remove(ids: EntityId[]): Promise<void> {
    return deleteRequest<void>('/v1/stores/delete', { params: { ids: ids.join(',') } });
  },
};

export interface MemberPageQuery {
  pageNum: number;
  pageSize: number;
  keywords?: string;
  status?: number;
}

export interface MemberPageVO {
  id: EntityId;
  name: string;
  phone?: string;
  gender?: number;
  level?: number;
  balance?: number;
  points?: number;
  status?: number;
  storeId?: EntityId;
  storeName?: string;
  createTime?: string;
}

export interface MemberFormPayload {
  id?: EntityId;
  name: string;
  phone?: string;
  gender?: number;
  birthday?: string;
  level?: number;
  balance?: number;
  points?: number;
  source?: string;
  status?: number;
  remark?: string;
  storeId: EntityId;
}

export const memberApi = {
  list(params: MemberPageQuery): Promise<PageData<MemberPageVO>> {
    return get<PageData<MemberPageVO>>('/v1/members/page', { params });
  },
  detail(id: EntityId): Promise<MemberFormPayload> {
    return get<MemberFormPayload>(`/v1/members/detail/${id}`);
  },
  create(payload: MemberFormPayload): Promise<EntityId> {
    return post<EntityId, MemberFormPayload>('/v1/members', payload);
  },
  update(id: EntityId, payload: MemberFormPayload): Promise<void> {
    return put<void, MemberFormPayload>(`/v1/members/update/${id}`, payload);
  },
  remove(ids: EntityId[]): Promise<void> {
    return deleteRequest<void>('/v1/members/delete', { params: { ids: ids.join(',') } });
  },
};

export interface FileVO {
  id: EntityId;
  objectKey: string;
  originalName?: string;
  contentType?: string;
  extension?: string;
  size?: number;
  biz?: string;
  bizId?: EntityId;
  isPublic?: number;
  /** 访问 URL：私有桶统一预签名，上传后即时可用 */
  url?: string;
}

export const fileApi = {
  /** 上传文件；biz 为业务目录（头像用 avatar）。objectKey 存业务表，url 为预签名展示链接。 */
  upload(file: File, biz = 'common'): Promise<FileVO> {
    const form = new FormData();
    form.append('file', file);
    form.append('biz', biz);
    return post<FileVO, FormData>('/v1/files/upload', form);
  },
  /** 按 objectKey 取可访问 URL（私有桶统一预签名，后端按归属校验）。 */
  urlByKey(objectKey: string): Promise<string> {
    return get<string>('/v1/files/url', { params: { objectKey } });
  },
};

export const dictTypeApi = {
  list(params: DictTypePageQuery): Promise<PageData<DictTypePageVO>> {
    return get<PageData<DictTypePageVO>>('/v1/dict/types/page', { params });
  },

  getForm(id: EntityId): Promise<DictTypeFormPayload> {
    return get<DictTypeFormPayload>(`/v1/dict/types/form/${id}`);
  },

  create(payload: DictTypeFormPayload): Promise<void> {
    return post<void, DictTypeFormPayload>('/v1/dict/types', payload);
  },

  update(id: EntityId, payload: DictTypeFormPayload): Promise<void> {
    return put<void, DictTypeFormPayload>(`/v1/dict/types/update/${id}`, payload);
  },

  remove(ids: EntityId[]): Promise<void> {
    return deleteRequest<void>('/v1/dict/types/delete', { params: { ids: ids.join(',') } });
  },
};

export const dictApi = {
  list(params: DictPageQuery): Promise<PageData<DictPageVO>> {
    return get<PageData<DictPageVO>>('/v1/dict/page', { params });
  },

  getForm(id: EntityId): Promise<DictFormPayload> {
    return get<DictFormPayload>(`/v1/dict/form/${id}`);
  },

  create(payload: DictFormPayload): Promise<void> {
    return post<void, DictFormPayload>('/v1/dict', payload);
  },

  update(id: EntityId, payload: DictFormPayload): Promise<void> {
    return put<void, DictFormPayload>(`/v1/dict/update/${id}`, payload);
  },

  remove(ids: EntityId[]): Promise<void> {
    return deleteRequest<void>('/v1/dict/delete', { params: { ids: ids.join(',') } });
  },

  /** 按 typeCode 取字典项下拉（value=字典值，label=字典名称） */
  options(typeCode: string): Promise<DictOption[]> {
    return get<DictOption[]>('/v1/dict/options', { params: { typeCode } });
  },
};
