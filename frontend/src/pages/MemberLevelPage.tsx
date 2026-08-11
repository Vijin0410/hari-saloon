import { useCallback, useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { Controller, useForm } from 'react-hook-form';
import { memberLevelApi } from '@/shared/api/modules/memberApi';
import type {
  MemberLevelFormPayload,
  MemberLevelPageVO,
} from '@/features/member/model/memberTypes';
import { memberLevelFormSchema, type MemberLevelFormValues } from '@/features/member/model/memberSchemas';
import { Badge } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';
import { EmptyState } from '@/shared/ui/EmptyState';
import { Field } from '@/shared/ui/Field';
import { Input } from '@/shared/ui/Input';
import { Modal } from '@/shared/ui/Modal';
import { PageLoading } from '@/shared/ui/PageLoading';
import { Select } from '@/shared/ui/Select';
import { Textarea } from '@/shared/ui/Textarea';
import { useDebounce } from '@/shared/hooks/useDebounce';
import { normalizeNumber } from '@/shared/lib/format';
import { useAuthStore } from '@/store/useAuthStore';

const DECIMAL_RE = /^\d{1,9}(\.\d{0,2})?$/;
const INT_RE = /^\d{1,9}$/;

function defaultValues(): MemberLevelFormValues {
  return {
    name: '',
    levelNo: '1',
    serviceDiscount: '',
    goodsDiscount: '',
    pointRate: '1',
    rechargeGiftRate: '0',
    upgradeThreshold: '',
    rights: '',
    sort: '0',
    status: 1,
    remark: '',
  };
}

function toFormValues(p: MemberLevelFormPayload): MemberLevelFormValues {
  return {
    name: p.name ?? '',
    levelNo: p.levelNo != null ? String(p.levelNo) : '',
    serviceDiscount: p.serviceDiscount != null ? String(p.serviceDiscount) : '',
    goodsDiscount: p.goodsDiscount != null ? String(p.goodsDiscount) : '',
    pointRate: p.pointRate != null ? String(p.pointRate) : '',
    rechargeGiftRate: p.rechargeGiftRate != null ? String(p.rechargeGiftRate) : '',
    upgradeThreshold: p.upgradeThreshold != null ? String(p.upgradeThreshold) : '',
    rights: p.rights ?? '',
    sort: p.sort != null ? String(p.sort) : '0',
    status: normalizeNumber(p.status, 1) as 0 | 1,
    remark: p.remark ?? '',
  };
}

function toPayload(v: MemberLevelFormValues): MemberLevelFormPayload {
  return {
    name: v.name.trim(),
    levelNo: Number(v.levelNo) || 0,
    serviceDiscount: v.serviceDiscount ? Number(v.serviceDiscount) : undefined,
    goodsDiscount: v.goodsDiscount ? Number(v.goodsDiscount) : undefined,
    pointRate: v.pointRate ? Number(v.pointRate) : undefined,
    rechargeGiftRate: v.rechargeGiftRate ? Number(v.rechargeGiftRate) : undefined,
    upgradeThreshold: v.upgradeThreshold ? Number(v.upgradeThreshold) : undefined,
    rights: v.rights?.trim() || undefined,
    sort: v.sort ? Number(v.sort) : 0,
    status: v.status,
    remark: v.remark?.trim() || undefined,
  };
}

/** 折扣 0-1 转中文：0.9 -> 9 折，0.85 -> 8.5 折，1 -> 无折扣 */
function formatDiscount(v?: number): string {
  if (v == null) {
    return '暂无';
  }
  if (v >= 1) {
    return '无折扣';
  }
  const times10 = v * 10;
  return `${times10 % 1 === 0 ? times10 : times10.toFixed(1)} 折`;
}

type FormMode = 'create' | 'edit';

function MemberLevelFormDialog({
  mode,
  open,
  levelId,
  onClose,
  onSaved,
}: {
  mode: FormMode;
  open: boolean;
  levelId: string | null;
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
  } = useForm<MemberLevelFormValues>({
    resolver: zodResolver(memberLevelFormSchema),
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
    if (!levelId) {
      return;
    }
    let active = true;
    setLoadingForm(true);
    memberLevelApi
      .form(levelId)
      .then((p) => {
        if (active) {
          reset(toFormValues(p));
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
  }, [mode, open, levelId, reset]);

  async function handleSave(values: MemberLevelFormValues): Promise<void> {
    setSubmitLoading(true);
    try {
      const payload = toPayload(values);
      if (mode === 'create') {
        await memberLevelApi.create(payload);
      } else if (levelId) {
        await memberLevelApi.update(levelId, payload);
      }
      onSaved();
      onClose();
    } finally {
      setSubmitLoading(false);
    }
  }

  return (
    <Modal
      description={mode === 'create' ? '新建会员等级。' : '修改等级折扣与权益。'}
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
      title={mode === 'create' ? '新增等级' : '编辑等级'}
    >
      {loadingForm ? (
        <PageLoading />
      ) : (
        <form className="grid gap-3 md:grid-cols-2" onSubmit={handleSubmit(handleSave)}>
          <Field error={errors.name?.message} label="等级名称" required>
            <Input invalid={Boolean(errors.name)} placeholder="如：黄金会员" {...register('name')} />
          </Field>
          <Field error={errors.levelNo?.message} label="等级序号" required>
            <Controller
              control={control}
              name="levelNo"
              render={({ field }) => (
                <Input
                  inputMode="numeric"
                  invalid={Boolean(errors.levelNo)}
                  placeholder="数字越小等级越低"
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
          <Field error={errors.serviceDiscount?.message} label="服务折扣(0-1)" hint="0.9 表示 9 折">
            <Controller
              control={control}
              name="serviceDiscount"
              render={({ field }) => (
                <Input
                  inputMode="decimal"
                  invalid={Boolean(errors.serviceDiscount)}
                  placeholder="如：0.9"
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
          <Field error={errors.goodsDiscount?.message} label="商品折扣(0-1)" hint="0.9 表示 9 折">
            <Controller
              control={control}
              name="goodsDiscount"
              render={({ field }) => (
                <Input
                  inputMode="decimal"
                  invalid={Boolean(errors.goodsDiscount)}
                  placeholder="如：0.9"
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
          <Field error={errors.pointRate?.message} label="积分倍率" hint="1.5 表示 1.5 倍积分">
            <Controller
              control={control}
              name="pointRate"
              render={({ field }) => (
                <Input
                  inputMode="decimal"
                  invalid={Boolean(errors.pointRate)}
                  placeholder="如：1.5"
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
          <Field error={errors.rechargeGiftRate?.message} label="充值赠送率" hint="如 0.1 表示充 100 送 10">
            <Controller
              control={control}
              name="rechargeGiftRate"
              render={({ field }) => (
                <Input
                  inputMode="decimal"
                  invalid={Boolean(errors.rechargeGiftRate)}
                  placeholder="如：0.1"
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
          <Field error={errors.upgradeThreshold?.message} label="升级门槛" hint="累计达此值自动升级">
            <Controller
              control={control}
              name="upgradeThreshold"
              render={({ field }) => (
                <Input
                  inputMode="decimal"
                  invalid={Boolean(errors.upgradeThreshold)}
                  placeholder="如：5000"
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
          <Field
            className="md:col-span-2"
            label="专属权益(JSON)"
            hint='如 {"bonus":"生日礼","discount":"每月一次8折"}'
          >
            <Textarea placeholder="JSON 格式，留空则无专属权益" {...register('rights')} />
          </Field>
          <Field className="md:col-span-2" label="备注">
            <Input {...register('remark')} />
          </Field>
          <button className="hidden" type="submit" />
        </form>
      )}
    </Modal>
  );
}

export function MemberLevelPage() {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const [rows, setRows] = useState<MemberLevelPageVO[]>([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const debounced = useDebounce(keyword, 300);
  const [editMode, setEditMode] = useState<FormMode | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [confirmIds, setConfirmIds] = useState<string[] | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await memberLevelApi.list({
        pageNum: 1,
        pageSize: 100,
        name: debounced || undefined,
      });
      setRows(data.list ?? []);
    } finally {
      setLoading(false);
    }
  }, [debounced]);

  useEffect(() => {
    void load();
  }, [load]);

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

  const sortedRows = [...rows].sort((a, b) => (a.levelNo ?? 0) - (b.levelNo ?? 0));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">会员等级</h1>
          <p className="text-sm text-zinc-500">配置等级折扣、积分倍率、充值赠送率与权益。</p>
        </div>
        {hasPermission('biz:memberLevel:add') ? (
          <Button icon={<Plus className="size-4" />} onClick={openCreate}>
            新增等级
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
              placeholder="等级名称"
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
      ) : sortedRows.length === 0 ? (
        <EmptyState title="暂无等级" description="还未配置任何会员等级。" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sortedRows.map((level) => (
            <Card key={level.id} hover={false}>
              <div className="flex items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-salon-accent text-sm font-semibold text-white">
                  {level.levelNo}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-base font-semibold text-salon-ink dark:text-zinc-100">
                      {level.name}
                    </span>
                    <Badge tone={level.status === 1 ? 'success' : 'danger'}>
                      {level.status === 1 ? '启用' : '禁用'}
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-md bg-stone-50 p-2 dark:bg-zinc-900">
                  <div className="text-zinc-500 dark:text-zinc-400">服务折扣</div>
                  <div className="mt-0.5 font-medium text-salon-ink dark:text-zinc-100">
                    {formatDiscount(level.serviceDiscount)}
                  </div>
                </div>
                <div className="rounded-md bg-stone-50 p-2 dark:bg-zinc-900">
                  <div className="text-zinc-500 dark:text-zinc-400">商品折扣</div>
                  <div className="mt-0.5 font-medium text-salon-ink dark:text-zinc-100">
                    {formatDiscount(level.goodsDiscount)}
                  </div>
                </div>
                <div className="rounded-md bg-stone-50 p-2 dark:bg-zinc-900">
                  <div className="text-zinc-500 dark:text-zinc-400">积分倍率</div>
                  <div className="mt-0.5 font-medium text-salon-ink dark:text-zinc-100">
                    {level.pointRate != null ? `${level.pointRate} 倍` : '暂无'}
                  </div>
                </div>
                <div className="rounded-md bg-stone-50 p-2 dark:bg-zinc-900">
                  <div className="text-zinc-500 dark:text-zinc-400">充值赠送</div>
                  <div className="mt-0.5 font-medium text-salon-ink dark:text-zinc-100">
                    {level.rechargeGiftRate != null ? level.rechargeGiftRate : '暂无'}
                  </div>
                </div>
              </div>
              {level.upgradeThreshold != null ? (
                <div className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                  升级门槛：{level.upgradeThreshold}
                </div>
              ) : null}
              <div className="mt-3 flex justify-end gap-2 border-t border-salon-line pt-3 dark:border-zinc-800">
                {hasPermission('biz:memberLevel:edit') ? (
                  <Button
                    icon={<Pencil className="size-4" />}
                    onClick={() => openEdit(String(level.id))}
                    size="sm"
                    variant="secondary"
                  >
                    编辑
                  </Button>
                ) : null}
                {hasPermission('biz:memberLevel:delete') ? (
                  <Button
                    icon={<Trash2 className="size-4" />}
                    onClick={() => setConfirmIds([String(level.id)])}
                    size="sm"
                    variant="secondary"
                  >
                    删除
                  </Button>
                ) : null}
              </div>
            </Card>
          ))}
        </div>
      )}

      <MemberLevelFormDialog
        levelId={editId}
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
          void memberLevelApi.remove(confirmIds).then(async () => {
            setConfirmIds(null);
            await load();
          });
        }}
        open={Boolean(confirmIds)}
        title="确认删除等级"
      />
    </div>
  );
}
