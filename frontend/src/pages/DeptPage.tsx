import { useCallback, useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { deptApi } from '@/shared/api/modules/systemApi';
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
import { normalizeNumber } from '@/shared/lib/format';
import { useAuthStore } from '@/store/useAuthStore';
import { useTenantStoreFilter } from '@/features/system/model/useTenantStoreFilter';
import { deptFormSchema, type DeptFormValues } from '@/features/system/model/systemSchemas';
import type {
  DeptFormPayload,
  DeptOption,
  DeptVO,
  EntityId,
  StatusValue,
} from '@/features/system/model/systemTypes';
import { STATUS_OPTIONS, getStatusLabel } from '@/features/system/model/systemTypes';

/**
 * 部门管理：租户内可选组织树，用于用户归属与数据权限。
 */
type DeptMode = 'create' | 'edit';

function defaultDeptValues(): DeptFormValues {
  return {
    name: '',
    parentId: '0',
    status: 1,
    sort: 0,
    leaderId: '',
  };
}

function toDeptFormValues(payload: DeptFormPayload): DeptFormValues {
  return {
    id: payload.id,
    name: payload.name ?? '',
    parentId: payload.parentId ?? '0',
    status: normalizeNumber(payload.status, 1) as StatusValue,
    sort: normalizeNumber(payload.sort, 0),
    leaderId: payload.leaderId ?? '',
  };
}

function toDeptPayload(values: DeptFormValues): DeptFormPayload {
  return {
    id: values.id,
    name: values.name.trim(),
    parentId: values.parentId.trim() || '0',
    status: values.status,
    sort: Number(values.sort),
    leaderId: values.leaderId?.trim() || undefined,
  };
}

function flattenDeptOptions(
  options: DeptOption[],
  depth = 0,
): Array<{ value: EntityId; label: string }> {
  return options.flatMap((option) => {
    const prefix = depth === 0 ? '' : `${'　'.repeat(depth)}└─ `;
    return [
      { value: String(option.value), label: `${prefix}${option.label}` },
      ...flattenDeptOptions(option.children ?? [], depth + 1),
    ];
  });
}

function flattenDeptTree(nodes: DeptVO[], depth = 0): Array<DeptVO & { depth: number }> {
  return nodes.flatMap((node) => [
    { ...node, depth },
    ...flattenDeptTree(node.children ?? [], depth + 1),
  ]);
}

function DeptFormDialog({
  mode,
  open,
  deptOptions,
  deptId,
  onClose,
  onSaved,
}: {
  mode: DeptMode;
  open: boolean;
  deptOptions: DeptOption[];
  deptId: EntityId | null;
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
  } = useForm<DeptFormValues>({
    resolver: zodResolver(deptFormSchema),
    defaultValues: defaultDeptValues(),
  });
  const flatOptions = flattenDeptOptions(deptOptions);

  useEffect(() => {
    if (!open) {
      return;
    }
    if (mode === 'create') {
      reset(defaultDeptValues());
      return;
    }
    if (!deptId) {
      return;
    }
    let active = true;
    setLoadingForm(true);
    deptApi
      .getForm(deptId)
      .then((payload) => {
        if (active) {
          reset(toDeptFormValues(payload));
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
  }, [mode, open, reset, deptId]);

  async function handleSave(values: DeptFormValues): Promise<void> {
    setSubmitLoading(true);
    try {
      const payload = toDeptPayload(values);
      if (mode === 'create') {
        await deptApi.create(payload);
      } else if (payload.id) {
        await deptApi.update(payload.id, payload);
      }
      onSaved();
      onClose();
    } finally {
      setSubmitLoading(false);
    }
  }

  return (
    <Modal
      description="部门为租户内可选组织维度，用于用户归属与数据权限。"
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
      title={mode === 'create' ? '新增部门' : '编辑部门'}
    >
      {loadingForm ? (
        <PageLoading />
      ) : (
        <form className="space-y-4" onSubmit={handleSubmit(handleSave)}>
          <div className="grid gap-4 md:grid-cols-2">
            <Field error={errors.name?.message} label="部门名称" required>
              <Input invalid={Boolean(errors.name)} placeholder="部门名称" {...register('name')} />
            </Field>
            <Field error={errors.parentId?.message} label="上级部门" required>
              <Select invalid={Boolean(errors.parentId)} {...register('parentId')}>
                <option value="0">顶级部门</option>
                {flatOptions.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field error={errors.sort?.message} label="排序" required>
              <Input
                invalid={Boolean(errors.sort)}
                type="number"
                {...register('sort', { valueAsNumber: true })}
              />
            </Field>
            <Field error={errors.status?.message} label="状态" required>
              <Select
                invalid={Boolean(errors.status)}
                {...register('status', { valueAsNumber: true })}
              >
                {STATUS_OPTIONS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <button className="hidden" type="submit" />
        </form>
      )}
    </Modal>
  );
}

export function DeptPage() {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const { showTenant, tenantId, tenantOptions, changeTenant, isRoot } = useTenantStoreFilter();
  const [tree, setTree] = useState<DeptVO[]>([]);
  const [deptOptions, setDeptOptions] = useState<DeptOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const debounced = useDebounce(keyword, 300);
  const [modalMode, setModalMode] = useState<DeptMode | null>(null);
  const [activeDeptId, setActiveDeptId] = useState<EntityId | null>(null);
  const [confirmIds, setConfirmIds] = useState<EntityId[] | null>(null);

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const [list, options] = await Promise.all([
        deptApi.list({
          name: debounced.trim() || undefined,
          tenantId: isRoot ? tenantId || undefined : undefined,
        }),
        deptApi.options(),
      ]);
      setTree(list ?? []);
      setDeptOptions(options ?? []);
    } finally {
      setLoading(false);
    }
  }, [debounced, isRoot, tenantId]);

  useEffect(() => {
    void load();
  }, [load]);

  const flatTree = flattenDeptTree(tree);

  async function handleDelete(ids: EntityId[]): Promise<void> {
    if (!ids.length) {
      return;
    }
    setSubmitLoading(true);
    try {
      await deptApi.remove(ids);
      setConfirmIds(null);
      await load();
    } finally {
      setSubmitLoading(false);
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 rounded-lg border border-salon-line bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-lg font-semibold">部门管理</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            维护租户内部门树，用于用户归属与数据权限。
          </p>
        </div>
        {hasPermission('system:dept:add') ? (
          <Button
            icon={<Plus className="size-4" />}
            onClick={() => {
              setModalMode('create');
              setActiveDeptId(null);
            }}
          >
            新增部门
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
              placeholder="按部门名称搜索"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  void load();
                }
              }}
            />
          </div>
          {showTenant ? (
            <Select
              className="md:w-44"
              value={tenantId}
              onChange={(event) => changeTenant(event.target.value)}
            >
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

      <div className="overflow-hidden rounded-lg border border-salon-line bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        {loading ? (
          <PageLoading />
        ) : flatTree.length === 0 ? (
          <div className="p-4">
            <EmptyState title="暂无部门" description="租户内还没有部门，点击新增创建。" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-900/60 dark:text-zinc-400">
                <tr>
                  <th className="px-4 py-3 font-medium">部门名称</th>
                  <th className="px-4 py-3 font-medium">排序</th>
                  <th className="px-4 py-3 font-medium">状态</th>
                  <th className="px-4 py-3 text-right font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {flatTree.map((node) => (
                  <tr
                    className="border-t border-salon-line text-zinc-700 hover:bg-slate-50/60 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-900/70"
                    key={node.id}
                  >
                    <td
                      className="px-4 py-3 font-medium text-salon-ink dark:text-white"
                      style={{ paddingLeft: `${16 + node.depth * 20}px` }}
                    >
                      {node.name}
                    </td>
                    <td className="px-4 py-3">{node.sort ?? '-'}</td>
                    <td className="px-4 py-3">
                      <Badge tone={node.status === 1 ? 'success' : 'danger'}>
                        {getStatusLabel(node.status)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        {hasPermission('system:dept:edit') ? (
                          <Button
                            icon={<Pencil className="size-4" />}
                            onClick={() => {
                              setModalMode('edit');
                              setActiveDeptId(node.id);
                            }}
                            size="sm"
                            variant="secondary"
                          >
                            编辑
                          </Button>
                        ) : null}
                        {hasPermission('system:dept:delete') ? (
                          <Button
                            icon={<Trash2 className="size-4" />}
                            onClick={() => setConfirmIds([node.id])}
                            size="sm"
                            variant="danger"
                          >
                            删除
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalMode ? (
        <DeptFormDialog
          mode={modalMode}
          deptOptions={deptOptions}
          deptId={activeDeptId}
          onClose={() => {
            setModalMode(null);
            setActiveDeptId(null);
          }}
          onSaved={load}
          open={Boolean(modalMode)}
        />
      ) : null}

      <ConfirmDialog
        danger
        description="删除部门会级联删除其子部门，请谨慎操作。"
        loading={submitLoading}
        onCancel={() => setConfirmIds(null)}
        onConfirm={() => void handleDelete(confirmIds ?? [])}
        open={Boolean(confirmIds)}
        title="确认删除部门"
      />
    </section>
  );
}
