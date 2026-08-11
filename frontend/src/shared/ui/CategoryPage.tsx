import { useCallback, useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Search, Trash2 } from 'lucide-react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import type { EntityId } from '@/features/system/model/systemTypes';
import type { PageData } from '@/types';
import { Badge } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';
import { EmptyState } from '@/shared/ui/EmptyState';
import { Field } from '@/shared/ui/Field';
import { Input } from '@/shared/ui/Input';
import { Modal } from '@/shared/ui/Modal';
import { PageLoading } from '@/shared/ui/PageLoading';
import { Pagination } from '@/shared/ui/Pagination';
import { Select } from '@/shared/ui/Select';
import { Table, type TableColumn } from '@/shared/ui/Table';
import { useDebounce } from '@/shared/hooks/useDebounce';
import { normalizeNumber } from '@/shared/lib/format';
import { useAuthStore } from '@/store/useAuthStore';

/**
 * 通用分类管理页：服务项目分类 / 商品分类共享。
 * 通过 api + perm 参数化，消除两页 90% 重复代码。
 * 含 zod 表单校验、数字字段中间态、Table + Pagination、空值「暂无」。
 */

const INT_RE = /^\d{1,9}$/;
const PAGE_SIZE = 10;

export interface CategoryVO {
  id: EntityId;
  name: string;
  sort?: number;
  status?: number;
  remark?: string;
  createTime?: string;
}

export interface CategoryFormPayload {
  id?: EntityId;
  name: string;
  sort?: number;
  status?: number;
  remark?: string;
}

export interface CategoryPageQuery {
  pageNum: number;
  pageSize: number;
  name?: string;
  status?: number;
}

export interface CategoryApi {
  list(params: CategoryPageQuery): Promise<PageData<CategoryVO>>;
  form(id: EntityId): Promise<CategoryFormPayload>;
  create(payload: CategoryFormPayload): Promise<EntityId>;
  update(id: EntityId, payload: CategoryFormPayload): Promise<void>;
  remove(ids: EntityId[]): Promise<void>;
}

export interface CategoryPageProps {
  title: string;
  description: string;
  api: CategoryApi;
  addPerm: string;
  editPerm: string;
  deletePerm: string;
  emptyTitle?: string;
  emptyDescription?: string;
}

const categoryFormSchema = z.object({
  name: z.string().trim().min(1, '分类名称不能为空'),
  sort: z
    .union([z.literal(''), z.string().trim().regex(/^\d{1,9}$/, '请输入正整数')])
    .optional(),
  status: z.union([z.literal(0), z.literal(1)]),
  remark: z.string().trim().optional(),
});

type CategoryFormValues = z.infer<typeof categoryFormSchema>;

function defaultValues(): CategoryFormValues {
  return { name: '', sort: '', status: 1, remark: '' };
}

function toFormValues(p: CategoryFormPayload): CategoryFormValues {
  return {
    name: p.name ?? '',
    sort: p.sort != null ? String(p.sort) : '',
    status: normalizeNumber(p.status, 1) as 0 | 1,
    remark: p.remark ?? '',
  };
}

function toPayload(v: CategoryFormValues): CategoryFormPayload {
  return {
    name: v.name.trim(),
    sort: v.sort ? Number(v.sort) : 0,
    status: v.status,
    remark: v.remark?.trim() || undefined,
  };
}

type FormMode = 'create' | 'edit';

function CategoryFormDialog({
  mode,
  open,
  categoryId,
  api,
  onClose,
  onSaved,
}: {
  mode: FormMode;
  open: boolean;
  categoryId: EntityId | null;
  api: CategoryApi;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [loadingForm, setLoadingForm] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const {
    control,
    formState: { errors },
    handleSubmit,
    register,
    reset,
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: defaultValues(),
  });

  useEffect(() => {
    if (!open) {
      return;
    }
    if (mode === 'create') {
      reset(defaultValues());
      return;
    }
    if (!categoryId) {
      return;
    }
    let active = true;
    setLoadingForm(true);
    api
      .form(categoryId)
      .then((payload) => {
        if (active) {
          reset(toFormValues(payload));
        }
      })
      .finally(() => {
        if (active) {
          setLoadingForm(false);
        }
      });
    return () => {
      active = false;
    };
  }, [mode, open, categoryId, api, reset]);

  async function handleSave(values: CategoryFormValues): Promise<void> {
    setSubmitLoading(true);
    try {
      const payload = toPayload(values);
      if (mode === 'create') {
        await api.create(payload);
      } else if (categoryId) {
        await api.update(categoryId, payload);
      }
      onSaved();
      onClose();
    } finally {
      setSubmitLoading(false);
    }
  }

  return (
    <Modal
      description={mode === 'create' ? '新建分类。' : '修改分类信息。'}
      footer={
        <>
          <Button onClick={onClose} variant="secondary">
            取消
          </Button>
          <Button loading={submitLoading} onClick={handleSubmit(handleSave)}>
            保存
          </Button>
        </>
      }
      onClose={onClose}
      open={open}
      title={mode === 'create' ? '新增分类' : '编辑分类'}
    >
      {loadingForm ? (
        <PageLoading />
      ) : (
        <form className="grid gap-3 md:grid-cols-2" onSubmit={handleSubmit(handleSave)}>
          <Field error={errors.name?.message} label="分类名称" required>
            <Input invalid={Boolean(errors.name)} placeholder="如：剪发" {...register('name')} />
          </Field>
          <Field error={errors.sort?.message} label="排序">
            <Controller
              control={control}
              name="sort"
              render={({ field }) => (
                <Input
                  inputMode="numeric"
                  invalid={Boolean(errors.sort)}
                  placeholder="数字越小越靠前"
                  value={field.value ?? ''}
                  onBlur={field.onBlur}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === '' || INT_RE.test(v)) {
                      field.onChange(v);
                    }
                  }}
                />
              )}
            />
          </Field>
          <Field label="状态">
            <Select {...register('status', { valueAsNumber: true })}>
              <option value={1}>启用</option>
              <option value={0}>禁用</option>
            </Select>
          </Field>
          <Field className="md:col-span-2" label="备注">
            <Input placeholder="分类备注（可选）" {...register('remark')} />
          </Field>
          <button className="hidden" type="submit" />
        </form>
      )}
    </Modal>
  );
}

