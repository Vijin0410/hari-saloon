import { deleteRequest, get, post, put } from '@/shared/api/client';
import type { PageData } from '@/types';
import type {
  GoodsCategoryFormPayload,
  GoodsCategoryOption,
  GoodsCategoryPageQuery,
  GoodsCategoryPageVO,
  GoodsFormPayload,
  GoodsOption,
  GoodsPageQuery,
  GoodsPageVO,
} from '@/features/goods/model/goodsTypes';
import type { EntityId } from '@/features/system/model/systemTypes';

export const goodsCategoryApi = {
  list(params: GoodsCategoryPageQuery): Promise<PageData<GoodsCategoryPageVO>> {
    return get<PageData<GoodsCategoryPageVO>>('/v1/goods-categories/page', { params });
  },
  form(id: EntityId): Promise<GoodsCategoryFormPayload> {
    return get<GoodsCategoryFormPayload>(`/v1/goods-categories/${id}/form`);
  },
  create(payload: GoodsCategoryFormPayload): Promise<EntityId> {
    return post<EntityId, GoodsCategoryFormPayload>('/v1/goods-categories/add', payload);
  },
  update(id: EntityId, payload: GoodsCategoryFormPayload): Promise<void> {
    return put<void, GoodsCategoryFormPayload>(`/v1/goods-categories/${id}/update`, payload);
  },
  remove(ids: EntityId[]): Promise<void> {
    return deleteRequest<void>('/v1/goods-categories/delete', { params: { ids: ids.join(',') } });
  },
  options(): Promise<GoodsCategoryOption[]> {
    return get<GoodsCategoryOption[]>('/v1/goods-categories/options');
  },
};

export const goodsApi = {
  list(params: GoodsPageQuery): Promise<PageData<GoodsPageVO>> {
    return get<PageData<GoodsPageVO>>('/v1/goods/page', { params });
  },
  form(id: EntityId): Promise<GoodsFormPayload> {
    return get<GoodsFormPayload>(`/v1/goods/${id}/form`);
  },
  create(payload: GoodsFormPayload): Promise<EntityId> {
    return post<EntityId, GoodsFormPayload>('/v1/goods/add', payload);
  },
  update(id: EntityId, payload: GoodsFormPayload): Promise<void> {
    return put<void, GoodsFormPayload>(`/v1/goods/${id}/update`, payload);
  },
  remove(ids: EntityId[]): Promise<void> {
    return deleteRequest<void>('/v1/goods/delete', { params: { ids: ids.join(',') } });
  },
  options(): Promise<GoodsOption[]> {
    return get<GoodsOption[]>('/v1/goods/options');
  },
};
