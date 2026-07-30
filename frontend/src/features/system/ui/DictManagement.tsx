import { useCallback, useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { BookOpen, ChevronRight, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { dictApi, dictTypeApi } from '@/shared/api/modules/systemApi';
import { Badge } from '@/shared/ui/Badge';
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
import { cn } from '@/shared/lib/cn';
import { normalizeNumber } from '@/shared/lib/format';
import { useAuthStore } from '@/store/useAuthStore';
import { dictFormSchema, dictTypeFormSchema, type DictFormValues, type DictTypeFormValues } from '@/features/system/model/dictSchemas';
import type {
  DictFormPayload,
  DictPageVO,
  DictTypeFormPayload,
  DictTypePageVO,
} from '@/features/system/model/dictTypes';
import type { EntityId, StatusValue } from '@/features/system/model/systemTypes';
import { STATUS_OPTIONS, getStatusLabel } from '@/features/system/model/systemTypes';

/**
 * 字典管理：左侧字典类型列表，右侧选中类型的字典项表格，支持类型与项的增删改。
 */
type DialogMode = 'create' | 'edit';

interface TypeDialogState {
  mode: DialogMode;
  open: boolean;
  id: EntityId | null;
}

interface ItemDialogState {
  mode: DialogMode;
  open: boolean;
  id: EntityId | null;
  typeCode: string;
  typeName: string;
}

interface ConfirmState {
  title: string;
  description: string;
  ids: EntityId[];
  kind: 'type' | 'item';
}

function defaultTypeValues(): DictTypeFormValues {
  return { name: '', code: '', status: 1, groupCode: 'system', remark: '' };
}

function toTypeValues(payload: DictTypeFormPayload): DictTypeFormValues {
  return {
    id: payload.id,
    name: payload.name ?? '',
    code: payload.code ?? '',
    status: normalizeNumber(payload.status, 1) as StatusValue,
    groupCode: payload.groupCode ?? 'system',
    remark: payload.remark ?? '',
  };
}

function toTypePayload(values: DictTypeFormValues): DictTypeFormPayload {
  return {
    id: values.id,
    name: values.name.trim(),
    code: values.code.trim(),
    status: values.status,
    groupCode: values.groupCode?.trim() || undefined,
    remark: values.remark?.trim() || undefined,
  };
}

function defaultItemValues(typeCode: string): DictFormValues {
  return { typeCode, name: '', value: '', status: 1, sort: 0, remark: '' };
}

function toItemValues(payload: DictFormPayload): DictFormValues {
  return {
    id: payload.id,
    typeCode: payload.typeCode ?? '',
    name: payload.name ?? '',
    value: payload.value ?? '',
    status: normalizeNumber(payload.status, 1) as StatusValue,
    sort: normalizeNumber(payload.sort, 0),
    remark: payload.remark ?? '',
  };
}

function toItemPayload(values: DictFormValues): DictFormPayload {
  return {
    id: values.id,
    typeCode: values.typeCode.trim(),
    name: values.name.trim(),
    value: values.value.trim(),
    status: values.status,
    sort: values.sort,
    remark: values.remark?.trim() || undefined,
  };
}

function DictTypeDialog({
  state,
  onClose,
  onSaved,
}: {
  state: TypeDialogState;
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
  } = useForm<DictTypeFormValues>({
    resolver: zodResolver(dictTypeFormSchema),
    defaultValues: defaultTypeValues(),
  });

  useEffect(() => {
    if (!state.open) {
      return;
    }
    if (state.mode === 'create') {
      reset(defaultTypeValues());
      return;
    }
    if (!state.id) {
      return;
    }
    let active = true;
    setLoadingForm(true);
    dictTypeApi
      .getForm(state.id)
      .then((payload) => {
        if (active) {
          reset(toTypeValues(payload));
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
  }, [reset, state.id, state.mode, state.open]);

  async function handleSave(values: DictTypeFormValues): Promise<void> {
    setSubmitLoading(true);
    try {
      const payload = toTypePayload(values);
      if (state.mode === 'create') {
        await dictTypeApi.create(payload);
      } else if (payload.id) {
        await dictTypeApi.update(payload.id, payload);
      }
      onSaved();
      onClose();
    } finally {
      setSubmitLoading(false);
    }
  }

  return (
    <Modal
      description="字典类型用于归集一组字典项，编码创建后建议不再修改。"
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
      maxWidthClassName="max-w-lg"
      onClose={onClose}
      open={state.open}
      title={state.mode === 'create' ? '新增字典类型' : '编辑字典类型'}
    >
      {loadingForm ? (
        <PageLoading />
      ) : (
        <form className="space-y-4" onSubmit={handleSubmit(handleSave)}>
          <div className="grid gap-4 md:grid-cols-2">
            <Field error={errors.name?.message} label="类型名称" required>
              <Input invalid={Boolean(errors.name)} placeholder="如：性别" {...register('name')} />
            </Field>
            <Field error={errors.code?.message} label="类型编码" required>
              <Input invalid={Boolean(errors.code)} placeholder="如：gender" {...register('code')} />
            </Field>
            <Field error={errors.groupCode?.message} label="分组编码">
              <Input placeholder="如：system" {...register('groupCode')} />
            </Field>
            <Field error={errors.status?.message} label="状态" required>
              <Select {...register('status', { valueAsNumber: true })}>
                {STATUS_OPTIONS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field error={errors.remark?.message} label="备注">
            <Textarea placeholder="可选" {...register('remark')} />
          </Field>
          <button className="hidden" type="submit" />
        </form>
      )}
    </Modal>
  );
}

function DictItemDialog({
  state,
  onClose,
  onSaved,
}: {
  state: ItemDialogState;
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
  } = useForm<DictFormValues>({
    resolver: zodResolver(dictFormSchema),
    defaultValues: defaultItemValues(state.typeCode),
  });

  useEffect(() => {
    if (!state.open) {
      return;
    }
    if (state.mode === 'create') {
      reset(defaultItemValues(state.typeCode));
      return;
    }
    if (!state.id) {
      return;
    }
    let active = true;
    setLoadingForm(true);
    dictApi
      .getForm(state.id)
      .then((payload) => {
        if (active) {
          reset(toItemValues(payload));
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
  }, [reset, state.id, state.mode, state.open, state.typeCode]);

  async function handleSave(values: DictFormValues): Promise<void> {
    setSubmitLoading(true);
    try {
      const payload = toItemPayload(values);
      if (state.mode === 'create') {
        await dictApi.create(payload);
      } else if (payload.id) {
        await dictApi.update(payload.id, payload);
      }
      onSaved();
      onClose();
    } finally {
      setSubmitLoading(false);
    }
  }

  return (
    <Modal
      description={`当前字典类型：${state.typeName}（${state.typeCode}）`}
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
      maxWidthClassName="max-w-lg"
      onClose={onClose}
      open={state.open}
      title={state.mode === 'create' ? '新增字典项' : '编辑字典项'}
    >
      {loadingForm ? (
        <PageLoading />
      ) : (
        <form className="space-y-4" onSubmit={handleSubmit(handleSave)}>
          <div className="grid gap-4 md:grid-cols-2">
            <Field error={errors.name?.message} label="字典项名称" required>
              <Input invalid={Boolean(errors.name)} placeholder="如：男" {...register('name')} />
            </Field>
            <Field error={errors.value?.message} label="字典项值" required>
              <Input invalid={Boolean(errors.value)} placeholder="如：1" {...register('value')} />
            </Field>
            <Field error={errors.sort?.message} label="排序" required>
              <Input type="number" {...register('sort', { valueAsNumber: true })} />
            </Field>
            <Field error={errors.status?.message} label="状态" required>
              <Select {...register('status', { valueAsNumber: true })}>
                {STATUS_OPTIONS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field error={errors.remark?.message} label="备注">
            <Textarea placeholder="可选" {...register('remark')} />
          </Field>
          {/* typeCode 由当前选中类型决定（编辑时由表单回显保留），隐藏字段保证提交值可靠 */}
          <input type="hidden" {...register('typeCode')} />
          <button className="hidden" type="submit" />
        </form>
      )}
    </Modal>
  );
}

export function DictManagement() {
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const [types, setTypes] = useState<DictTypePageVO[]>([]);
  const [typeLoading, setTypeLoading] = useState(false);
  const [typeKeyword, setTypeKeyword] = useState('');
  const debouncedTypeKeyword = useDebounce(typeKeyword, 300);
  const [selectedTypeCode, setSelectedTypeCode] = useState<string | null>(null);

  const [items, setItems] = useState<DictPageVO[]>([]);
  const [itemLoading, setItemLoading] = useState(false);
  const [itemTotal, setItemTotal] = useState(0);
  const [pageNum, setPageNum] = useState(1);
  const [pageSize] = useState(10);
  const [itemKeyword, setItemKeyword] = useState('');
  const debouncedItemKeyword = useDebounce(itemKeyword, 350);

  const [submitLoading, setSubmitLoading] = useState(false);
  const [typeDialog, setTypeDialog] = useState<TypeDialogState>({ mode: 'create', open: false, id: null });
  const [itemDialog, setItemDialog] = useState<ItemDialogState>({
    mode: 'create',
    open: false,
    id: null,
    typeCode: '',
    typeName: '',
  });
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);

  const selectedType = types.find((item) => item.code === selectedTypeCode) ?? null;

  const loadTypes = useCallback(async (): Promise<void> => {
    setTypeLoading(true);
    try {
      const data = await dictTypeApi.list({
        pageNum: 1,
        pageSize: 200,
        keywords: debouncedTypeKeyword.trim() || undefined,
      });
      setTypes(data.list ?? []);
      setSelectedTypeCode((current) => {
        if (current && data.list.some((item) => item.code === current)) {
          return current;
        }
        return data.list[0]?.code ?? null;
      });
    } finally {
      setTypeLoading(false);
    }
  }, [debouncedTypeKeyword]);

  useEffect(() => {
    void loadTypes();
  }, [loadTypes]);

  const loadItems = useCallback(async (): Promise<void> => {
    if (!selectedTypeCode) {
      setItems([]);
      setItemTotal(0);
      return;
    }
    setItemLoading(true);
    try {
      const data = await dictApi.list({
        pageNum,
        pageSize,
        typeCode: selectedTypeCode,
        keywords: debouncedItemKeyword.trim() || undefined,
      });
      setItems(data.list ?? []);
      setItemTotal(data.total ?? 0);
    } finally {
      setItemLoading(false);
    }
  }, [debouncedItemKeyword, pageNum, pageSize, selectedTypeCode]);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  function openCreateType(): void {
    setTypeDialog({ mode: 'create', open: true, id: null });
  }

  function openEditType(id: EntityId): void {
    setTypeDialog({ mode: 'edit', open: true, id });
  }

  function openCreateItem(): void {
    if (!selectedType) {
      return;
    }
    setItemDialog({ mode: 'create', open: true, id: null, typeCode: selectedType.code, typeName: selectedType.name });
  }

  function openEditItem(row: DictPageVO): void {
    if (!selectedType) {
      return;
    }
    setItemDialog({ mode: 'edit', open: true, id: row.id, typeCode: selectedType.code, typeName: selectedType.name });
  }

  async function handleDelete(): Promise<void> {
    if (!confirm || confirm.ids.length === 0) {
      return;
    }
    setSubmitLoading(true);
    try {
      if (confirm.kind === 'type') {
        await dictTypeApi.remove(confirm.ids);
        await loadTypes();
      } else {
        await dictApi.remove(confirm.ids);
        await loadItems();
      }
    } finally {
      setSubmitLoading(false);
      setConfirm(null);
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 rounded-lg border border-salon-line bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-lg font-semibold">
            <BookOpen className="size-5 text-salon-accent" />
            字典管理
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">左侧选择字典类型，右侧维护其字典项。</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <div className="flex flex-col rounded-lg border border-salon-line bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center justify-between gap-2 border-b border-salon-line px-4 py-3 dark:border-zinc-800">
            <span className="text-sm font-semibold">字典类型</span>
            {hasPermission('system:dict:add') ? (
              <Button icon={<Plus className="size-4" />} onClick={openCreateType} size="sm">
                新增
              </Button>
            ) : null}
          </div>
          <div className="border-b border-salon-line p-3 dark:border-zinc-800">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
              <Input
                className="pl-9"
                placeholder="搜索类型名称/编码"
                value={typeKeyword}
                onChange={(event) => setTypeKeyword(event.target.value)}
              />
            </div>
          </div>
          <div className="max-h-[60vh] overflow-y-auto p-2">
            {typeLoading ? (
              <PageLoading />
            ) : types.length === 0 ? (
              <EmptyState description="新增第一个字典类型。" title="暂无字典类型" />
            ) : (
              <ul className="space-y-1">
                {types.map((item) => {
                  const active = item.code === selectedTypeCode;
                  return (
                    <li key={item.id}>
                      <div
                        className={cn(
                          'group flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm transition',
                          active
                            ? 'bg-salon-accent/10 text-salon-accent dark:bg-violet-500/10'
                            : 'text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800',
                        )}
                        onClick={() => {
                          setSelectedTypeCode(item.code);
                          setPageNum(1);
                        }}
                      >
                        <ChevronRight
                          className={cn('size-4 shrink-0 transition', active && 'rotate-90 text-salon-accent')}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">{item.name}</p>
                          <p className="truncate font-mono text-xs text-zinc-400">{item.code}</p>
                        </div>
                        <Badge tone={item.status === 1 ? 'success' : 'danger'}>
                          {getStatusLabel(item.status)}
                        </Badge>
                        <div className="flex shrink-0 gap-1 opacity-0 transition group-hover:opacity-100">
                          {hasPermission('system:dict:edit') ? (
                            <Button
                              aria-label="编辑类型"
                              className="size-7 px-0"
                              icon={<Pencil className="size-3.5" />}
                              onClick={(event) => {
                                event.stopPropagation();
                                openEditType(item.id);
                              }}
                              size="sm"
                              variant="ghost"
                            />
                          ) : null}
                          {hasPermission('system:dict:delete') ? (
                            <Button
                              aria-label="删除类型"
                              className="size-7 px-0"
                              icon={<Trash2 className="size-3.5" />}
                              onClick={(event) => {
                                event.stopPropagation();
                                setConfirm({
                                  title: '删除字典类型',
                                  description: `确定删除字典类型「${item.name}」吗？其下字典项将一并删除。`,
                                  ids: [item.id],
                                  kind: 'type',
                                });
                              }}
                              size="sm"
                              variant="ghost"
                            />
                          ) : null}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-salon-line bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex flex-col gap-3 border-b border-salon-line px-4 py-3 dark:border-zinc-800 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold">
                字典项{selectedType ? <span className="text-zinc-400"> · {selectedType.name}</span> : null}
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {selectedType ? `编码：${selectedType.code}` : '请先在左侧选择字典类型'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
                <Input
                  className="pl-9"
                  disabled={!selectedType}
                  placeholder="搜索字典项名称/值"
                  value={itemKeyword}
                  onChange={(event) => {
                    setItemKeyword(event.target.value);
                    setPageNum(1);
                  }}
                />
              </div>
              {hasPermission('system:dict:add') && selectedType ? (
                <Button icon={<Plus className="size-4" />} onClick={openCreateItem}>
                  新增字典项
                </Button>
              ) : null}
            </div>
          </div>

          {itemLoading ? (
            <PageLoading />
          ) : !selectedType ? (
            <div className="p-4">
              <EmptyState description="在左侧选择一个字典类型后查看其字典项。" title="未选择字典类型" />
            </div>
          ) : items.length === 0 ? (
            <div className="p-4">
              <EmptyState description="点击「新增字典项」创建第一条数据。" title="暂无字典项" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-900/60 dark:text-zinc-400">
                  <tr>
                    <th className="px-4 py-3 font-medium">名称</th>
                    <th className="px-4 py-3 font-medium">值</th>
                    <th className="px-4 py-3 font-medium">排序</th>
                    <th className="px-4 py-3 font-medium">状态</th>
                    <th className="px-4 py-3 text-right font-medium">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((row) => (
                    <tr
                      className="border-t border-salon-line text-zinc-700 hover:bg-slate-50/60 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-900/70"
                      key={row.id}
                    >
                      <td className="px-4 py-3 font-medium text-salon-ink dark:text-white">{row.name}</td>
                      <td className="px-4 py-3 font-mono text-xs">{row.value}</td>
                      <td className="px-4 py-3">{row.sort ?? 0}</td>
                      <td className="px-4 py-3">
                        <Badge tone={row.status === 1 ? 'success' : 'danger'}>{getStatusLabel(row.status)}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          {hasPermission('system:dict:edit') ? (
                            <Button
                              icon={<Pencil className="size-4" />}
                              onClick={() => openEditItem(row)}
                              size="sm"
                              variant="secondary"
                            >
                              编辑
                            </Button>
                          ) : null}
                          {hasPermission('system:dict:delete') ? (
                            <Button
                              icon={<Trash2 className="size-4" />}
                              onClick={() =>
                                setConfirm({
                                  title: '删除字典项',
                                  description: `确定删除字典项「${row.name}」吗？`,
                                  ids: [row.id],
                                  kind: 'item',
                                })
                              }
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

          <div className="flex items-center justify-between border-t border-salon-line px-4 py-3 text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
            <span>共 {itemTotal} 条</span>
            <div className="flex items-center gap-2">
              <Button
                disabled={pageNum <= 1}
                onClick={() => setPageNum((current) => Math.max(1, current - 1))}
                size="sm"
                variant="secondary"
              >
                上一页
              </Button>
              <span className="min-w-12 text-center">{pageNum}</span>
              <Button
                disabled={pageNum * pageSize >= itemTotal}
                onClick={() => setPageNum((current) => current + 1)}
                size="sm"
                variant="secondary"
              >
                下一页
              </Button>
            </div>
          </div>
        </div>
      </div>

      <DictTypeDialog
        onClose={() => setTypeDialog({ mode: 'create', open: false, id: null })}
        onSaved={() => void loadTypes()}
        state={typeDialog}
      />
      <DictItemDialog
        onClose={() =>
          setItemDialog({ mode: 'create', open: false, id: null, typeCode: selectedType?.code ?? '', typeName: selectedType?.name ?? '' })
        }
        onSaved={() => void loadItems()}
        state={itemDialog}
      />
      <ConfirmDialog
        danger
        description={confirm ? confirm.description : ''}
        loading={submitLoading}
        onCancel={() => setConfirm(null)}
        onConfirm={() => void handleDelete()}
        open={Boolean(confirm)}
        title={confirm ? confirm.title : '删除'}
      />
    </section>
  );
}
