import { deleteRequest, get, post, put } from '@/shared/api/client';
import type { PageData } from '@/types';
import type {
  MemberBalanceAdjustPayload,
  MemberBalanceLogPageQuery,
  MemberBalanceLogVO,
  MemberBalanceVO,
  MemberDetailVO,
  MemberFormPayload,
  MemberLevelFormPayload,
  MemberLevelOption,
  MemberLevelPageQuery,
  MemberLevelPageVO,
  MemberPageQuery,
  MemberPageVO,
  MemberPointAdjustPayload,
  MemberPointLogPageQuery,
  MemberPointLogVO,
  MemberProfilePayload,
  MemberProfileVO,
  MemberTagFormPayload,
  MemberTagOption,
  MemberTagPageQuery,
  MemberTagVO,
} from '@/features/member/model/memberTypes';
import type { EntityId } from '@/features/system/model/systemTypes';

export const memberApi = {
  list(params: MemberPageQuery): Promise<PageData<MemberPageVO>> {
    return get<PageData<MemberPageVO>>('/v1/members/page', { params });
  },
  detail(id: EntityId): Promise<MemberDetailVO> {
    return get<MemberDetailVO>(`/v1/members/${id}/detail`);
  },
  create(payload: MemberFormPayload): Promise<EntityId> {
    return post<EntityId, MemberFormPayload>('/v1/members/add', payload);
  },
  update(id: EntityId, payload: MemberFormPayload): Promise<void> {
    return put<void, MemberFormPayload>(`/v1/members/${id}/update`, payload);
  },
  remove(ids: EntityId[]): Promise<void> {
    return deleteRequest<void>('/v1/members/delete', { params: { ids: ids.join(',') } });
  },
  tags(id: EntityId): Promise<MemberTagOption[]> {
    return get<MemberTagOption[]>(`/v1/members/${id}/tags`);
  },
  setTags(id: EntityId, tagIds: EntityId[]): Promise<void> {
    return put<void, EntityId[]>(`/v1/members/${id}/tags`, tagIds);
  },
  profile(id: EntityId): Promise<MemberProfileVO> {
    return get<MemberProfileVO>(`/v1/members/${id}/profile`);
  },
  updateProfile(id: EntityId, payload: MemberProfilePayload): Promise<void> {
    return put<void, MemberProfilePayload>(`/v1/members/${id}/profile`, payload);
  },
};

export const memberLevelApi = {
  list(params: MemberLevelPageQuery): Promise<PageData<MemberLevelPageVO>> {
    return get<PageData<MemberLevelPageVO>>('/v1/member-levels/page', { params });
  },
  form(id: EntityId): Promise<MemberLevelFormPayload> {
    return get<MemberLevelFormPayload>(`/v1/member-levels/${id}/form`);
  },
  create(payload: MemberLevelFormPayload): Promise<EntityId> {
    return post<EntityId, MemberLevelFormPayload>('/v1/member-levels/add', payload);
  },
  update(id: EntityId, payload: MemberLevelFormPayload): Promise<void> {
    return put<void, MemberLevelFormPayload>(`/v1/member-levels/${id}/update`, payload);
  },
  remove(ids: EntityId[]): Promise<void> {
    return deleteRequest<void>('/v1/member-levels/delete', { params: { ids: ids.join(',') } });
  },
  options(): Promise<MemberLevelOption[]> {
    return get<MemberLevelOption[]>('/v1/member-levels/options');
  },
};

export const memberTagApi = {
  list(params: MemberTagPageQuery): Promise<PageData<MemberTagVO>> {
    return get<PageData<MemberTagVO>>('/v1/member-tags/page', { params });
  },
  form(id: EntityId): Promise<MemberTagFormPayload> {
    return get<MemberTagFormPayload>(`/v1/member-tags/${id}/form`);
  },
  create(payload: MemberTagFormPayload): Promise<EntityId> {
    return post<EntityId, MemberTagFormPayload>('/v1/member-tags/add', payload);
  },
  update(id: EntityId, payload: MemberTagFormPayload): Promise<void> {
    return put<void, MemberTagFormPayload>(`/v1/member-tags/${id}/update`, payload);
  },
  remove(ids: EntityId[]): Promise<void> {
    return deleteRequest<void>('/v1/member-tags/delete', { params: { ids: ids.join(',') } });
  },
  options(): Promise<MemberTagOption[]> {
    return get<MemberTagOption[]>('/v1/member-tags/options');
  },
};

export const memberBalanceApi = {
  detail(id: EntityId): Promise<MemberBalanceVO> {
    return get<MemberBalanceVO>(`/v1/members/balance/${id}/detail`);
  },
  logs(params: MemberBalanceLogPageQuery): Promise<PageData<MemberBalanceLogVO>> {
    return get<PageData<MemberBalanceLogVO>>('/v1/members/balance/logs/page', { params });
  },
  adjust(id: EntityId, payload: MemberBalanceAdjustPayload): Promise<void> {
    return post<void, MemberBalanceAdjustPayload>(`/v1/members/balance/${id}/adjust`, payload);
  },
};

export const memberPointApi = {
  logs(params: MemberPointLogPageQuery): Promise<PageData<MemberPointLogVO>> {
    return get<PageData<MemberPointLogVO>>('/v1/members/points/logs/page', { params });
  },
  adjust(id: EntityId, payload: MemberPointAdjustPayload): Promise<void> {
    return post<void, MemberPointAdjustPayload>(`/v1/members/points/${id}/adjust`, payload);
  },
};
