import { create } from 'zustand';
import { getAccessToken } from '@/shared/lib/authToken';
import { getTenantScope } from '@/shared/lib/tenantScope';
import { memberSettingsApi } from '@/shared/api/modules/memberSettingsApi';

/** 租户能力实时刷新；不持久化，避免切换账号读取旧租户开关。 */
export const useMemberSettingsStore = create<{
  pointsEnabled: boolean;
  error: string;
  refresh: () => Promise<void>;
}>((set) => ({
  pointsEnabled: false,
  error: '',
  refresh: async () => {
    const requestedToken = getAccessToken();
    const requestedScope = getTenantScope().revision;
    try {
      const data = await memberSettingsApi.capabilities();
      if (getAccessToken() === requestedToken && getTenantScope().revision === requestedScope) {
        set({ pointsEnabled: data.pointsEnabled, error: '' });
      }
    } catch {
      if (getAccessToken() === requestedToken && getTenantScope().revision === requestedScope) {
        set({ error: '会员积分状态暂不可用，请刷新重试' });
      }
    }
  },
}));
