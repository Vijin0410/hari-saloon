import { getDictText } from '@/shared/lib/dict';
import { useCallback, useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Search, Trash2 } from 'lucide-react';
import { Controller, useForm } from 'react-hook-form';
import { rechargeActivityApi } from '@/shared/api/modules/rechargeApi';
import type { RechargeActivityFormPayload, RechargeActivityPageVO } from '@/features/recharge/model/rechargeTypes';
import { rechargeActivityFormSchema, type RechargeActivityFormValues } from '@/features/recharge/model/rechargeSchemas';
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
import { formatCurrency, normalizeNumber } from '@/shared/lib/format';
import { useAuthStore } from '@/store/useAuthStore';

/** 金额输入中间态正则：允许 "100" / "100." / "100.5" / "100.55" */
const DECIMAL_RE = /^\d{1,9}(\.\d{0,2})?$/;
/** 整数输入中间态正则 */
const INT_RE = /^\d{1,9}$/;

const PAGE_SIZE = 10;

function defaultValues(): RechargeActivityFormValues {
  return {
    name: '',
    thresholdAmount: '',
    giftAmount: '',
    startTime: '',
    endTime: '',
    sort: '',
    status: 1,
    remark: '',
  };
}

/** 提交转换：按天生效（开始=当天 00:00:00，结束=当天 23:59:59） */
function toPayload(v: RechargeActivityFormValues): RechargeActivityFormPayload {
  return {
    name: v.name.trim(),
    thresholdAmount: Number(v.thresholdAmount) || 0,
    giftAmount: Number(v.giftAmount) || 0,
    startTime: v.startTime ? `${v.startTime} 00:00:00` : null,
    endTime: v.endTime ? `${v.endTime} 23:59:59` : null,
    sort: v.sort ? Number(v.sort) : 0,
    status: v.status,
    remark: v.remark?.trim() || undefined,
  };
}

function toFormValues(p: RechargeActivityFormPayload): RechargeActivityFormValues {
  return {
    name: p.name ?? '',
    thresholdAmount: p.thresholdAmount != null ? String(p.thresholdAmount) : '',
    giftAmount: p.giftAmount != null ? String(p.giftAmount) : '',
    startTime: p.startTime ? p.startTime.split(' ')[0] : '',
    endTime: p.endTime ? p.endTime.split(' ')[0] : '',
    sort: p.sort != null ? String(p.sort) : '',
    status: normalizeNumber(p.status, 1) as 0 | 1,
    remark: p.remark ?? '',
  };
}

type FormMode = 'create' | 'edit';

