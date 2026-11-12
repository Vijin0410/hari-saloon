import { get, put } from '@/shared/api/client';
import type { MemberSettingsValues } from '@/features/member/model/memberSettingsSchemas';

export interface MemberSettingsVO {
  pointsEnabled: boolean;
  outstandingPoints?: number;
  outstandingDebt?: number;
  refundGraceDays: number;
}

export const memberSettingsApi = {
  capabilities: () => get<MemberSettingsVO>('/v1/member-settings/capabilities'),
  detail: () => get<MemberSettingsVO>('/v1/member-settings/detail'),
  update: (payload: MemberSettingsValues) => put<void, MemberSettingsValues>('/v1/member-settings/update', payload),
};
