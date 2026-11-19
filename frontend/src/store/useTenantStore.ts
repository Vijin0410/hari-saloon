import { create } from 'zustand';
import { setTenantScope } from '@/shared/lib/tenantScope';

interface TenantState {
  tenantId: string;
  selectTenant: (tenantId: string) => void;
}

/** 当前标签页的租户选择，跨页面保持，退出账号或刷新页面后重新选择。 */
export const useTenantStore = create<TenantState>((set) => ({
  tenantId: '',
  selectTenant: (tenantId) => {
    setTenantScope(tenantId || null);
    set({ tenantId });
  },
}));
