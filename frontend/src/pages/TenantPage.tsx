import { useCallback, useEffect, useState } from 'react';
import { Plus, Search, ToggleLeft, ToggleRight, Trash2 } from 'lucide-react';
import {
  tenantApi,
  type TenantFormPayload,
  type TenantPageVO,
} from '@/shared/api/modules/systemApi';
import { Badge } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';
import { EmptyState } from '@/shared/ui/EmptyState';
import { Field } from '@/shared/ui/Field';
import { Input } from '@/shared/ui/Input';
import { Modal } from '@/shared/ui/Modal';
import { PageLoading } from '@/shared/ui/PageLoading';
import { useDebounce } from '@/shared/hooks/useDebounce';
import { useAuthStore } from '@/store/useAuthStore';

/**
 * 租户开通：创建时初始化预置角色、管理员，可选联合创建初始门店。
 */
export function TenantPage() {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const [rows, setRows] = useState<TenantPageVO[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [pageNum, setPageNum] = useState(1);
  const [keyword, setKeyword] = useState('');
  const debounced = useDebounce(keyword, 300);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<TenantFormPayload>({
    name: '',
    code: '',
    status: 1,
    adminUsername: 'admin',
    store: { name: '', code: '', phone: '', address: '' },
    syncModules: ['dict', 'memberLevel', 'memberTag'],
  });
  const [saving, setSaving] = useState(false);
  const [confirmIds, setConfirmIds] = useState<string[] | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await tenantApi.list({ pageNum, pageSize: 10, keywords: debounced || undefined });
      setRows(data.list ?? []);
      setTotal(data.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, [pageNum, debounced]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSave(): Promise<void> {
    setSaving(true);
    try {
      await tenantApi.create(form);
      setOpen(false);
      setForm({ name: '', code: '', status: 1, adminUsername: 'admin', store: { name: '', code: '', phone: '', address: '' }, syncModules: ['dict', 'memberLevel', 'memberTag'] });
      await load();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">租户管理</h1>
          <p className="text-sm text-zinc-500">开通租户会自动创建预置角色与管理员账号，可选联合创建初始门店。</p>
        </div>
        {hasPermission('system:tenant:add') ? (
          <Button icon={<Plus className="size-4" />} onClick={() => setOpen(true)}>
            开通租户
          </Button>
        ) : null}
      </div>

      <div className="flex gap-2">
        <div className="relative max-w-xs flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
          <Input className="pl-9" onChange={(e) => setKeyword(e.target.value)} placeholder="名称/编码" value={keyword} />
        </div>
      </div>

      {loading ? (
        <PageLoading />
      ) : rows.length === 0 ? (
        <EmptyState title="暂无租户" description="点击开通创建第一个连锁品牌租户。" />
      ) : (
        <div className="overflow-hidden rounded-lg border border-salon-line dark:border-zinc-800">
          <table className="min-w-full divide-y divide-salon-line text-sm dark:divide-zinc-800">
            <thead className="bg-slate-50 dark:bg-zinc-900/60">
              <tr>
                <th className="px-4 py-3 text-left font-medium">名称</th>
                <th className="px-4 py-3 text-left font-medium">编码</th>
                <th className="px-4 py-3 text-left font-medium">联系人</th>
                <th className="px-4 py-3 text-left font-medium">状态</th>
                <th className="px-4 py-3 text-right font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-salon-line dark:divide-zinc-800">
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="px-4 py-3">{row.name}</td>
                  <td className="px-4 py-3 font-mono text-xs">{row.code}</td>
                  <td className="px-4 py-3">{row.contact || '-'}</td>
                  <td className="px-4 py-3">
                    <Badge tone={row.status === 1 ? 'success' : 'danger'}>{row.status === 1 ? '启用' : '禁用'}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {hasPermission('system:tenant:status') ? (
                      <Button
                        className="mr-2"
                        icon={row.status === 1 ? <ToggleRight className="size-4" /> : <ToggleLeft className="size-4" />}
                        onClick={() => void tenantApi.updateStatus(row.id, row.status === 1 ? 0 : 1).then(load)}
                        size="sm"
                        variant="secondary"
                      >
                        {row.status === 1 ? '禁用' : '启用'}
                      </Button>
                    ) : null}
                    {hasPermission('system:tenant:delete') && row.id !== '1' ? (
                      <Button
                        icon={<Trash2 className="size-4" />}
                        onClick={() => setConfirmIds([row.id])}
                        size="sm"
                        variant="secondary"
                      >
                        删除
                      </Button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center justify-between text-sm text-zinc-500">
        <span>共 {total} 条</span>
        <div className="flex gap-2">
          <Button disabled={pageNum <= 1} onClick={() => setPageNum((p) => p - 1)} size="sm" variant="secondary">
            上一页
          </Button>
          <Button disabled={pageNum * 10 >= total} onClick={() => setPageNum((p) => p + 1)} size="sm" variant="secondary">
            下一页
          </Button>
        </div>
      </div>

      <Modal
        description="管理员初始密码留空则使用系统默认密码（wj.salon.default-password）。"
        footer={
          <>
            <Button onClick={() => setOpen(false)} variant="secondary">
              取消
            </Button>
            <Button loading={saving} onClick={() => void handleSave()}>
              开通
            </Button>
          </>
        }
        onClose={() => setOpen(false)}
        open={open}
        title="开通租户"
      >
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="租户名称" required>
            <Input onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} value={form.name} />
          </Field>
          <Field label="租户编码" required>
            <Input onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} value={form.code} />
          </Field>
          <Field label="联系人">
            <Input onChange={(e) => setForm((f) => ({ ...f, contact: e.target.value }))} value={form.contact ?? ''} />
          </Field>
          <Field label="电话">
            <Input onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} value={form.phone ?? ''} />
          </Field>
          <Field label="管理员用户名">
            <Input
              onChange={(e) => setForm((f) => ({ ...f, adminUsername: e.target.value }))}
              value={form.adminUsername ?? 'admin'}
            />
          </Field>
          <Field label="管理员初始密码">
            <Input
              onChange={(e) => setForm((f) => ({ ...f, adminPassword: e.target.value }))}
              placeholder="默认 admin123"
              type="password"
              value={form.adminPassword ?? ''}
            />
          </Field>
        </div>

        <div className="space-y-3 border-t border-salon-line pt-3 dark:border-zinc-800">
          <div className="text-sm font-medium text-salon-ink dark:text-white">初始门店（可选，门店名称留空则不开通门店）</div>
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="门店名称">
              <Input
                onChange={(e) => setForm((f) => ({ ...f, store: { ...(f.store ?? {}), name: e.target.value } }))}
                value={form.store?.name ?? ''}
              />
            </Field>
            <Field label="门店编码">
              <Input
                onChange={(e) => setForm((f) => ({ ...f, store: { ...(f.store ?? {}), code: e.target.value } }))}
                value={form.store?.code ?? ''}
              />
            </Field>
            <Field label="门店电话">
              <Input
                onChange={(e) => setForm((f) => ({ ...f, store: { ...(f.store ?? {}), phone: e.target.value } }))}
                value={form.store?.phone ?? ''}
              />
            </Field>
            <Field label="门店地址">
              <Input
                onChange={(e) => setForm((f) => ({ ...f, store: { ...(f.store ?? {}), address: e.target.value } }))}
                value={form.store?.address ?? ''}
              />
            </Field>
          </div>
        </div>

        <div className="space-y-2 border-t border-salon-line pt-3 dark:border-zinc-800">
          <div className="text-sm font-medium text-salon-ink dark:text-white">同步通用数据（从默认租户复制到新租户）</div>
          <div className="grid gap-2 md:grid-cols-3">
            {([['dict', '字典'], ['memberLevel', '会员等级'], ['memberTag', '会员标签']] as const).map(([key, label]) => {
              const checked = (form.syncModules ?? []).includes(key);
              return (
                <label
                  key={key}
                  className="flex cursor-pointer items-center gap-2 rounded-md border border-transparent px-2 py-1.5 text-sm hover:border-salon-line dark:hover:border-zinc-700"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() =>
                      setForm((f) => {
                        const cur = f.syncModules ?? [];
                        return { ...f, syncModules: checked ? cur.filter((m) => m !== key) : [...cur, key] };
                      })
                    }
                  />
                  <span>{label}</span>
                </label>
              );
            })}
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        danger
        description="删除租户不会级联清理业务数据，请谨慎操作。"
        onCancel={() => setConfirmIds(null)}
        onConfirm={() => {
          if (!confirmIds) {
            return;
          }
          void tenantApi.remove(confirmIds).then(async () => {
            setConfirmIds(null);
            await load();
          });
        }}
        open={Boolean(confirmIds)}
        title="确认删除租户"
      />
    </div>
  );
}
