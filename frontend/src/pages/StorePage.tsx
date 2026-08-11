import { useCallback, useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Search, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import {
  storeApi,
  userApi,
  type StoreFormPayload,
  type StorePageVO,
} from '@/shared/api/modules/systemApi';
import type { EntityId, UserPageVO } from '@/features/system/model/systemTypes';
import { storeFormSchema, type StoreFormValues } from '@/features/system/model/systemSchemas';
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
import { useTenantStoreFilter } from '@/features/system/model/useTenantStoreFilter';

const PAGE_SIZE = 10;

function defaultValues(): StoreFormValues {
  return {
    name: '',
    code: '',
    phone: '',
    address: '',
    businessHours: '',
    openTime: '09:00',
    closeTime: '21:00',
    restDays: '',
    status: 1,
    remark: '',
    userIds: [],
  };
}

function toFormValues(p: StoreFormPayload): StoreFormValues {
  return {
    name: p.name ?? '',
    code: p.code ?? '',
    phone: p.phone ?? '',
    address: p.address ?? '',
    businessHours: p.businessHours ?? '',
    openTime: p.openTime ?? '',
    closeTime: p.closeTime ?? '',
    restDays: p.restDays ?? '',
    status: normalizeNumber(p.status, 1) as 0 | 1,
    remark: p.remark ?? '',
    userIds: (p.userIds ?? []).map(String),
  };
}

function toPayload(v: StoreFormValues): StoreFormPayload {
  return {
    name: v.name.trim(),
    code: v.code?.trim() || undefined,
    phone: v.phone?.trim() || undefined,
    address: v.address?.trim() || undefined,
    businessHours: v.businessHours?.trim() || undefined,
    openTime: v.openTime?.trim() || undefined,
    closeTime: v.closeTime?.trim() || undefined,
    restDays: v.restDays?.trim() || undefined,
    status: v.status,
    remark: v.remark?.trim() || undefined,
    userIds: v.userIds,
  };
}

type FormMode = 'create' | 'edit';

function toUserOption(user: UserPageVO): { value: string; label: string } {
  return {
    value: String(user.id),
    label: user.nickname ? `${user.nickname}（${user.username}）` : user.username,
  };
}

function StoreFormDialog({
  mode,
  open,
  storeId,
  userOptions,
  onClose,
  onSaved,
}: {
  mode: FormMode;
  open: boolean;
  storeId: EntityId | null;
  userOptions: Array<{ value: string; label: string }>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [loadingForm, setLoadingForm] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const {
    formState: { errors },
    handleSubmit,
    register,
    reset,
    setValue,
    watch,
  } = useForm<StoreFormValues>({
    resolver: zodResolver(storeFormSchema),
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
    if (!storeId) {
      return;
    }
    let active = true;
    setLoadingForm(true);
    storeApi
      .detail(storeId)
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
  }, [mode, open, storeId, reset]);

  async function handleSave(values: StoreFormValues): Promise<void> {
    setSubmitLoading(true);
    try {
      const payload = toPayload(values);
      if (mode === 'create') {
        await storeApi.create(payload);
      } else if (storeId) {
        await storeApi.update(storeId, payload);
      }
      onSaved();
      onClose();
    } finally {
      setSubmitLoading(false);
    }
  }

  const selectedUserIds = watch('userIds') ?? [];
  const invisibleSelectedCount = selectedUserIds.filter(
    (id) => !userOptions.some((option) => option.value === id),
  ).length;

  function toggleUser(userId: string, checked: boolean): void {
    const next = checked
      ? Array.from(new Set([...selectedUserIds, userId]))
      : selectedUserIds.filter((id) => id !== userId);
    setValue('userIds', next, { shouldValidate: true, shouldDirty: true });
  }

  return (
    <Modal
      description={mode === 'create' ? '新建门店营业档案。' : '修改门店信息与授权用户。'}
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
      title={mode === 'create' ? '新增门店' : '编辑门店'}
    >
      {loadingForm ? (
        <PageLoading />
      ) : (
        <form className="space-y-4" onSubmit={handleSubmit(handleSave)}>
          <div className="grid gap-3 md:grid-cols-2">
            <Field error={errors.name?.message} label="门店名称" required>
              <Input invalid={Boolean(errors.name)} placeholder="如：总店" {...register('name')} />
            </Field>
            <Field label="编码">
              <Input placeholder="如：STORE001" {...register('code')} />
            </Field>
            <Field label="电话">
              <Input placeholder="门店联系电话" {...register('phone')} />
            </Field>
            <Field label="地址">
              <Input placeholder="门店地址" {...register('address')} />
            </Field>
            <Field label="开门时间">
              <Input type="time" {...register('openTime')} />
            </Field>
            <Field label="关门时间">
              <Input type="time" {...register('closeTime')} />
            </Field>
            <Field label="营业时间文案">
              <Input placeholder="如：周一至周日 09:00-21:00" {...register('businessHours')} />
            </Field>
            <Field label="休息日">
              <Input placeholder="0,6 表示周日周六" {...register('restDays')} />
            </Field>
            <Field label="状态">
              <Select {...register('status', { valueAsNumber: true })}>
                <option value={1}>营业</option>
                <option value={0}>停用</option>
              </Select>
            </Field>
            <Field label="备注">
              <Input placeholder="门店备注（可选）" {...register('remark')} />
            </Field>
          </div>

          <Field label="授权用户">
            <div className="grid max-h-52 gap-2 overflow-y-auto rounded-md border border-salon-line bg-slate-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/60 md:grid-cols-2">
              {userOptions.length ? (
                userOptions.map((user) => {
                  const checked = selectedUserIds.includes(user.value);
                  return (
                    <label
                      className="flex cursor-pointer items-center gap-2 rounded-md border border-transparent px-2 py-1.5 text-sm hover:border-salon-line hover:bg-white dark:hover:border-zinc-700 dark:hover:bg-zinc-900"
                      key={user.value}
                    >
                      <input
                        checked={checked}
                        className="size-4 rounded border-salon-line text-salon-accent focus:ring-salon-accent"
                        onChange={(event) => toggleUser(user.value, event.target.checked)}
                        type="checkbox"
                      />
                      <span>{user.label}</span>
                    </label>
                  );
                })
              ) : (
                <div className="col-span-full text-sm text-zinc-500 dark:text-zinc-400">
                  暂无可选用户
                </div>
              )}
            </div>
            {invisibleSelectedCount > 0 ? (
              <span className="mt-1 block text-xs text-zinc-500 dark:text-zinc-400">
                另有 {invisibleSelectedCount} 个已授权用户不在当前可选列表内。
              </span>
            ) : null}
          </Field>
          <button className="hidden" type="submit" />
        </form>
      )}
    </Modal>
  );
}

export function StorePage() {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const { showTenant, tenantId, tenantOptions, changeTenant, isRoot } = useTenantStoreFilter();
  const [rows, setRows] = useState<StorePageVO[]>([]);
  const [userOptions, setUserOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [pageNum, setPageNum] = useState(1);
  const [keyword, setKeyword] = useState('');
  const debounced = useDebounce(keyword, 300);
  const [editMode, setEditMode] = useState<FormMode | null>(null);
  const [editId, setEditId] = useState<EntityId | null>(null);
  const [confirmIds, setConfirmIds] = useState<EntityId[] | null>(null);

  const loadUserOptions = useCallback(async () => {
    if (!hasPermission('system:user:list')) {
      setUserOptions([]);
      return;
    }
    try {
      const data = await userApi.list({ pageNum: 1, pageSize: 200 });
      setUserOptions((data.list ?? []).map(toUserOption));
    } catch {
      setUserOptions([]);
    }
  }, [hasPermission]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await storeApi.list({
        pageNum,
        pageSize: PAGE_SIZE,
        keywords: debounced || undefined,
        tenantId: isRoot ? tenantId || undefined : undefined,
      });
      setRows(data.list ?? []);
      setTotal(data.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, [pageNum, debounced, isRoot, tenantId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void loadUserOptions();
  }, [loadUserOptions]);

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

  function businessHoursText(row: StorePageVO): string {
    if (row.businessHours) {
      return row.businessHours;
    }
    if (row.openTime || row.closeTime) {
      return `${row.openTime || ''}-${row.closeTime || ''}`;
    }
    return '暂无';
  }

  const columns: TableColumn<StorePageVO>[] = [
    {
      title: '名称',
      render: (r) => <span className="font-medium text-salon-ink dark:text-zinc-100">{r.name}</span>,
    },
    {
      title: '编码',
      render: (r) => (r.code ? <span className="font-mono text-xs">{r.code}</span> : '暂无'),
    },
    { title: '营业时间', render: (r) => businessHoursText(r) },
    { title: '电话', render: (r) => r.phone || '暂无' },
    {
      title: '状态',
      render: (r) => (
        <Badge tone={r.status === 1 ? 'success' : 'danger'}>
          {r.status === 1 ? '营业' : '停用'}
        </Badge>
      ),
    },
    {
      title: '操作',
      align: 'right',
      render: (r) => (
        <div className="flex justify-end gap-2">
          {hasPermission('biz:store:edit') ? (
            <Button onClick={() => openEdit(r.id)} size="sm" variant="secondary">
              编辑
            </Button>
          ) : null}
          {hasPermission('biz:store:delete') ? (
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
          <h1 className="text-xl font-semibold">门店管理</h1>
          <p className="text-sm text-zinc-500">维护门店营业档案和门店数据范围。</p>
        </div>
        {hasPermission('biz:store:add') ? (
          <Button icon={<Plus className="size-4" />} onClick={openCreate}>
            新增门店
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
              placeholder="名称/编码/电话"
              value={keyword}
            />
          </div>
          {showTenant ? (
            <Select className="md:w-44" value={tenantId} onChange={(e) => changeTenant(e.target.value)}>
              <option value="">全部租户</option>
              {tenantOptions.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </Select>
          ) : null}
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
        empty={<EmptyState title="暂无门店" description="当前门店权限范围内还没有门店档案。" />}
      />

      <Pagination pageNum={pageNum} pageSize={PAGE_SIZE} total={total} onChange={setPageNum} />

      <StoreFormDialog
        mode={editMode ?? 'create'}
        open={editMode !== null}
        storeId={editId}
        userOptions={userOptions}
        onClose={closeEdit}
        onSaved={() => void load()}
      />

      <ConfirmDialog
        danger
        description="删除门店后，对应门店授权关系也会一并清理。"
        onCancel={() => setConfirmIds(null)}
        onConfirm={() => {
          if (!confirmIds) {
            return;
          }
          void storeApi.remove(confirmIds).then(async () => {
            setConfirmIds(null);
            await load();
          });
        }}
        open={Boolean(confirmIds)}
        title="确认删除门店"
      />
    </div>
  );
}
