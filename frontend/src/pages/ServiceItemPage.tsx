import { useCallback, useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { Controller, useForm } from 'react-hook-form';
import { serviceCategoryApi, serviceItemApi } from '@/shared/api/modules/serviceApi';
import type {
  ServiceCategoryOption,
  ServiceItemFormPayload,
  ServiceItemPageVO,
} from '@/features/service/model/serviceTypes';
import { serviceItemFormSchema, type ServiceItemFormValues } from '@/features/service/model/serviceSchemas';
import { Badge } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';
import { Drawer } from '@/shared/ui/Drawer';
import { EmptyState } from '@/shared/ui/EmptyState';
import { Field } from '@/shared/ui/Field';
import { Input } from '@/shared/ui/Input';
import { Modal } from '@/shared/ui/Modal';
import { PageLoading } from '@/shared/ui/PageLoading';
import { Pagination } from '@/shared/ui/Pagination';
import { Select } from '@/shared/ui/Select';
import { StatCard } from '@/shared/ui/StatCard';
import { Table, type TableColumn } from '@/shared/ui/Table';
import { useDebounce } from '@/shared/hooks/useDebounce';
import { formatCurrency, normalizeNumber } from '@/shared/lib/format';
import { useAuthStore } from '@/store/useAuthStore';

/** 金额输入中间态正则：允许 "100" / "100." / "100.5" / "100.55" */
const DECIMAL_RE = /^\d{1,9}(\.\d{0,2})?$/;
/** 整数输入中间态正则：允许 "0" / "30" */
const INT_RE = /^\d{1,9}$/;

const PAGE_SIZE = 10;

function defaultValues(): ServiceItemFormValues {
  return {
    name: '',
    categoryId: '',
    standardPrice: '',
    memberPrice: '',
    duration: '',
    discountable: 1,
    commissionable: 1,
    sort: '',
    status: 1,
    remark: '',
  };
}

function toFormValues(p: ServiceItemFormPayload): ServiceItemFormValues {
  return {
    name: p.name ?? '',
    categoryId: p.categoryId != null ? String(p.categoryId) : '',
    standardPrice: p.standardPrice != null ? String(p.standardPrice) : '',
    memberPrice: p.memberPrice != null ? String(p.memberPrice) : '',
    duration: p.duration != null ? String(p.duration) : '',
    discountable: normalizeNumber(p.discountable, 1) as 0 | 1,
    commissionable: normalizeNumber(p.commissionable, 1) as 0 | 1,
    sort: p.sort != null ? String(p.sort) : '',
    status: normalizeNumber(p.status, 1) as 0 | 1,
    remark: p.remark ?? '',
  };
}

function toPayload(v: ServiceItemFormValues): ServiceItemFormPayload {
  return {
    name: v.name.trim(),
    categoryId: v.categoryId?.trim() || undefined,
    standardPrice: Number(v.standardPrice) || 0,
    memberPrice: v.memberPrice ? Number(v.memberPrice) : undefined,
    duration: v.duration ? Number(v.duration) : undefined,
    discountable: v.discountable,
    commissionable: v.commissionable,
    sort: v.sort ? Number(v.sort) : 0,
    status: v.status,
    remark: v.remark?.trim() || undefined,
  };
}

type FormMode = 'create' | 'edit';

/** 新增/编辑表单弹窗：useForm + zod，数字字段用 Controller + 正则承载中间态。 */
function ServiceItemFormDialog({
  mode,
  open,
  itemId,
  categoryOptions,
  onClose,
  onSaved,
}: {
  mode: FormMode;
  open: boolean;
  itemId: string | null;
  categoryOptions: ServiceCategoryOption[];
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
  } = useForm<ServiceItemFormValues>({
    resolver: zodResolver(serviceItemFormSchema),
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
    if (!itemId) {
      return;
    }
    let active = true;
    setLoadingForm(true);
    serviceItemApi
      .form(itemId)
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
  }, [mode, open, itemId, reset]);

  async function handleSave(values: ServiceItemFormValues): Promise<void> {
    setSubmitLoading(true);
    try {
      const payload = toPayload(values);
      if (mode === 'create') {
        await serviceItemApi.create(payload);
      } else if (itemId) {
        await serviceItemApi.update(itemId, payload);
      }
      onSaved();
      onClose();
    } finally {
      setSubmitLoading(false);
    }
  }

  return (
    <Modal
      description={mode === 'create' ? '新建服务项目，用于收银开单。' : '修改服务项目价格与规则。'}
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
      title={mode === 'create' ? '新增项目' : '编辑项目'}
    >
      {loadingForm ? (
        <PageLoading />
      ) : (
        <form className="grid gap-3 md:grid-cols-2" onSubmit={handleSubmit(handleSave)}>
          <Field error={errors.name?.message} label="项目名称" required>
            <Input invalid={Boolean(errors.name)} placeholder="如：洗剪吹" {...register('name')} />
          </Field>
          <Field label="项目分类">
            <Select {...register('categoryId')}>
              <option value="">暂无分类</option>
              {categoryOptions.map((c) => (
                <option key={c.id} value={String(c.id)}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field error={errors.standardPrice?.message} label="标准价格" required>
            <Controller
              control={control}
              name="standardPrice"
              render={({ field }) => (
                <Input
                  inputMode="decimal"
                  invalid={Boolean(errors.standardPrice)}
                  placeholder="如：88"
                  value={field.value ?? ''}
                  onBlur={field.onBlur}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === '' || DECIMAL_RE.test(v)) {
                      field.onChange(v);
                    }
                  }}
                />
              )}
            />
          </Field>
          <Field error={errors.memberPrice?.message} label="会员价格">
            <Controller
              control={control}
              name="memberPrice"
              render={({ field }) => (
                <Input
                  inputMode="decimal"
                  invalid={Boolean(errors.memberPrice)}
                  placeholder="未设置则无会员价"
                  value={field.value ?? ''}
                  onBlur={field.onBlur}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === '' || DECIMAL_RE.test(v)) {
                      field.onChange(v);
                    }
                  }}
                />
              )}
            />
          </Field>
          <Field error={errors.duration?.message} label="服务时长(分钟)">
            <Controller
              control={control}
              name="duration"
              render={({ field }) => (
                <Input
                  inputMode="numeric"
                  invalid={Boolean(errors.duration)}
                  placeholder="如：30"
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
          <Field label="是否参与折扣">
            <Select {...register('discountable', { valueAsNumber: true })}>
              <option value={1}>参与</option>
              <option value={0}>不参与</option>
            </Select>
          </Field>
          <Field label="是否计算提成">
            <Select {...register('commissionable', { valueAsNumber: true })}>
              <option value={1}>计算</option>
              <option value={0}>不计算</option>
            </Select>
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
            <Input placeholder="项目备注（可选）" {...register('remark')} />
          </Field>
          <button className="hidden" type="submit" />
        </form>
      )}
    </Modal>
  );
}

