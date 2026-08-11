import { useCallback, useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { Controller, useForm } from 'react-hook-form';
import { goodsApi, goodsCategoryApi } from '@/shared/api/modules/goodsApi';
import type {
  GoodsCategoryOption,
  GoodsFormPayload,
  GoodsPageVO,
} from '@/features/goods/model/goodsTypes';
import { goodsFormSchema, type GoodsFormValues } from '@/features/goods/model/goodsSchemas';
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
/** 库存预警阈值：低于等于该值显示「低库存」。后续若商品有预警库存字段，改为对比字段。 */
const LOW_STOCK_THRESHOLD = 5;

const PAGE_SIZE = 10;

function defaultValues(): GoodsFormValues {
  return {
    name: '',
    categoryId: '',
    barcode: '',
    salePrice: '',
    costPrice: '',
    stockQuantity: '',
    discountable: 1,
    commissionable: 1,
    sort: '',
    status: 1,
    remark: '',
  };
}

function toFormValues(p: GoodsFormPayload): GoodsFormValues {
  return {
    name: p.name ?? '',
    categoryId: p.categoryId != null ? String(p.categoryId) : '',
    barcode: p.barcode ?? '',
    salePrice: p.salePrice != null ? String(p.salePrice) : '',
    costPrice: p.costPrice != null ? String(p.costPrice) : '',
    stockQuantity: p.stockQuantity != null ? String(p.stockQuantity) : '',
    discountable: normalizeNumber(p.discountable, 1) as 0 | 1,
    commissionable: normalizeNumber(p.commissionable, 1) as 0 | 1,
    sort: p.sort != null ? String(p.sort) : '',
    status: normalizeNumber(p.status, 1) as 0 | 1,
    remark: p.remark ?? '',
  };
}

function toPayload(v: GoodsFormValues): GoodsFormPayload {
  return {
    name: v.name.trim(),
    categoryId: v.categoryId?.trim() || undefined,
    barcode: v.barcode?.trim() || undefined,
    salePrice: Number(v.salePrice) || 0,
    costPrice: v.costPrice ? Number(v.costPrice) : undefined,
    stockQuantity: v.stockQuantity ? Number(v.stockQuantity) : undefined,
    discountable: v.discountable,
    commissionable: v.commissionable,
    sort: v.sort ? Number(v.sort) : 0,
    status: v.status,
    remark: v.remark?.trim() || undefined,
  };
}

type FormMode = 'create' | 'edit';

/** 新增/编辑表单弹窗：useForm + zod，数字字段用 Controller + 正则承载中间态。 */
function GoodsFormDialog({
  mode,
  open,
  goodsId,
  categoryOptions,
  onClose,
  onSaved,
}: {
  mode: FormMode;
  open: boolean;
  goodsId: string | null;
  categoryOptions: GoodsCategoryOption[];
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
  } = useForm<GoodsFormValues>({
    resolver: zodResolver(goodsFormSchema),
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
    if (!goodsId) {
      return;
    }
    let active = true;
    setLoadingForm(true);
    goodsApi
      .form(goodsId)
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
  }, [mode, open, goodsId, reset]);

  async function handleSave(values: GoodsFormValues): Promise<void> {
    setSubmitLoading(true);
    try {
      const payload = toPayload(values);
      if (mode === 'create') {
        await goodsApi.create(payload);
      } else if (goodsId) {
        await goodsApi.update(goodsId, payload);
      }
      onSaved();
      onClose();
    } finally {
      setSubmitLoading(false);
    }
  }

  return (
    <Modal
      description={mode === 'create' ? '新建商品，用于收银开单销售。' : '修改商品价格与库存。'}
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
      title={mode === 'create' ? '新增商品' : '编辑商品'}
    >
      {loadingForm ? (
        <PageLoading />
      ) : (
        <form className="grid gap-3 md:grid-cols-2" onSubmit={handleSubmit(handleSave)}>
          <Field error={errors.name?.message} label="商品名称" required>
            <Input invalid={Boolean(errors.name)} placeholder="如：洗发水" {...register('name')} />
          </Field>
          <Field label="商品分类">
            <Select {...register('categoryId')}>
              <option value="">暂无分类</option>
              {categoryOptions.map((c) => (
                <option key={c.id} value={String(c.id)}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="商品条码">
            <Input placeholder="如：6901234567890" {...register('barcode')} />
          </Field>
          <Field error={errors.salePrice?.message} label="销售价格" required>
            <Controller
              control={control}
              name="salePrice"
              render={({ field }) => (
                <Input
                  inputMode="decimal"
                  invalid={Boolean(errors.salePrice)}
                  placeholder="如：68"
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
          <Field error={errors.costPrice?.message} label="成本价">
            <Controller
              control={control}
              name="costPrice"
              render={({ field }) => (
                <Input
                  inputMode="decimal"
                  invalid={Boolean(errors.costPrice)}
                  placeholder="选填，仅财务可见"
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
          <Field error={errors.stockQuantity?.message} label="库存数量">
            <Controller
              control={control}
              name="stockQuantity"
              render={({ field }) => (
                <Input
                  inputMode="numeric"
                  invalid={Boolean(errors.stockQuantity)}
                  placeholder="如：100"
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
            <Input placeholder="商品备注（可选）" {...register('remark')} />
          </Field>
          <button className="hidden" type="submit" />
        </form>
      )}
    </Modal>
  );
}

/** 只读详情抽屉：StatCard 突出销售价，Card 展示库存与规则。 */
function GoodsDetailDrawer({
  row,
  categoryName,
  hasEditPermission,
  onClose,
  onEdit,
}: {
  row: GoodsPageVO | null;
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
      title="商品详情"
      width="520px"
    >
      {row ? (
        <div className="space-y-4">
          <StatCard
            label="销售价格"
            value={formatCurrency(row.salePrice)}
            tone="accent"
            hint={`分类：${categoryName(row.categoryId)}`}
            extra={
              <Badge tone={row.status === 1 ? 'success' : 'danger'}>
                {row.status === 1 ? '启用' : '禁用'}
              </Badge>
            }
          />
          <Card title="库存与规则">
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-md bg-stone-50 p-3 dark:bg-zinc-900">
                  <div className="text-xs text-zinc-500 dark:text-zinc-400">成本价</div>
                  <div className="mt-1 text-lg font-semibold text-salon-ink dark:text-zinc-100">
                    {row.costPrice != null ? formatCurrency(row.costPrice) : '暂无'}
                  </div>
                </div>
                <div className="rounded-md bg-stone-50 p-3 dark:bg-zinc-900">
                  <div className="text-xs text-zinc-500 dark:text-zinc-400">库存</div>
                  <div className="mt-1 flex items-center gap-1.5">
                    <span className="text-lg font-semibold text-salon-ink dark:text-zinc-100">
                      {row.stockQuantity ?? 0}
                    </span>
                    {(row.stockQuantity ?? 0) <= LOW_STOCK_THRESHOLD ? (
                      <Badge tone="warning">低库存</Badge>
                    ) : null}
                  </div>
                </div>
              </div>
              <div className="rounded-md bg-stone-50 p-3 dark:bg-zinc-900">
                <div className="text-xs text-zinc-500 dark:text-zinc-400">商品条码</div>
                <div className="mt-0.5 text-sm text-salon-ink dark:text-zinc-100">
                  {row.barcode || '暂无'}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 border-t border-salon-line pt-3 dark:border-zinc-800">
                <span className="text-xs text-zinc-500 dark:text-zinc-400">业务规则</span>
                <Badge tone={row.discountable === 1 ? 'success' : 'neutral'}>
                  {row.discountable === 1 ? '参与折扣' : '不参与折扣'}
                </Badge>
                <Badge tone={row.commissionable === 1 ? 'success' : 'neutral'}>
                  {row.commissionable === 1 ? '计算提成' : '不计算提成'}
                </Badge>
              </div>
            </div>
          </Card>
        </div>
      ) : null}
    </Drawer>
  );
}

export function GoodsPage() {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const [rows, setRows] = useState<GoodsPageVO[]>([]);
  const [categories, setCategories] = useState<GoodsCategoryOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [pageNum, setPageNum] = useState(1);
  const [keyword, setKeyword] = useState('');
  const debounced = useDebounce(keyword, 300);
  const [editMode, setEditMode] = useState<FormMode | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [detailRow, setDetailRow] = useState<GoodsPageVO | null>(null);
  const [confirmIds, setConfirmIds] = useState<string[] | null>(null);

  useEffect(() => {
    goodsCategoryApi
      .options()
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await goodsApi.list({
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

  function openDetail(row: GoodsPageVO): void {
    setDetailRow(row);
  }

  function openEditFromDetail(id: string): void {
    setDetailRow(null);
    openEdit(id);
  }

  const columns: TableColumn<GoodsPageVO>[] = [
    {
      title: '商品名称',
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
    { title: '条码', render: (r) => r.barcode || '暂无' },
    { title: '销售价', align: 'right', render: (r) => formatCurrency(r.salePrice) },
    {
      title: '成本价',
      align: 'right',
      render: (r) => (r.costPrice != null ? formatCurrency(r.costPrice) : '暂无'),
    },
    {
      title: '库存',
      align: 'right',
      render: (r) => {
        const stock = r.stockQuantity ?? 0;
        const low = stock <= LOW_STOCK_THRESHOLD;
        return (
          <div className="flex items-center justify-end gap-1">
            <span className={low ? 'font-medium text-rose-600 dark:text-rose-400' : ''}>{stock}</span>
            {low ? <Badge tone="warning">低</Badge> : null}
          </div>
        );
      },
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
          {hasPermission('biz:goods:edit') ? (
            <Button onClick={() => openEdit(String(r.id))} size="sm" variant="secondary">
              编辑
            </Button>
          ) : null}
          {hasPermission('biz:goods:delete') ? (
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
          <h1 className="text-xl font-semibold">商品管理</h1>
          <p className="text-sm text-zinc-500">
            维护商品的价格、条码与库存，用于收银开单销售。
          </p>
        </div>
        {hasPermission('biz:goods:add') ? (
          <Button icon={<Plus className="size-4" />} onClick={openCreate}>
            新增商品
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
              placeholder="商品名称"
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
        empty={<EmptyState title="暂无商品" description="还未配置任何商品。" />}
      />

      <Pagination pageNum={pageNum} pageSize={PAGE_SIZE} total={total} onChange={setPageNum} />

      <GoodsFormDialog
        categoryOptions={categories}
        goodsId={editId}
        mode={editMode ?? 'create'}
        onClose={closeEdit}
        onSaved={() => void load()}
        open={editMode !== null}
      />

      <GoodsDetailDrawer
        categoryName={categoryName}
        hasEditPermission={hasPermission('biz:goods:edit')}
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
          void goodsApi.remove(confirmIds).then(async () => {
            setConfirmIds(null);
            await load();
          });
        }}
        open={Boolean(confirmIds)}
        title="确认删除商品"
      />
    </div>
  );
}
