import { useMemberSettingsStore } from '@/store/useMemberSettingsStore';
import { useCallback, useEffect, useRef, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { ImagePlus, Plus, RotateCcw, Search } from 'lucide-react';
import { Controller, useForm } from 'react-hook-form';
import { memberLevelApi } from '@/shared/api/modules/memberApi';
import { fileApi } from '@/shared/api/modules/systemApi';
import { MemberLevelCard } from '@/features/member/ui/MemberLevelCard';
import { MemberCardTemplatePicker } from '@/features/member/ui/MemberCardTemplatePicker';
import { MemberLevelTile } from '@/features/member/ui/MemberLevelTile';
import type {
  MemberLevelFormPayload,
  MemberLevelPageVO,
} from '@/features/member/model/memberTypes';
import { memberLevelFormSchema, type MemberLevelFormValues } from '@/features/member/model/memberSchemas';
import { Button } from '@/shared/ui/Button';
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
    cardImage: null,
    cardTemplate: 'auto',
    levelType: 'REGULAR',
    serviceDiscount: '1',
    goodsDiscount: '1',
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
    cardImage: p.cardImage ?? null,
    cardTemplate: p.cardTemplate ?? 'auto',
    levelType: p.levelType ?? 'REGULAR',
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
    cardImage: v.cardImage || null,
    cardTemplate: v.cardTemplate,
    levelType: v.levelType,
    serviceDiscount: v.serviceDiscount ? Number(v.serviceDiscount) : undefined,
    goodsDiscount: v.goodsDiscount ? Number(v.goodsDiscount) : undefined,
    pointRate: v.pointRate ? Number(v.pointRate) : undefined,
    rechargeGiftRate: v.rechargeGiftRate ? Number(v.rechargeGiftRate) : undefined,
    upgradeThreshold: v.levelType === 'ACTIVITY' || !v.upgradeThreshold ? null : Number(v.upgradeThreshold),
    rights: v.rights?.trim() || undefined,
    sort: v.sort ? Number(v.sort) : 0,
    status: v.status,
    remark: v.remark?.trim() || undefined,
  };
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
  const pointsEnabled = useMemberSettingsStore((s) => s.pointsEnabled);
  const [loadingForm, setLoadingForm] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [imageError, setImageError] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);
  const uploadVersion = useRef(0);
  const {
    control,
    formState: { errors },
    handleSubmit,
    register,
    reset,
    setValue,
    watch,
  } = useForm<MemberLevelFormValues>({
    resolver: zodResolver(memberLevelFormSchema),
    defaultValues: defaultValues(),
  });

  useEffect(() => {
    uploadVersion.current += 1;
    setImageUploading(false);
    setImageError('');
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

  async function uploadCardImage(file: File): Promise<void> {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setImageError('请选择 JPG、PNG 或 WebP 图片');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setImageError('卡面图片不能超过5MB');
      return;
    }
    const version = ++uploadVersion.current;
    setImageUploading(true);
    setImageError('');
    try {
      // 同租户共享品牌素材；实际存储仍为私有桶，通过预签名展示。
      const uploaded = await fileApi.upload(file, 'member-card', true);
      if (version === uploadVersion.current) {
        setValue('cardImage', uploaded.objectKey, { shouldDirty: true, shouldValidate: true });
      }
    } catch (error: unknown) {
      if (version === uploadVersion.current) {
        setImageError(error instanceof Error ? error.message : '卡面上传失败，请重试');
      }
    } finally {
      if (version === uploadVersion.current) setImageUploading(false);
    }
  }

  async function handleSave(values: MemberLevelFormValues): Promise<void> {
    if (imageUploading || loadingForm) return;
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
          <Button disabled={imageUploading || loadingForm} loading={submitLoading} onClick={handleSubmit(handleSave)}>
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
          <Field
            className="md:col-span-2"
            label="会员卡面"
            error={errors.cardTemplate?.message || errors.cardImage?.message || imageError}
            hint="可选系统内置卡面，也可上传 JPG、PNG、WebP 图片，最大 5MB；建议使用银行卡比例的横向图片。"
          >
            <div className="grid items-center gap-4 rounded-lg bg-salon-paper p-3 sm:grid-cols-[minmax(0,1fr)_auto] dark:bg-zinc-900">
              <MemberLevelCard
                className="max-w-[320px]"
                name={watch('name') || '会员等级'}
                levelNo={Number(watch('levelNo')) || 0}
                cardImage={watch('cardImage')}
                cardTemplate={watch('cardTemplate')}
                levelType={watch('levelType')}
              />
              <div className="flex flex-wrap gap-2 sm:flex-col">
                <input
                  ref={fileInput}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  aria-label="选择会员卡贴图"
                  disabled={imageUploading || submitLoading}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.target.value = '';
                    if (file) void uploadCardImage(file);
                  }}
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  icon={<ImagePlus className="size-4" />}
                  loading={imageUploading}
                  disabled={submitLoading}
                  onClick={() => fileInput.current?.click()}
                >
                  自选贴图
                </Button>
                {watch('cardImage') ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    icon={<RotateCcw className="size-4" />}
                    disabled={imageUploading || submitLoading}
                    onClick={() => {
                      setValue('cardImage', null, { shouldDirty: true, shouldValidate: true });
                      setImageError('');
                    }}
                  >
                    恢复内置卡面
                  </Button>
                ) : null}
              </div>
            </div>
            <Controller control={control} name="cardTemplate" render={({ field }) => (
              <MemberCardTemplatePicker value={field.value} disabled={imageUploading || submitLoading} onChange={(value) => {
                field.onChange(value);
                setValue('cardImage', null, { shouldDirty: true, shouldValidate: true });
                setImageError('');
              }} />
            )} />
          </Field>
          <Field error={errors.name?.message} label="等级名称" required>
            <Input invalid={Boolean(errors.name)} placeholder="如：黄金会员" {...register('name')} />
          </Field>
          <Field error={errors.levelType?.message} label="等级类型" required>
            <Controller control={control} name="levelType" render={({ field }) => (
              <Select value={field.value} onChange={(event) => {
                field.onChange(event.target.value);
                if (event.target.value === 'ACTIVITY') setValue('upgradeThreshold', '');
              }}>
                <option value="REGULAR">常规等级</option>
                <option value="ACTIVITY">活动等级（独立展示）</option>
              </Select>
            )} />
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
          {pointsEnabled ? (
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
          ) : null}
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
          <Field error={errors.upgradeThreshold?.message} label="升级门槛" hint={watch('levelType') === 'ACTIVITY' ? '活动等级由店员手动选择，不参与自动升级' : '累计充值与累计消费取大者，达标自动升级'}>
            <Controller
              control={control}
              name="upgradeThreshold"
              render={({ field }) => (
                <Input
                  disabled={watch('levelType') === 'ACTIVITY'}
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
  const pointsEnabled = useMemberSettingsStore((s) => s.pointsEnabled);
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
          <p className="text-sm text-zinc-500">{pointsEnabled ? '配置等级折扣、积分倍率、充值赠送率与权益。' : '配置等级折扣、充值赠送率与权益。'}</p>
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
        <div className="space-y-6">
          {[
            { type: 'REGULAR', title: '常规会员等级', hint: '按累计充值或消费金额升级，享受对应等级权益。' },
            { type: 'ACTIVITY', title: '活动会员等级', hint: '新客体验等活动专用，由店员手动选择，不参与常规自动升级。' },
          ].map((group) => {
            const levels = sortedRows.filter((level) => (level.levelType ?? 'REGULAR') === group.type);
            if (levels.length === 0) return null;
            return (
              <section key={group.type} aria-label={group.title}>
                <div className="mb-3">
                  <h2 className="text-sm font-semibold text-salon-ink dark:text-zinc-100">{group.title}</h2>
                  <p className="mt-1 text-xs leading-5 text-zinc-500 dark:text-zinc-400">{group.hint}</p>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {levels.map((level) => (
                    <MemberLevelTile
                      key={level.id}
                      level={level}
                      pointsEnabled={pointsEnabled}
                      editable={hasPermission('biz:memberLevel:edit')}
                      deletable={hasPermission('biz:memberLevel:delete')}
                      onEdit={openEdit}
                      onDelete={(id) => setConfirmIds([id])}
                    />
                  ))}
                </div>
              </section>
            );
          })}
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
