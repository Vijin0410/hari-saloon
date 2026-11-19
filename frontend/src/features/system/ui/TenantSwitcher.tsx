import { useCallback, useEffect, useState } from 'react';
import { Building2, RefreshCw } from 'lucide-react';
import { tenantApi } from '@/shared/api/modules/systemApi';
import { Select } from '@/shared/ui/Select';
import { Button } from '@/shared/ui/Button';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';
import { useTenantStore } from '@/store/useTenantStore';
import type { TenantOption } from '@/features/system/model/systemTypes';

/** 系统管理员的全局租户入口；切换后由主布局重新建立业务页面。 */
export function TenantSwitcher() {
  const tenantId = useTenantStore((s) => s.tenantId);
  const selectTenant = useTenantStore((s) => s.selectTenant);
  const [options, setOptions] = useState<TenantOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [pendingTenant, setPendingTenant] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    tenantApi
      .options()
      .then((items) => {
        if (active) setOptions(items);
      })
      .catch(() => {
        if (active) setError('租户加载失败');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [attempt]);

  const changeTenant = useCallback(
    (next: string) => {
      if (next === tenantId) return;
      if (tenantId) {
        setPendingTenant(next);
        return;
      }
      selectTenant(next);
    },
    [selectTenant, tenantId],
  );

  return (
    <>
      <div className="flex min-w-0 items-center gap-2">
        <Building2 className="hidden size-4 shrink-0 text-salon-accent sm:block" />
        {error ? (
          <Button size="sm" variant="secondary" onClick={() => setAttempt((v) => v + 1)}>
            {error}，重试
          </Button>
        ) : (
          <Select
            aria-label="当前管理租户"
            className="w-40 max-w-full sm:w-52"
            disabled={loading}
            value={tenantId}
            onChange={(event) => changeTenant(event.target.value)}
          >
            <option value="">{loading ? '正在加载租户…' : '平台管理 · 请选择租户'}</option>
            {!loading && options.length === 0 ? <option disabled>暂无可用租户</option> : null}
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        )}
        {!error ? (
          <Button
            aria-label="刷新可用租户"
            title="刷新可用租户"
            className="size-9 shrink-0 px-0"
            variant="ghost"
            disabled={loading}
            icon={<RefreshCw className="size-4" />}
            onClick={() => setAttempt((v) => v + 1)}
          />
        ) : null}
      </div>
      <ConfirmDialog
        open={pendingTenant !== null}
        title="切换租户"
        description="切换后将关闭当前详情和弹窗，未保存的表单和收银草稿会被清空。"
        confirmLabel="确认切换"
        onCancel={() => setPendingTenant(null)}
        onConfirm={() => {
          if (pendingTenant !== null) selectTenant(pendingTenant);
          setPendingTenant(null);
        }}
      />
    </>
  );
}
