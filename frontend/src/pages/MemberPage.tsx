import { useCallback, useEffect, useState } from 'react';
import { Plus, Search, Trash2 } from 'lucide-react';
import {
  memberApi,
  storeApi,
  type MemberFormPayload,
  type MemberPageVO,
} from '@/shared/api/modules/systemApi';
import type { StoreOption } from '@/features/system/model/systemTypes';
import { Badge } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';
import { EmptyState } from '@/shared/ui/EmptyState';
import { Field } from '@/shared/ui/Field';
import { Input } from '@/shared/ui/Input';
import { Modal } from '@/shared/ui/Modal';
import { PageLoading } from '@/shared/ui/PageLoading';
import { Select } from '@/shared/ui/Select';
import { useDebounce } from '@/shared/hooks/useDebounce';
import { useAuthStore } from '@/store/useAuthStore';

function defaultMemberForm(storeId = ''): MemberFormPayload {
  return {
    name: '',
    storeId,
    status: 1,
    gender: 0,
  };
}

export function MemberPage() {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const [rows, setRows] = useState<MemberPageVO[]>([]);
  const [storeOptions, setStoreOptions] = useState<StoreOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [pageNum, setPageNum] = useState(1);
  const [keyword, setKeyword] = useState('');
  const debounced = useDebounce(keyword, 300);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<MemberFormPayload>(() => defaultMemberForm());
  const [saving, setSaving] = useState(false);
  const [confirmIds, setConfirmIds] = useState<string[] | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [memberPage, stores] = await Promise.all([
        memberApi.list({ pageNum, pageSize: 10, keywords: debounced || undefined }),
        storeApi.options().catch(() => [] as StoreOption[]),
      ]);
      setRows(memberPage.list ?? []);
      setTotal(memberPage.total ?? 0);
      setStoreOptions((stores ?? []).map((store) => ({ ...store, value: String(store.value) })));
    } finally {
      setLoading(false);
    }
  }, [pageNum, debounced]);

  useEffect(() => {
    void load();
  }, [load]);

  async function openEdit(id: string): Promise<void> {
    const detail = await memberApi.detail(id);
    setEditId(id);
    setForm({
      name: detail.name,
      phone: detail.phone,
      gender: detail.gender ?? 0,
      birthday: detail.birthday,
      level: detail.level,
      source: detail.source,
      status: detail.status ?? 1,
      remark: detail.remark,
      storeId: String(detail.storeId ?? ''),
    });
    setOpen(true);
  }

  async function handleSave(): Promise<void> {
    if (!form.storeId) {
      return;
    }

    setSaving(true);
    try {
      if (editId) {
        await memberApi.update(editId, form);
      } else {
        await memberApi.create(form);
      }
      setOpen(false);
      setEditId(null);
      await load();
    } finally {
      setSaving(false);
    }
  }

  function openCreate(): void {
    setEditId(null);
    setForm(defaultMemberForm(storeOptions[0]?.value ?? ''));
    setOpen(true);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">会员管理</h1>
          <p className="text-sm text-zinc-500">列表按租户和门店数据范围过滤。</p>
        </div>
        {hasPermission('biz:member:add') ? (
          <Button icon={<Plus className="size-4" />} onClick={openCreate}>
            新增会员
          </Button>
        ) : null}
      </div>

      <div className="relative max-w-xs">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
        <Input className="pl-9" onChange={(e) => setKeyword(e.target.value)} placeholder="姓名/手机号/门店" value={keyword} />
      </div>

      {loading ? (
        <PageLoading />
      ) : rows.length === 0 ? (
        <EmptyState title="暂无会员" description="当前门店权限范围内还没有会员。" />
      ) : (
        <div className="overflow-hidden rounded-lg border border-salon-line dark:border-zinc-800">
          <table className="min-w-full divide-y divide-salon-line text-sm dark:divide-zinc-800">
            <thead className="bg-slate-50 dark:bg-zinc-900/60">
              <tr>
                <th className="px-4 py-3 text-left font-medium">姓名</th>
                <th className="px-4 py-3 text-left font-medium">手机</th>
                <th className="px-4 py-3 text-left font-medium">门店</th>
                <th className="px-4 py-3 text-left font-medium">等级</th>
                <th className="px-4 py-3 text-left font-medium">余额</th>
                <th className="px-4 py-3 text-left font-medium">状态</th>
                <th className="px-4 py-3 text-right font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-salon-line dark:divide-zinc-800">
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="px-4 py-3">{row.name}</td>
                  <td className="px-4 py-3">{row.phone || '-'}</td>
                  <td className="px-4 py-3">{row.storeName || '-'}</td>
                  <td className="px-4 py-3">{row.level ?? 0}</td>
                  <td className="px-4 py-3">{row.balance ?? 0}</td>
                  <td className="px-4 py-3">
                    <Badge tone={row.status === 1 ? 'success' : 'danger'}>{row.status === 1 ? '正常' : '停用'}</Badge>
                  </td>
                  <td className="space-x-2 px-4 py-3 text-right">
                    {hasPermission('biz:member:edit') ? (
                      <Button onClick={() => void openEdit(row.id)} size="sm" variant="secondary">
                        编辑
                      </Button>
                    ) : null}
                    {hasPermission('biz:member:delete') ? (
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
        title={editId ? '编辑会员' : '新增会员'}
      >
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="姓名" required>
            <Input onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} value={form.name} />
          </Field>
          <Field label="手机">
            <Input onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} value={form.phone ?? ''} />
          </Field>
          <Field label="性别">
            <Select
              onChange={(e) => setForm((f) => ({ ...f, gender: Number(e.target.value) }))}
              value={form.gender ?? 0}
            >
              <option value={0}>未知</option>
              <option value={1}>男</option>
              <option value={2}>女</option>
            </Select>
          </Field>
          <Field label="所属门店" required>
            <Select
              onChange={(e) => setForm((f) => ({ ...f, storeId: e.target.value }))}
              value={form.storeId}
            >
              <option value="">请选择所属门店</option>
              {storeOptions.map((store) => (
                <option key={store.value} value={store.value}>
                  {store.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="来源">
            <Input onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))} value={form.source ?? ''} />
          </Field>
          <Field label="备注">
            <Input onChange={(e) => setForm((f) => ({ ...f, remark: e.target.value }))} value={form.remark ?? ''} />
          </Field>
        </div>
      </Modal>

      <ConfirmDialog
        danger
        description="删除后不可恢复。"
        onCancel={() => setConfirmIds(null)}
        onConfirm={() => {
          if (!confirmIds) {
            return;
          }
          void memberApi.remove(confirmIds).then(async () => {
            setConfirmIds(null);
            await load();
          });
        }}
        open={Boolean(confirmIds)}
        title="确认删除会员"
      />
    </div>
  );
}