/** 只读详情抽屉：StatCard 突出价格，Card 展示规则。 */
function ServiceItemDetailDrawer({
  row,
  categoryName,
  hasEditPermission,
  onClose,
  onEdit,
}: {
  row: ServiceItemPageVO | null;
  categoryName: (id?: number | string) => string;
  hasEditPermission: boolean;
  onClose: () => void;
  onEdit: (id: string) => void;
}) {
  return (
    <Drawer
      footer={
        hasEditPermission && row ? (
          <Button icon={<Pencil className="size-4" />} onClick={() => onEdit(String(row.id))}>
            编辑
          </Button>
        ) : undefined
      }
      onClose={onClose}
      open={row !== null}
      title="项目详情"
      width="520px"
    >
      {row ? (
        <div className="space-y-4">
          <StatCard
            label="标准价格"
            value={formatCurrency(row.standardPrice)}
            tone="accent"
            hint={`分类：${categoryName(row.categoryId)}`}
            extra={
              <Badge tone={row.status === 1 ? 'success' : 'danger'}>
                {row.status === 1 ? '启用' : '禁用'}
              </Badge>
            }
          />
          <Card title="价格与规则">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-md bg-stone-50 p-3 dark:bg-zinc-900">
                <div className="text-xs text-zinc-500 dark:text-zinc-400">会员价</div>
                <div className="mt-1 text-lg font-semibold text-salon-ink dark:text-zinc-100">
                  {row.memberPrice != null ? formatCurrency(row.memberPrice) : '暂无'}
                </div>
              </div>
              <div className="rounded-md bg-stone-50 p-3 dark:bg-zinc-900">
                <div className="text-xs text-zinc-500 dark:text-zinc-400">服务时长</div>
                <div className="mt-1 text-lg font-semibold text-salon-ink dark:text-zinc-100">
                  {row.duration != null ? `${row.duration} 分钟` : '暂无'}
                </div>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-salon-line pt-3 dark:border-zinc-800">
              <span className="text-xs text-zinc-500 dark:text-zinc-400">业务规则</span>
              <Badge tone={row.discountable === 1 ? 'success' : 'neutral'}>
                {row.discountable === 1 ? '参与折扣' : '不参与折扣'}
              </Badge>
              <Badge tone={row.commissionable === 1 ? 'success' : 'neutral'}>
                {row.commissionable === 1 ? '计算提成' : '不计算提成'}
              </Badge>
            </div>
          </Card>
        </div>
      ) : null}
    </Drawer>
  );
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
  const [editMode, setEditMode] = useState<FormMode | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [detailRow, setDetailRow] = useState<ServiceItemPageVO | null>(null);
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
        pageSize: PAGE_SIZE,
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

  function openCreate(): void {
    setEditMode('create');
    setEditId(null);
  }

  function openEdit(id: string): void {
    setEditMode('edit');
    setEditId(id);
  }

  function closeEdit(): void {
    setEditMode(null);
    setEditId(null);
  }

  function openDetail(row: ServiceItemPageVO): void {
    setDetailRow(row);
  }

  function openEditFromDetail(id: string): void {
    setDetailRow(null);
    openEdit(id);
  }

  const columns: TableColumn<ServiceItemPageVO>[] = [
    {
      title: '项目名称',
      render: (r) => (
        <button
          className="font-medium text-salon-ink hover:text-salon-accent dark:text-zinc-100"
          onClick={() => openDetail(r)}
          type="button"
        >
          {r.name}
        </button>
      ),
    },
    { title: '分类', render: (r) => categoryName(r.categoryId) },
    { title: '标准价', align: 'right', render: (r) => formatCurrency(r.standardPrice) },
    {
      title: '会员价',
      align: 'right',
      render: (r) => (r.memberPrice != null ? formatCurrency(r.memberPrice) : '暂无'),
    },
    {
      title: '时长',
      align: 'right',
      render: (r) => (r.duration != null ? `${r.duration} 分钟` : '暂无'),
    },
    {
      title: '折扣/提成',
      render: (r) => (
        <div className="flex flex-wrap gap-1">
          <Badge tone={r.discountable === 1 ? 'success' : 'neutral'}>折扣</Badge>
          <Badge tone={r.commissionable === 1 ? 'success' : 'neutral'}>提成</Badge>
        </div>
      ),
    },
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
          <Button onClick={() => openDetail(r)} size="sm" variant="secondary">
            详情
          </Button>
          {hasPermission('biz:serviceItem:edit') ? (
            <Button onClick={() => openEdit(String(r.id))} size="sm" variant="secondary">
              编辑
            </Button>
          ) : null}
          {hasPermission('biz:serviceItem:delete') ? (
            <Button
              icon={<Trash2 className="size-4" />}
              onClick={() => setConfirmIds([String(r.id)])}
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
          <h1 className="text-xl font-semibold">服务项目</h1>
          <p className="text-sm text-zinc-500">
            维护服务项目的价格、时长与折扣提成规则，用于收银开单。
          </p>
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

      <Table
        columns={columns}
        data={rows}
        rowKey={(r) => r.id}
        loading={loading}
        empty={<EmptyState title="暂无项目" description="还未配置任何服务项目。" />}
      />

      <Pagination pageNum={pageNum} pageSize={PAGE_SIZE} total={total} onChange={setPageNum} />

      <ServiceItemFormDialog
        categoryOptions={categories}
        itemId={editId}
        mode={editMode ?? 'create'}
        onClose={closeEdit}
        onSaved={() => void load()}
        open={editMode !== null}
      />

      <ServiceItemDetailDrawer
        categoryName={categoryName}
        hasEditPermission={hasPermission('biz:serviceItem:edit')}
        onClose={() => setDetailRow(null)}
        onEdit={openEditFromDetail}
        row={detailRow}
      />

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
