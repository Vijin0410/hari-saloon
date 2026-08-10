import { deleteRequest, get, post, put } from '@/shared/api/client';
import type { PageData } from '@/types';
import type {
  ServiceCategoryFormPayload,
  ServiceCategoryOption,
  ServiceCategoryPageQuery,
  ServiceCategoryPageVO,
  ServiceItemFormPayload,
  ServiceItemOption,
  ServiceItemPageQuery,
  ServiceItemPageVO,
} from '@/features/service/model/serviceTypes';
import type { EntityId } from '@/features/system/model/systemTypes';

export const serviceCategoryApi = {
  list(params: ServiceCategoryPageQuery): Promise<PageData<ServiceCategoryPageVO>> {
    return get<PageData<ServiceCategoryPageVO>>('/v1/service-categories/page', { params });
  },
  form(id: EntityId): Promise<ServiceCategoryFormPayload> {
    return get<ServiceCategoryFormPayload>(`/v1/service-categories/${id}/form`);
  },
  create(payload: ServiceCategoryFormPayload): Promise<EntityId> {
    return post<EntityId, ServiceCategoryFormPayload>('/v1/service-categories/add', payload);
  },
  update(id: EntityId, payload: ServiceCategoryFormPayload): Promise<void> {
    return put<void, ServiceCategoryFormPayload>(`/v1/service-categories/${id}/update`, payload);
  },
  remove(ids: EntityId[]): Promise<void> {
    return deleteRequest<void>('/v1/service-categories/delete', { params: { ids: ids.join(',') } });
  },
  options(): Promise<ServiceCategoryOption[]> {
    return get<ServiceCategoryOption[]>('/v1/service-categories/options');
  },
};

export const serviceItemApi = {
  list(params: ServiceItemPageQuery): Promise<PageData<ServiceItemPageVO>> {
    return get<PageData<ServiceItemPageVO>>('/v1/services/page', { params });
  },
  form(id: EntityId): Promise<ServiceItemFormPayload> {
    return get<ServiceItemFormPayload>(`/v1/services/${id}/form`);
  },
  create(payload: ServiceItemFormPayload): Promise<EntityId> {
    return post<EntityId, ServiceItemFormPayload>('/v1/services/add', payload);
  },
  update(id: EntityId, payload: ServiceItemFormPayload): Promise<void> {
    return put<void, ServiceItemFormPayload>(`/v1/services/${id}/update`, payload);
  },
  remove(ids: EntityId[]): Promise<void> {
    return deleteRequest<void>('/v1/services/delete', { params: { ids: ids.join(',') } });
  },
  options(): Promise<ServiceItemOption[]> {
    return get<ServiceItemOption[]>('/v1/services/options');
  },
};