export function CategoryPage({
  title,
  description,
  api,
  addPerm,
  editPerm,
  deletePerm,
  emptyTitle = '暂无分类',
  emptyDescription = '还未配置任何分类。',
}: CategoryPageProps) {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const [rows, setRows] = useState<CategoryVO[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [pageNum, setPageNum] = useState(1);
  const [keyword, setKeyword] = useState('');
  const debounced = useDebounce(keyword, 300);
  const [editMode, setEditMode] = useState<FormMode | null>(null);
  const [editId, setEditId] = useState<EntityId | null>(null);
  const [confirmIds, setConfirmIds] = useState<EntityId[] | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.list({
        pageNum,
        pageSize: PAGE_SIZE,
        name: debounced || undefined,
      });
      setRows(data.list ?? []);
      setTotal(data.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, [api, pageNum, debounced]);

  useEffect(() => {
    void load();
  }, [load]);

  function openCreate(): void {
    setEditMode('create');
    setEditId(null);
  }

  function openEdit(id: EntityId): void {
    setEditMode('edit');
    setEditId(id);
  }

  function closeEdit(): void {
    setEditMode(null);
    setEditId(null);
  }

  const columns: TableColumn<CategoryVO>[] = [
    {
      title: '分类名称',
      render: (r) => <span className="font-medium text-salon-ink dark:text-zinc-100">{r.name}</span>,
    },
    { title: '排序', align: 'right', render: (r) => r.sort ?? 0 },
    {
      title: '状态',
      render: (r) => (
        <Badge tone={r.status === 1 ? 'success' : 'danger'}>
          {r.status === 1 ? '启用' : '禁用'}
        </Badge>
      ),
    },
    {
      title: '操作',
      align: 'right',
      render: (r) => (
        <div className="flex justify-end gap-2">
          {hasPermission(editPerm) ? (
            <Button onClick={() => openEdit(r.id)} size="sm" variant="secondary">
              编辑
            </Button>
          ) : null}
          {hasPermission(deletePerm) ? (
            <Button
              icon={<Trash2 className="size-4" />}
              onClick={() => setConfirmIds([r.id])}
              size="sm"
              variant="secondary"
            >
              删除
            </Button>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{title}</h1>
          <p className="text-sm text-zinc-500">{description}</p>
        </div>
        {hasPermission(addPerm) ? (
          <Button icon={<Plus className="size-4" />} onClick={openCreate}>
            新增分类
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
              placeholder="分类名称"
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

      <Table
        columns={columns}
        data={rows}
        rowKey={(r) => r.id}
        loading={loading}
        empty={<EmptyState title={emptyTitle} description={emptyDescription} />}
      />

      <Pagination pageNum={pageNum} pageSize={PAGE_SIZE} total={total} onChange={setPageNum} />

      <CategoryFormDialog
        api={api}
        categoryId={editId}
        mode={editMode ?? 'create'}
        onClose={closeEdit}
        onSaved={() => void load()}
        open={editMode !== null}
      />

      <ConfirmDialog
        danger
        description="删除后不可恢复。"
        onCancel={() => setConfirmIds(null)}
        onConfirm={() => {
          if (!confirmIds) {
            return;
          }
          void api.remove(confirmIds).then(async () => {
            setConfirmIds(null);
            await load();
          });
        }}
        open={Boolean(confirmIds)}
        title="确认删除分类"
      />
    </div>
  );
}
