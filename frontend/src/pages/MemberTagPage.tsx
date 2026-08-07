import { useCallback, useEffect, useState } from 'react';
import { Plus, Search, Trash2 } from 'lucide-react';
import { memberTagApi } from '@/shared/api/modules/memberApi';
import type { MemberTagFormPayload, MemberTagVO } from '@/features/member/model/memberTypes';
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

const COLOR_OPTIONS = ['red', 'orange', 'amber', 'green', 'blue', 'purple', 'pink', 'gray'];

function defaultForm(): MemberTagFormPayload {
  return { name: '', color: 'blue', sort: 0, status: 1 };
}

export function MemberTagPage() {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const [rows, setRows] = useState<MemberTagVO[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [pageNum, setPageNum] = useState(1);
  const [keyword, setKeyword] = useState('');
  const debounced = useDebounce(keyword, 300);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<MemberTagFormPayload>(() => defaultForm());
  const [saving, setSaving] = useState(false);
  const [confirmIds, setConfirmIds] = useState<string[] | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await memberTagApi.list({ pageNum, pageSize: 10, name: debounced || undefined });
      setRows(data.list ?? []);
      setTotal(data.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, [pageNum, debounced]);

  useEffect(() => {
    void load();
  }, [load]);

  async function openEdit(id: string): Promise<void> {
    const detail = await memberTagApi.form(id);
    setEditId(id);
    setForm({ ...detail });
    setOpen(true);
  }

  async function handleSave(): Promise<void> {
    setSaving(true);
    try {
      if (editId) {
        await memberTagApi.update(editId, form);
      } else {
        await memberTagApi.create(form);
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
    setForm(defaultForm());
    setOpen(true);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">会员标签</h1>
          <p className="text-sm text-zinc-500">维护会员标签字典，用于会员分层与筛选。</p>
        </div>
        {hasPermission('biz:memberTag:add') ? (
          <Button icon={<Plus className="size-4" />} onClick={openCreate}>
            新增标签
          </Button>
        ) : null}
      </div>

      <div className="rounded-lg border border-salon-line bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
            <Input
              className="pl-9"
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  void load();
                }
              }}
              clearable
              placeholder="标签名称"
              value={keyword}
            />
          </div>
          <Button
            className="lg:w-24"
            icon={<Search className="size-4" />}
            onClick={load}
            variant="secondary"
          >
            查询
          </Button>
        </div>
      </div>

      {loading ? (
        <PageLoading />
      ) : rows.length === 0 ? (
        <EmptyState title="暂无标签" description="还未创建任何会员标签。" />
      ) : (
        <div className="overflow-hidden rounded-lg border border-salon-line dark:border-zinc-800">
          <table className="min-w-full divide-y divide-salon-line text-sm dark:divide-zinc-800">
            <thead className="bg-slate-50 dark:bg-zinc-900/60">
              <tr>
                <th className="px-4 py-3 text-left font-medium">标签名称</th>
                <th className="px-4 py-3 text-left font-medium">颜色</th>
                <th className="px-4 py-3 text-left font-medium">排序</th>
                <th className="px-4 py-3 text-left font-medium">状态</th>
                <th className="px-4 py-3 text-right font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-salon-line dark:divide-zinc-800">
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="px-4 py-3">{row.name}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-2">
                      <span
                        className="size-3 rounded-full"
                        style={{ backgroundColor: row.color }}
                      />
                      {row.color || '-'}
                    </span>
                  </td>
                  <td className="px-4 py-3">{row.sort ?? 0}</td>
                  <td className="px-4 py-3">
                    <Badge tone={row.status === 1 ? 'success' : 'danger'}>
                      {row.status === 1 ? '启用' : '禁用'}
                    </Badge>
                  </td>
                  <td className="space-x-2 px-4 py-3 text-right">
                    {hasPermission('biz:memberTag:edit') ? (
                      <Button onClick={() => void openEdit(row.id)} size="sm" variant="secondary">
                        编辑
                      </Button>
                    ) : null}
                    {hasPermission('biz:memberTag:delete') ? (
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
          <Button
            disabled={pageNum <= 1}
            onClick={() => setPageNum((p) => p - 1)}
            size="sm"
            variant="secondary"
          >
            上一页
          </Button>
          <Button
            disabled={pageNum * 10 >= total}
            onClick={() => setPageNum((p) => p + 1)}
            size="sm"
            variant="secondary"
          >
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
        title={editId ? '编辑标签' : '新增标签'}
      >
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="标签名称" required>
            <Input
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              value={form.name}
            />
          </Field>
          <Field label="颜色">
            <Select
              onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
              value={form.color ?? 'blue'}
            >
              {COLOR_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="排序">
            <Input
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  sort: e.target.value === '' ? undefined : Number(e.target.value),
                }))
              }
              type="number"
              value={form.sort ?? 0}
            />
          </Field>
          <Field label="状态">
            <Select
              onChange={(e) => setForm((f) => ({ ...f, status: Number(e.target.value) }))}
              value={form.status ?? 1}
            >
              <option value={1}>启用</option>
              <option value={0}>禁用</option>
            </Select>
          </Field>
          <Field className="md:col-span-2" label="备注">
            <Input
              onChange={(e) => setForm((f) => ({ ...f, remark: e.target.value }))}
              value={form.remark ?? ''}
            />
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
          void memberTagApi.remove(confirmIds).then(async () => {
            setConfirmIds(null);
            await load();
          });
        }}
        open={Boolean(confirmIds)}
        title="确认删除标签"
      />
    </div>
  );
}
