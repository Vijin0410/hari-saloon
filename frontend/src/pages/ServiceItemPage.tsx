import { useCallback, useEffect, useState } from 'react';
import { Plus, Search, Trash2 } from 'lucide-react';
import { serviceCategoryApi } from '@/shared/api/modules/serviceApi';
import { serviceItemApi } from '@/shared/api/modules/serviceApi';
import type {
  ServiceCategoryOption,
  ServiceItemFormPayload,
  ServiceItemPageVO,
} from '@/features/service/model/serviceTypes';
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

function defaultForm(): ServiceItemFormPayload {
  return { name: '', standardPrice: 0, discountable: 1, commissionable: 1, sort: 0, status: 1 };
}

export function ServiceItemPage() {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const [rows, setRows] = useState<ServiceItemPageVO[]>([]);
  const [categories, setCategories] = useState<ServiceCategoryOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [pageNum, setPageNum] = useState(1);
  const [keyword, setKeyword] = useState('');
  const debounced = useDebounce(keyword, 300);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<ServiceItemFormPayload>(() => defaultForm());
  const [saving, setSaving] = useState(false);
  const [confirmIds, setConfirmIds] = useState<string[] | null>(null);

  useEffect(() => {
    serviceCategoryApi
      .options()
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await serviceItemApi.list({
        pageNum,
        pageSize: 10,
        name: debounced || undefined,
      });
      setRows(data.list ?? []);
      setTotal(data.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, [pageNum, debounced]);

  useEffect(() => {
    void load();
  }, [load]);

  function categoryName(id?: number | string): string {
    if (id === undefined || id === null) {
      return '暂无';
    }
    return categories.find((c) => String(c.id) === String(id))?.name ?? '暂无';
  }

  async function openEdit(id: string): Promise<void> {
    const detail = await serviceItemApi.form(id);
    setEditId(id);
    setForm({ ...detail });
    setOpen(true);
  }

  async function handleSave(): Promise<void> {
    setSaving(true);
    try {
      if (editId) {
        await serviceItemApi.update(editId, form);
      } else {
        await serviceItemApi.create(form);
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

  function setNum(field: keyof ServiceItemFormPayload, value: string): void {
    setForm((f) => ({ ...f, [field]: value === '' ? undefined : Number(value) }));
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">服务项目</h1>
          <p className="text-sm text-zinc-500">维护服务项目的价格、时长与折扣提成规则，用于收银开单。</p>
        </div>
        {hasPermission('biz:serviceItem:add') ? (
          <Button icon={<Plus className="size-4" />} onClick={openCreate}>
            新增项目
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
              placeholder="项目名称"
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
        <EmptyState title="暂无项目" description="还未配置任何服务项目。" />
      ) : (
        <div className="overflow-hidden rounded-lg border border-salon-line dark:border-zinc-800">
          <table className="min-w-full divide-y divide-salon-line text-sm dark:divide-zinc-800">
            <thead className="bg-slate-50 dark:bg-zinc-900/60">
              <tr>
                <th className="px-4 py-3 text-left font-medium">项目名称</th>
                <th className="px-4 py-3 text-left font-medium">分类</th>
                <th className="px-4 py-3 text-left font-medium">标准价</th>
                <th className="px-4 py-3 text-left font-medium">会员价</th>
                <th className="px-4 py-3 text-left font-medium">时长</th>
                <th className="px-4 py-3 text-left font-medium">状态</th>
                <th className="px-4 py-3 text-right font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-salon-line dark:divide-zinc-800">
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="px-4 py-3">{row.name}</td>
                  <td className="px-4 py-3">{categoryName(row.categoryId)}</td>
                  <td className="px-4 py-3">¥{row.standardPrice ?? 0}</td>
                  <td className="px-4 py-3">{row.memberPrice !== undefined ? `¥${row.memberPrice}` : '-'}</td>
                  <td className="px-4 py-3">{row.duration !== undefined ? `${row.duration}分钟` : '-'}</td>
                  <td className="px-4 py-3">
                    <Badge tone={row.status === 1 ? 'success' : 'danger'}>
                      {row.status === 1 ? '启用' : '禁用'}
                    </Badge>
                  </td>
                  <td className="space-x-2 px-4 py-3 text-right">
                    {hasPermission('biz:serviceItem:edit') ? (
                      <Button onClick={() => void openEdit(row.id)} size="sm" variant="secondary">
                        编辑
                      </Button>
                    ) : null}
                    {hasPermission('biz:serviceItem:delete') ? (
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
        title={editId ? '编辑项目' : '新增项目'}
      >
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="项目名称" required>
            <Input
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              value={form.name}
            />
          </Field>
          <Field label="项目分类">
            <Select
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  categoryId: e.target.value === '' ? undefined : e.target.value,
                }))
              }
              value={form.categoryId !== undefined ? String(form.categoryId) : ''}
            >
              <option value="">暂无分类</option>
              {categories.map((c) => (
                <option key={c.id} value={String(c.id)}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="标准价格" required>
            <Input
              onChange={(e) => setNum('standardPrice', e.target.value)}
              type="number"
              step="0.01"
              value={form.standardPrice ?? 0}
            />
          </Field>
          <Field label="会员价格">
            <Input
              onChange={(e) => setNum('memberPrice', e.target.value)}
              type="number"
              step="0.01"
              value={form.memberPrice ?? ''}
            />
          </Field>
          <Field label="服务时长(分钟)">
            <Input
              onChange={(e) => setNum('duration', e.target.value)}
              type="number"
              value={form.duration ?? ''}
            />
          </Field>
          <Field label="是否参与折扣">
            <Select
              onChange={(e) => setForm((f) => ({ ...f, discountable: Number(e.target.value) }))}
              value={form.discountable ?? 1}
            >
              <option value={1}>参与</option>
              <option value={0}>不参与</option>
            </Select>
          </Field>
          <Field label="是否计算提成">
            <Select
              onChange={(e) => setForm((f) => ({ ...f, commissionable: Number(e.target.value) }))}
              value={form.commissionable ?? 1}
            >
              <option value={1}>计算</option>
              <option value={0}>不计算</option>
            </Select>
          </Field>
          <Field label="排序">
            <Input
              onChange={(e) => setNum('sort', e.target.value)}
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
          <Field label="备注">
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
          void serviceItemApi.remove(confirmIds).then(async () => {
            setConfirmIds(null);
            await load();
          });
        }}
        open={Boolean(confirmIds)}
        title="确认删除项目"
      />
    </div>
  );
}
