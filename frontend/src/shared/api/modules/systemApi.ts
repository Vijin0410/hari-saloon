import { deleteRequest, get, patch, post, put } from '@/shared/api/client';
import type { PageData } from '@/types';
import type {
  EntityId,
  MenuFormPayload,
  MenuOption,
  MenuQuery,
  MenuVO,
  RoleFormPayload,
  RoleOption,
  RolePageQuery,
  RolePageVO,
  RouteVO,
  UserFormPayload,
  UserPageQuery,
  UserPageVO,
} from '@/features/system/model/systemTypes';

export const userApi = {
  list(params: UserPageQuery): Promise<PageData<UserPageVO>> {
    return get<PageData<UserPageVO>>('/v1/users/page', { params });
  },

  getForm(userId: EntityId): Promise<UserFormPayload> {
    return get<UserFormPayload>(`/v1/users/${userId}/form`);
  },

  create(payload: UserFormPayload): Promise<void> {
    return post<void, UserFormPayload>('/v1/users', payload);
  },

  update(userId: EntityId, payload: UserFormPayload): Promise<void> {
    return put<void, UserFormPayload>(`/v1/users/${userId}`, payload);
  },

  remove(ids: EntityId[]): Promise<void> {
    return deleteRequest<void>('/v1/users', { params: { ids: ids.join(',') } });
  },

  updateStatus(userId: EntityId, status: number): Promise<void> {
    return patch<void>(`/v1/users/${userId}/status`, undefined, { params: { status } });
  },

  resetPassword(userId: EntityId, password: string): Promise<void> {
    return patch<void>(`/v1/users/${userId}/password`, undefined, { params: { password } });
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
    return get<RoleFormPayload>(`/v1/roles/${roleId}/form`);
  },

  create(payload: RoleFormPayload): Promise<void> {
    return post<void, RoleFormPayload>('/v1/roles', payload);
  },

  update(roleId: EntityId, payload: RoleFormPayload): Promise<void> {
    return put<void, RoleFormPayload>(`/v1/roles/${roleId}`, payload);
  },

  remove(ids: EntityId[]): Promise<void> {
    return deleteRequest<void>('/v1/roles', { params: { ids: ids.join(',') } });
  },

  updateStatus(roleId: EntityId, status: number): Promise<void> {
    return put<void>(`/v1/roles/${roleId}/status`, undefined, { params: { status } });
  },

  menuIds(roleId: EntityId, type: number): Promise<EntityId[]> {
    return get<EntityId[]>(`/v1/roles/${roleId}/${type}/menuIds`);
  },

  updateMenus(roleId: EntityId, type: number, menuIds: EntityId[]): Promise<void> {
    return put<void, EntityId[]>(`/v1/roles/${roleId}/${type}/menus`, menuIds);
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
    return get<MenuFormPayload>(`/v1/menus/${menuId}/form`);
  },

  create(payload: MenuFormPayload): Promise<void> {
    return post<void, MenuFormPayload>('/v1/menus', payload);
  },

  update(menuId: EntityId, payload: MenuFormPayload): Promise<void> {
    return put<void, MenuFormPayload>(`/v1/menus/${menuId}`, payload);
  },

  remove(ids: EntityId[]): Promise<void> {
    return deleteRequest<void>('/v1/menus', { params: { ids: ids.join(',') } });
  },
};