function RechargeActivityFormDialog({
  mode,
  open,
  editId,
  onClose,
  onSaved,
}: {
  mode: FormMode;
  open: boolean;
  editId: string | null;
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
  } = useForm<RechargeActivityFormValues>({
    resolver: zodResolver(rechargeActivityFormSchema),
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
    if (!editId) {
      return;
    }
    let active = true;
    setLoadingForm(true);
    rechargeActivityApi
      .form(editId)
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
  }, [mode, open, editId, reset]);

  async function handleSave(values: RechargeActivityFormValues): Promise<void> {
    setSubmitLoading(true);
    try {
      const payload = toPayload(values);
      if (mode === 'create') {
        await rechargeActivityApi.create(payload);
      } else if (editId) {
        await rechargeActivityApi.update(editId, payload);
      }
      onSaved();
      onClose();
    } finally {
      setSubmitLoading(false);
    }
  }

  return (
    <Modal
      description="配置充 X 送 Y 档位；命中门槛最高档的活动赠送将冻结至次月。"
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
      title={mode === 'create' ? '新增充值活动' : '编辑充值活动'}
    >
      {loadingForm ? (
        <PageLoading />
      ) : (
        <form className="grid gap-3 md:grid-cols-2" onSubmit={handleSubmit(handleSave)}>
          <Field error={errors.name?.message} label="活动名称" required>
            <Input invalid={Boolean(errors.name)} placeholder="如：充500送50" {...register('name')} />
          </Field>
          <Field label="排序">
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
          <Field error={errors.thresholdAmount?.message} label="充值门槛（满）" required>
            <Controller
              control={control}
              name="thresholdAmount"
              render={({ field }) => (
                <Input
                  inputMode="decimal"
                  invalid={Boolean(errors.thresholdAmount)}
                  placeholder="如：500"
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
          <Field error={errors.giftAmount?.message} label="赠送金额（送）" required>
            <Controller
              control={control}
              name="giftAmount"
              render={({ field }) => (
                <Input
                  inputMode="decimal"
                  invalid={Boolean(errors.giftAmount)}
                  placeholder="如：50"
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
          <Field label="生效日期（空=立即）">
            <Input type="date" {...register('startTime')} />
          </Field>
          <Field label="失效日期（空=长期）">
            <Input type="date" {...register('endTime')} />
          </Field>
          <Field label="状态">
            <Select {...register('status', { valueAsNumber: true })}>
              <option value={1}>启用</option>
              <option value={0}>禁用</option>
            </Select>
          </Field>
          <Field className="md:col-span-2" label="备注">
            <Input placeholder="活动备注（可选）" {...register('remark')} />
          </Field>
          <button className="hidden" type="submit" />
        </form>
      )}
    </Modal>
  );
}

export function RechargeActivityPage() {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const [rows, setRows] = useState<RechargeActivityPageVO[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [pageNum, setPageNum] = useState(1);
  const [keyword, setKeyword] = useState('');
  const debounced = useDebounce(keyword, 300);
  const [editMode, setEditMode] = useState<FormMode | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [confirmIds, setConfirmIds] = useState<string[] | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await rechargeActivityApi.list({
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

  const columns: TableColumn<RechargeActivityPageVO>[] = [
    {
      title: '活动名称',
      render: (r) => <span className="font-medium">{r.name}</span>,
    },
    {
      title: '档位',
      render: (r) => (
        <span>
          充 {formatCurrency(r.thresholdAmount)} 送 {formatCurrency(r.giftAmount)}
        </span>
      ),
    },
    {
      title: '生效/失效',
      render: (r) => (
        <span className="text-zinc-500">
          {`${r.startTime ? r.startTime.split(' ')[0] : '立即'} ~ ${r.endTime ? r.endTime.split(' ')[0] : '长期'}`}
        </span>
      ),
    },
    {
      title: '状态',
      render: (r) => (
        <Badge tone={r.status === 1 ? 'success' : 'danger'}>{getDictText(r.status_text)}</Badge>
      ),
    },
    {
      title: '操作',
      align: 'right',
      render: (r) => (
        <div className="flex justify-end gap-2">
          {hasPermission('biz:rechargeActivity:edit') ? (
            <Button
              onClick={() => {
                setEditMode('edit');
                setEditId(String(r.id));
              }}
              size="sm"
              variant="secondary"
            >
              编辑
            </Button>
          ) : null}
          {hasPermission('biz:rechargeActivity:delete') ? (
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
          <h1 className="text-xl font-semibold">充值活动</h1>
          <p className="text-sm text-zinc-500">配置充 X 送 Y 档位；充值时自动匹配门槛最高档，活动赠送冻结至次月。</p>
        </div>
        {hasPermission('biz:rechargeActivity:add') ? (
          <Button
            icon={<Plus className="size-4" />}
            onClick={() => {
              setEditMode('create');
              setEditId(null);
            }}
          >
            新增活动
          </Button>
        ) : null}
      </div>

      <div className="rounded-lg border border-salon-line bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
            <Input
              className="pl-9"
              clearable
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  void load();
                }
              }}
              placeholder="活动名称"
              value={keyword}
            />
          </div>
          <Button className="lg:w-24" icon={<Search className="size-4" />} onClick={load} variant="secondary">
            查询
          </Button>
        </div>
      </div>

      <Table
        columns={columns}
        data={rows}
        empty={<EmptyState title="暂无活动" description="还未配置任何充值活动。" />}
        loading={loading}
        rowKey={(r) => r.id}
      />

      <Pagination pageNum={pageNum} pageSize={PAGE_SIZE} total={total} onChange={setPageNum} />

      <RechargeActivityFormDialog
        editId={editId}
        mode={editMode ?? 'create'}
        onClose={() => {
          setEditMode(null);
          setEditId(null);
        }}
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
          void rechargeActivityApi.remove(confirmIds).then(async () => {
            setConfirmIds(null);
            await load();
          });
        }}
        open={Boolean(confirmIds)}
        title="确认删除活动"
      />
    </div>
  );
}
