import { useCallback, useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Search, ToggleLeft, ToggleRight, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import {
  tenantApi,
  type TenantFormPayload,
  type TenantPageVO,
} from '@/shared/api/modules/systemApi';
import { tenantFormSchema, type TenantFormValues } from '@/features/system/model/systemSchemas';
import { Badge } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';
import { EmptyState } from '@/shared/ui/EmptyState';
import { Field } from '@/shared/ui/Field';
import { Input } from '@/shared/ui/Input';
import { Modal } from '@/shared/ui/Modal';
import { Pagination } from '@/shared/ui/Pagination';
import { Table, type TableColumn } from '@/shared/ui/Table';
import { useDebounce } from '@/shared/hooks/useDebounce';
import { useAuthStore } from '@/store/useAuthStore';

const PAGE_SIZE = 10;
const SYNC_MODULE_OPTIONS: ReadonlyArray<readonly [string, string]> = [
  ['dict', '字典'],
  ['memberLevel', '会员等级'],
  ['memberTag', '会员标签'],
];

function defaultValues(): TenantFormValues {
  return {
    name: '',
    code: '',
    status: 1,
    adminUsername: 'admin',
    adminPassword: '',
    contact: '',
    phone: '',
    store: { name: '', code: '', phone: '', address: '' },
    syncModules: ['dict', 'memberLevel', 'memberTag'],
  };
}

function toPayload(v: TenantFormValues): TenantFormPayload {
  return {
    name: v.name.trim(),
    code: v.code.trim(),
    status: v.status,
    adminUsername: v.adminUsername.trim() || undefined,
    adminPassword: v.adminPassword?.trim() || undefined,
    contact: v.contact?.trim() || undefined,
    phone: v.phone?.trim() || undefined,
    store: {
      name: v.store.name.trim() || undefined,
      code: v.store.code.trim() || undefined,
      phone: v.store.phone.trim() || undefined,
      address: v.store.address.trim() || undefined,
    },
    syncModules: v.syncModules,
  };
}

/** 租户开通表单：嵌套初始门店 + 同步模块 checkbox 组。 */
function TenantCreateDialog({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [submitLoading, setSubmitLoading] = useState(false);
  const {
    formState: { errors },
    handleSubmit,
    register,
    reset,
    setValue,
    watch,
  } = useForm<TenantFormValues>({
    resolver: zodResolver(tenantFormSchema),
    defaultValues: defaultValues(),
  });

  useEffect(() => {
    if (open) {
      reset(defaultValues());
    }
  }, [open, reset]);

  async function handleSave(values: TenantFormValues): Promise<void> {
    setSubmitLoading(true);
    try {
      await tenantApi.create(toPayload(values));
      onSaved();
      onClose();
    } finally {
      setSubmitLoading(false);
    }
  }

  const selectedModules = watch('syncModules') ?? [];

  function toggleModule(key: string, checked: boolean): void {
    const next = checked
      ? Array.from(new Set([...selectedModules, key]))
      : selectedModules.filter((m) => m !== key);
    setValue('syncModules', next, { shouldDirty: true });
  }

  return (
    <Modal
      description="管理员初始密码留空则使用系统默认密码（wj.salon.default-password）。"
      footer={
        <>
          <Button onClick={onClose} variant="secondary">
            取消
          </Button>
          <Button loading={submitLoading} onClick={handleSubmit(handleSave)}>
            开通
          </Button>
        </>
      }
      onClose={onClose}
      open={open}
      title="开通租户"
    >
      <form className="space-y-4" onSubmit={handleSubmit(handleSave)}>
        <div className="grid gap-3 md:grid-cols-2">
          <Field error={errors.name?.message} label="租户名称" required>
            <Input invalid={Boolean(errors.name)} placeholder="如：星河美业" {...register('name')} />
          </Field>
          <Field error={errors.code?.message} label="租户编码" required>
            <Input invalid={Boolean(errors.code)} placeholder="如：xinghe" {...register('code')} />
          </Field>
          <Field label="联系人">
            <Input placeholder="租户联系人" {...register('contact')} />
          </Field>
          <Field label="电话">
            <Input placeholder="联系电话" {...register('phone')} />
          </Field>
          <Field error={errors.adminUsername?.message} label="管理员用户名" required>
            <Input invalid={Boolean(errors.adminUsername)} {...register('adminUsername')} />
          </Field>
          <Field label="管理员初始密码">
            <Input placeholder="默认 admin123" type="password" {...register('adminPassword')} />
          </Field>
        </div>

        <div className="space-y-3 border-t border-salon-line pt-3 dark:border-zinc-800">
          <div className="text-sm font-medium text-salon-ink dark:text-white">
            初始门店（可选，门店名称留空则不开通门店）
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="门店名称">
              <Input {...register('store.name')} />
            </Field>
            <Field label="门店编码">
              <Input {...register('store.code')} />
            </Field>
            <Field label="门店电话">
              <Input {...register('store.phone')} />
            </Field>
            <Field label="门店地址">
              <Input {...register('store.address')} />
            </Field>
          </div>
        </div>

        <div className="space-y-2 border-t border-salon-line pt-3 dark:border-zinc-800">
          <div className="text-sm font-medium text-salon-ink dark:text-white">
            同步通用数据（从默认租户复制到新租户）
          </div>
          <div className="grid gap-2 md:grid-cols-3">
            {SYNC_MODULE_OPTIONS.map(([key, label]) => {
              const checked = selectedModules.includes(key);
              return (
                <label
                  className="flex cursor-pointer items-center gap-2 rounded-md border border-transparent px-2 py-1.5 text-sm hover:border-salon-line dark:hover:border-zinc-700"
                  key={key}
                >
                  <input
                    checked={checked}
                    className="size-4 rounded border-salon-line text-salon-accent focus:ring-salon-accent"
                    onChange={() => toggleModule(key, !checked)}
                    type="checkbox"
                  />
                  <span>{label}</span>
                </label>
              );
            })}
          </div>
        </div>
        <button className="hidden" type="submit" />
      </form>
    </Modal>
  );
}

/**
 * 租户开通：创建时初始化预置角色、管理员，可选联合创建初始门店。
 */
export function TenantPage() {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const [rows, setRows] = useState<TenantPageVO[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [pageNum, setPageNum] = useState(1);
  const [keyword, setKeyword] = useState('');
  const debounced = useDebounce(keyword, 300);
  const [createOpen, setCreateOpen] = useState(false);
  const [confirmIds, setConfirmIds] = useState<string[] | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await tenantApi.list({
        pageNum,
        pageSize: PAGE_SIZE,
        keywords: debounced || undefined,
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

  const columns: TableColumn<TenantPageVO>[] = [
    {
      title: '名称',
      render: (r) => <span className="font-medium text-salon-ink dark:text-zinc-100">{r.name}</span>,
    },
    {
      title: '编码',
      render: (r) => (r.code ? <span className="font-mono text-xs">{r.code}</span> : '暂无'),
    },
    { title: '联系人', render: (r) => r.contact || '暂无' },
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
          {hasPermission('system:tenant:status') ? (
            <Button
              icon={
                r.status === 1 ? (
                  <ToggleRight className="size-4" />
                ) : (
                  <ToggleLeft className="size-4" />
                )
              }
              onClick={() =>
                void tenantApi.updateStatus(r.id, r.status === 1 ? 0 : 1).then(load)
              }
              size="sm"
              variant="secondary"
            >
              {r.status === 1 ? '禁用' : '启用'}
            </Button>
          ) : null}
          {hasPermission('system:tenant:delete') && r.id !== '1' ? (
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
          <h1 className="text-xl font-semibold">租户管理</h1>
          <p className="text-sm text-zinc-500">
            开通租户会自动创建预置角色与管理员账号，可选联合创建初始门店。
          </p>
        </div>
        {hasPermission('system:tenant:add') ? (
          <Button icon={<Plus className="size-4" />} onClick={() => setCreateOpen(true)}>
            开通租户
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
              placeholder="名称/编码"
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
        empty={<EmptyState title="暂无租户" description="点击开通创建第一个连锁品牌租户。" />}
      />

      <Pagination pageNum={pageNum} pageSize={PAGE_SIZE} total={total} onChange={setPageNum} />

      <TenantCreateDialog
        onClose={() => setCreateOpen(false)}
        onSaved={() => void load()}
        open={createOpen}
      />

      <ConfirmDialog
        danger
        description="删除租户不会级联清理业务数据，请谨慎操作。"
        onCancel={() => setConfirmIds(null)}
        onConfirm={() => {
          if (!confirmIds) {
            return;
          }
          void tenantApi.remove(confirmIds).then(async () => {
            setConfirmIds(null);
            await load();
          });
        }}
        open={Boolean(confirmIds)}
        title="确认删除租户"
      />
    </div>
  );
}
