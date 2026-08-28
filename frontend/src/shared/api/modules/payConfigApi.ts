import { get, post, put, deleteRequest } from '@/shared/api/client';
import type { PageData } from '@/types';
import type {
  TenantPayConfigDetailVO,
  TenantPayConfigFormPayload,
  TenantPayConfigOption,
  TenantPayConfigPageQuery,
  TenantPayConfigPageVO,
  TenantPayConfigVerifyVO,
} from '@/features/pay-config/model/payConfigTypes';
import type { EntityId } from '@/features/system/model/systemTypes';

export const payConfigApi = {
  list(params: TenantPayConfigPageQuery): Promise<PageData<TenantPayConfigPageVO>> {
    return get<PageData<TenantPayConfigPageVO>>('/v1/pay-configs/page', { params });
  },
  detail(id: EntityId): Promise<TenantPayConfigDetailVO> {
    return get<TenantPayConfigDetailVO>(`/v1/pay-configs/${id}/detail`);
  },
  create(payload: TenantPayConfigFormPayload): Promise<EntityId> {
    return post<EntityId, TenantPayConfigFormPayload>('/v1/pay-configs/add', payload);
  },
  update(id: EntityId, payload: TenantPayConfigFormPayload): Promise<void> {
    return put<void, TenantPayConfigFormPayload>(`/v1/pay-configs/${id}/update`, payload);
  },
  remove(ids: EntityId[]): Promise<void> {
    return deleteRequest<void>('/v1/pay-configs/delete', { params: { ids: ids.join(',') } });
  },
  /** 验参自检（保存后自动触发；微信直连调 V3 只读接口） */
  verify(id: EntityId): Promise<TenantPayConfigVerifyVO> {
    return post<TenantPayConfigVerifyVO>(`/v1/pay-configs/${id}/verify`);
  },
  options(): Promise<TenantPayConfigOption[]> {
    return get<TenantPayConfigOption[]>('/v1/pay-configs/options');
  },
};
