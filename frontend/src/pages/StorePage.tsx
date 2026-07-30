import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Search, Trash2 } from 'lucide-react';
import {
  storeApi,
  userApi,
  type StoreFormPayload,
  type StorePageVO,
} from '@/shared/api/modules/systemApi';
import type { EntityId, UserPageVO } from '@/features/system/model/systemTypes';
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

function defaultStoreForm(): StoreFormPayload {
  return {
    name: '',
    openTime: '09:00',
    closeTime: '21:00',
    businessHours: '09:00-21:00',
    status: 1,
    userIds: [],
  };
}

function toUserOption(user: UserPageVO): { value: EntityId; label: string } {
  return {
    value: String(user.id),
    label: user.nickname ? `${user.nickname}（${user.username}）` : user.username,
  };
}

export function StorePage() {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const [rows, setRows] = useState<StorePageVO[]>([]);
  const [userOptions, setUserOptions] = useState<Array<{ value: EntityId; label: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [pageNum, setPageNum] = useState(1);
  const [keyword, setKeyword] = useState('');
  const debounced = useDebounce(keyword, 300);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<EntityId | null>(null);
  const [form, setForm] = useState<StoreFormPayload>(() => defaultStoreForm());
  const [saving, setSaving] = useState(false);
  const [confirmIds, setConfirmIds] = useState<EntityId[] | null>(null);

  const selectedUserIds = useMemo(() => form.userIds ?? [], [form.userIds]);
  const invisibleSelectedCount = useMemo(
    () => selectedUserIds.filter((id) => !userOptions.some((option) => option.value === id)).length,
    [selectedUserIds, userOptions],
  );

  const loadUserOptions = useCallback(async () => {
    if (!hasPermission('system:user:list')) {
      setUserOptions([]);
      return;
    }
    try {
      const data = await userApi.list({ pageNum: 1, pageSize: 200 });
      setUserOptions((data.list ?? []).map(toUserOption));
    } catch {
      setUserOptions([]);
    }
  }, [hasPermission]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await storeApi.list({ pageNum, pageSize: 10, keywords: debounced || undefined });
      setRows(data.list ?? []);
      setTotal(data.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, [pageNum, debounced]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void loadUserOptions();
  }, [loadUserOptions]);

  async function openEdit(id: EntityId): Promise<void> {
    const detail = await storeApi.detail(id);
    setEditId(id);
    setForm({
      name: detail.name,
      code: detail.code,
      phone: detail.phone,
      address: detail.address,
      businessHours: detail.businessHours,
      openTime: detail.openTime,
      closeTime: detail.closeTime,
      restDays: detail.restDays,
      status: detail.status ?? 1,
      remark: detail.remark,
      userIds: (detail.userIds ?? []).map(String),
    });
    setOpen(true);
  }

  async function handleSave(): Promise<void> {
    setSaving(true);
    try {
      if (editId) {
        await storeApi.update(editId, form);
      } else {
        await storeApi.create(form);
      }
      setOpen(false);
      setEditId(null);
      await load();
    } finally {
      setSaving(false);
    }
  }

  function toggleUser(userId: EntityId, checked: boolean): void {
    setForm((current) => {
      const currentIds = current.userIds ?? [];
      const nextIds = checked
        ? Array.from(new Set([...currentIds, userId]))
        : currentIds.filter((id) => id !== userId);
      return { ...current, userIds: nextIds };
    });
  }

  function openCreate(): void {
    setEditId(null);
    setForm(defaultStoreForm());
    setOpen(true);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">门店管理</h1>
          <p className="text-sm text-zinc-500">维护门店营业档案和门店数据范围。</p>
        </div>
        {hasPermission('biz:store:add') ? (
          <Button icon={<Plus className="size-4" />} onClick={openCreate}>
            新增门店
          </Button>
        ) : null}
      </div>

      <div className="relative max-w-xs">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
        <Input className="pl-9" onChange={(e) => setKeyword(e.target.value)} placeholder="名称/编码/电话" value={keyword} />
      </div>

      {loading ? (
        <PageLoading />
      ) : rows.length === 0 ? (
        <EmptyState title="暂无门店" description="当前门店权限范围内还没有门店档案。" />
      ) : (
        <div className="overflow-hidden rounded-lg border border-salon-line dark:border-zinc-800">
          <table className="min-w-full divide-y divide-salon-line text-sm dark:divide-zinc-800">
            <thead className="bg-slate-50 dark:bg-zinc-900/60">
              <tr>
                <th className="px-4 py-3 text-left font-medium">名称</th>
                <th className="px-4 py-3 text-left font-medium">编码</th>
                <th className="px-4 py-3 text-left font-medium">营业时间</th>
                <th className="px-4 py-3 text-left font-medium">电话</th>
                <th className="px-4 py-3 text-left font-medium">状态</th>
                <th className="px-4 py-3 text-right font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-salon-line dark:divide-zinc-800">
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="px-4 py-3">{row.name}</td>
                  <td className="px-4 py-3 font-mono text-xs">{row.code || '-'}</td>
                  <td className="px-4 py-3">{row.businessHours || `${row.openTime || ''}-${row.closeTime || ''}`}</td>
                  <td className="px-4 py-3">{row.phone || '-'}</td>
                  <td className="px-4 py-3">
                    <Badge tone={row.status === 1 ? 'success' : 'danger'}>{row.status === 1 ? '营业' : '停用'}</Badge>
                  </td>
                  <td className="space-x-2 px-4 py-3 text-right">
                    {hasPermission('biz:store:edit') ? (
                      <Button onClick={() => void openEdit(row.id)} size="sm" variant="secondary">
                        编辑
                      </Button>
                    ) : null}
                    {hasPermission('biz:store:delete') ? (
                      <Button icon={<Trash2 className="size-4" />} onClick={() => setConfirmIds([row.id])} size="sm" variant="secondary">
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
        footer={
          <>
            <Button onClick={() => setOpen(false)} variant="secondary">
              取消
            </Button>
            <Button loading={saving} onClick={() => void handleSave()}>
              保存
            </Button>
          </>
        }
        onClose={() => setOpen(false)}
        open={open}
        title={editId ? '编辑门店' : '新增门店'}
      >
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="门店名称" required>
            <Input onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} value={form.name} />
          </Field>
          <Field label="编码">
            <Input onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} value={form.code ?? ''} />
          </Field>
          <Field label="电话">
            <Input onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} value={form.phone ?? ''} />
          </Field>
          <Field label="地址">
            <Input onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} value={form.address ?? ''} />
          </Field>
          <Field label="开门时间">
            <Input onChange={(e) => setForm((f) => ({ ...f, openTime: e.target.value }))} placeholder="09:00" value={form.openTime ?? ''} />
          </Field>
          <Field label="关门时间">
            <Input onChange={(e) => setForm((f) => ({ ...f, closeTime: e.target.value }))} placeholder="21:00" value={form.closeTime ?? ''} />
          </Field>
          <Field label="营业时间文案">
            <Input
              onChange={(e) => setForm((f) => ({ ...f, businessHours: e.target.value }))}
              value={form.businessHours ?? ''}
            />
          </Field>
          <Field label="休息日">
            <Input
              onChange={(e) => setForm((f) => ({ ...f, restDays: e.target.value }))}
              placeholder="0,6 表示周日周六"
              value={form.restDays ?? ''}
            />
          </Field>
        </div>

        <Field className="mt-4" label="授权用户">
          <div className="grid max-h-52 gap-2 overflow-y-auto rounded-md border border-salon-line bg-slate-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/60 md:grid-cols-2">
            {userOptions.length ? (
              userOptions.map((user) => {
                const checked = selectedUserIds.includes(user.value);
                return (
                  <label
                    className="flex cursor-pointer items-center gap-2 rounded-md border border-transparent px-2 py-1.5 text-sm hover:border-salon-line hover:bg-white dark:hover:border-zinc-700 dark:hover:bg-zinc-900"
                    key={user.value}
                  >
                    <input
                      checked={checked}
                      className="size-4 rounded border-salon-line text-salon-accent focus:ring-salon-accent"
                      onChange={(event) => toggleUser(user.value, event.target.checked)}
                      type="checkbox"
                    />
                    <span>{user.label}</span>
                  </label>
                );
              })
            ) : (
              <div className="col-span-full text-sm text-zinc-500 dark:text-zinc-400">暂无可选用户</div>
            )}
          </div>
          {invisibleSelectedCount > 0 ? (
            <span className="mt-1 block text-xs text-zinc-500 dark:text-zinc-400">
              另有 {invisibleSelectedCount} 个已授权用户不在当前可选列表内。
            </span>
          ) : null}
        </Field>
      </Modal>

      <ConfirmDialog
        danger
        description="删除门店后，对应门店授权关系也会一并清理。"
        onCancel={() => setConfirmIds(null)}
        onConfirm={() => {
          if (!confirmIds) {
            return;
          }
          void storeApi.remove(confirmIds).then(async () => {
            setConfirmIds(null);
            await load();
          });
        }}
        open={Boolean(confirmIds)}
        title="确认删除门店"
      />
    </div>
  );
}
