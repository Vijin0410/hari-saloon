import { useCallback, useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { Controller, useForm } from 'react-hook-form';
import { memberTagApi } from '@/shared/api/modules/memberApi';
import type { MemberTagFormPayload, MemberTagVO } from '@/features/member/model/memberTypes';
import { memberTagFormSchema, type MemberTagFormValues } from '@/features/member/model/memberSchemas';
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
import { useDebounce } from '@/shared/hooks/useDebounce';
import { normalizeNumber } from '@/shared/lib/format';
import { cn } from '@/shared/lib/cn';
import { useAuthStore } from '@/store/useAuthStore';

const INT_RE = /^\d{1,9}$/;

/** 标签颜色选项：key 为 CSS 颜色名（兼容存量数据），name 为中文 */
const COLOR_OPTIONS: Array<{ key: string; name: string }> = [
  { key: 'red', name: '红色' },
  { key: 'orange', name: '橙色' },
  { key: 'amber', name: '琥珀' },
  { key: 'green', name: '绿色' },
  { key: 'blue', name: '蓝色' },
  { key: 'purple', name: '紫色' },
  { key: 'pink', name: '粉色' },
  { key: 'gray', name: '灰色' },
];

function defaultValues(): MemberTagFormValues {
  return { name: '', color: 'blue', sort: '0', status: 1, remark: '' };
}

function toFormValues(p: MemberTagFormPayload): MemberTagFormValues {
  return {
    name: p.name ?? '',
    color: p.color ?? 'blue',
    sort: p.sort != null ? String(p.sort) : '0',
    status: normalizeNumber(p.status, 1) as 0 | 1,
    remark: p.remark ?? '',
  };
}

function toPayload(v: MemberTagFormValues): MemberTagFormPayload {
  return {
    name: v.name.trim(),
    color: v.color?.trim() || undefined,
    sort: v.sort ? Number(v.sort) : 0,
    status: v.status,
    remark: v.remark?.trim() || undefined,
  };
}

type FormMode = 'create' | 'edit';

function MemberTagFormDialog({
  mode,
  open,
  tagId,
  onClose,
  onSaved,
}: {
  mode: FormMode;
  open: boolean;
  tagId: string | null;
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
  } = useForm<MemberTagFormValues>({
    resolver: zodResolver(memberTagFormSchema),
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
    if (!tagId) {
      return;
    }
    let active = true;
    setLoadingForm(true);
    memberTagApi
      .form(tagId)
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
  }, [mode, open, tagId, reset]);

  async function handleSave(values: MemberTagFormValues): Promise<void> {
    setSubmitLoading(true);
    try {
      const payload = toPayload(values);
      if (mode === 'create') {
        await memberTagApi.create(payload);
      } else if (tagId) {
        await memberTagApi.update(tagId, payload);
      }
      onSaved();
      onClose();
    } finally {
      setSubmitLoading(false);
    }
  }

  return (
    <Modal
      description={mode === 'create' ? '新建会员标签。' : '修改标签信息。'}
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
      title={mode === 'create' ? '新增标签' : '编辑标签'}
    >
      {loadingForm ? (
        <PageLoading />
      ) : (
        <form className="space-y-3" onSubmit={handleSubmit(handleSave)}>
          <div className="grid gap-3 md:grid-cols-2">
            <Field error={errors.name?.message} label="标签名称" required>
              <Input invalid={Boolean(errors.name)} placeholder="如：高价值客户" {...register('name')} />
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
          </div>
          <Field label="颜色">
            <Controller
              control={control}
              name="color"
              render={({ field }) => (
                <div className="grid grid-cols-4 gap-2">
                  {COLOR_OPTIONS.map((c) => {
                    const selected = field.value === c.key;
                    return (
                      <button
                        className={cn(
                          'flex items-center gap-2 rounded-md border px-2 py-1.5 text-sm transition',
                          selected
                            ? 'border-salon-accent ring-1 ring-salon-accent'
                            : 'border-salon-line hover:bg-stone-50 dark:border-zinc-700 dark:hover:bg-zinc-800',
                        )}
                        key={c.key}
                        onClick={() => field.onChange(c.key)}
                        type="button"
                      >
                        <span
                          className="size-3 rounded-full"
                          style={{ backgroundColor: c.key }}
                        />
                        <span>{c.name}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            />
          </Field>
          <Field label="备注">
            <Input placeholder="标签备注（可选）" {...register('remark')} />
          </Field>
          <button className="hidden" type="submit" />
        </form>
      )}
    </Modal>
  );
}

export function MemberTagPage() {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const [rows, setRows] = useState<MemberTagVO[]>([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const debounced = useDebounce(keyword, 300);
  const [editMode, setEditMode] = useState<FormMode | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [confirmIds, setConfirmIds] = useState<string[] | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await memberTagApi.list({
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

  const sortedRows = [...rows].sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));

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
      ) : sortedRows.length === 0 ? (
        <EmptyState title="暂无标签" description="还未创建任何会员标签。" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {sortedRows.map((tag) => (
            <Card key={tag.id} hover={false}>
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className="size-4 shrink-0 rounded-full"
                    style={{ backgroundColor: tag.color || 'blue' }}
                  />
                  <span className="truncate font-medium text-salon-ink dark:text-zinc-100">
                    {tag.name}
                  </span>
                </div>
                <Badge tone={tag.status === 1 ? 'success' : 'danger'}>
                  {tag.status === 1 ? '启用' : '禁用'}
                </Badge>
              </div>
              <div className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                排序：{tag.sort ?? 0}
              </div>
              {tag.remark ? (
                <div className="mt-1 line-clamp-2 text-xs text-zinc-400 dark:text-zinc-500">
                  {tag.remark}
                </div>
              ) : null}
              <div className="mt-3 flex justify-end gap-2 border-t border-salon-line pt-3 dark:border-zinc-800">
                {hasPermission('biz:memberTag:edit') ? (
                  <Button
                    icon={<Pencil className="size-4" />}
                    onClick={() => openEdit(String(tag.id))}
                    size="sm"
                    variant="secondary"
                  >
                    编辑
                  </Button>
                ) : null}
                {hasPermission('biz:memberTag:delete') ? (
                  <Button
                    icon={<Trash2 className="size-4" />}
                    onClick={() => setConfirmIds([String(tag.id)])}
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

      <MemberTagFormDialog
        mode={editMode ?? 'create'}
        onClose={closeEdit}
        onSaved={() => void load()}
        open={editMode !== null}
        tagId={editId}
      />

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
