import { useCallback, useEffect, useState } from 'react';
import { storeApi } from '@/shared/api/modules/systemApi';
import { useTenantStore } from '@/store/useTenantStore';
import { useAuthStore } from '@/store/useAuthStore';
import type { EntityId, StoreOption, TenantOption } from '@/features/system/model/systemTypes';

interface TenantStoreFilterOptions {
  /** 是否启用门店筛选与门店下拉加载（会员/用户页 true，其余 false） */
  withStore?: boolean;
  /** 可选的业务门店下拉接口，保证选择范围与业务数据权限一致 */
  loadStoreOptions?: (tenantId?: EntityId) => Promise<StoreOption[]>;
}

/**
 * 租户/门店筛选下拉的统一逻辑：
 * - 租户由顶部统一选择；门店筛选 ROOT/TENANT_ADMIN 显示。
 * - ROOT 门店下拉跟随所选租户；TENANT_ADMIN 本租户全量；其余按授权门店范围（供表单使用）。
 * - 非 ROOT 一律不产出 tenantId（后端 TenantLine 已自动限本租户，防止越权）。
 */
export function useTenantStoreFilter({
  withStore = false,
  loadStoreOptions = storeApi.options,
}: TenantStoreFilterOptions = {}) {
  const isRoot = useAuthStore((s) => s.hasRole('ROOT'));
  const isTenantAdmin = useAuthStore((s) => s.hasRole('TENANT_ADMIN'));
  const showTenant = false;
  const showStore = withStore && (isRoot || isTenantAdmin);

  const tenantId = useTenantStore((s) => s.tenantId);
  const selectTenant = useTenantStore((s) => s.selectTenant);
  const [storeId, setStoreId] = useState<EntityId>('');
  const tenantOptions: TenantOption[] = [];
  const [storeOptions, setStoreOptions] = useState<StoreOption[]>([]);

  useEffect(() => {
    if (!withStore) {
      return;
    }
    let active = true;
    loadStoreOptions(isRoot ? tenantId || undefined : undefined)
      .then((items) => { if (active) setStoreOptions(items); })
      .catch(() => { if (active) setStoreOptions([]); });
    return () => { active = false; };
  }, [withStore, isRoot, tenantId, loadStoreOptions]);

  /** ROOT 切换租户时联动：重置门店选择 */
  const changeTenant = useCallback((id: EntityId) => {
    selectTenant(String(id));
    setStoreId('');
  }, [selectTenant]);

  const changeStore = useCallback((id: EntityId) => {
    setStoreId(id);
  }, []);

  /** 传入列表查询的筛选参数（已按角色归一化） */
  const filterParams = {
    tenantId: isRoot ? tenantId || undefined : undefined,
    storeId: showStore ? storeId || undefined : undefined,
  };

  return {
    isRoot,
    isTenantAdmin,
    showTenant,
    showStore,
    tenantId,
    storeId,
    tenantOptions,
    storeOptions,
    changeTenant,
    changeStore,
    filterParams,
  };
}
