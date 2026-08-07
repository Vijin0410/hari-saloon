import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Pencil, Plus, Search, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { deptApi, fileApi, roleApi, userApi } from '@/shared/api/modules/systemApi';
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
import { normalizeNumber, normalizeStringArray } from '@/shared/lib/format';
import { useAuthStore } from '@/store/useAuthStore';
import { useTenantStoreFilter } from '@/features/system/model/useTenantStoreFilter';
import { userFormSchema, type UserFormValues } from '@/features/system/model/systemSchemas';
import type {
  DeptOption,
  EntityId,
  GenderValue,
  RoleOption,
  StatusValue,
  StoreOption,
  UserFormPayload,
  UserPageQuery,
  UserPageVO,
} from '@/features/system/model/systemTypes';
import {
  GENDER_OPTIONS,
  STATUS_OPTIONS,
  getStatusLabel,
} from '@/features/system/model/systemTypes';

/**
 * 用户管理面板，包含查询、列表、新增、编辑、删除和启停控制。
 */
type UserMode = 'create' | 'edit';

interface ConfirmState {
  title: string;
  description: string;
  ids: EntityId[];
}

function defaultUserValues(): UserFormValues {
  return {
    username: '',
    nickname: '',
    phone: '',
    gender: 0,
    avatar: '',
    email: '',
    status: 1,
    deptId: '',
    roleIds: [],
    storeIds: [],
  };
}

function toUserFormValues(payload: UserFormPayload): UserFormValues {
  return {
    id: payload.id,
    username: payload.username ?? '',
    nickname: payload.nickname ?? '',
    phone: payload.phone ?? '',
    gender: normalizeNumber(payload.gender, 0) as GenderValue,
    avatar: payload.avatar ?? '',
    email: payload.email ?? '',
    status: normalizeNumber(payload.status, 1) as StatusValue,
    deptId: payload.deptId ?? '',
    roleIds: normalizeStringArray(payload.roleIds),
    storeIds: normalizeStringArray(payload.storeIds),
  };
}

function toUserPayload(values: UserFormValues): UserFormPayload {
  return {
    id: values.id,
    username: values.username.trim(),
    nickname: values.nickname.trim(),
    phone: values.phone?.trim() || null,
    gender: values.gender,
    avatar: values.avatar?.trim() || null,
    email: values.email?.trim() || null,
    status: values.status,
    deptId: values.deptId?.trim() || null,
    roleIds: values.roleIds,
    storeIds: values.storeIds,
  };
}

function flattenDeptOptions(
  options: DeptOption[],
  depth = 0,
): Array<{ value: EntityId; label: string }> {
  return options.flatMap((option) => {
    const prefix = depth === 0 ? '' : `${'　'.repeat(depth)}└─ `;
    return [
      {
        value: String(option.value),
        label: `${prefix}${option.label}`,
      },
      ...flattenDeptOptions(option.children ?? [], depth + 1),
    ];
  });
}

function UserFormDialog({
  mode,
  open,
  deptOptions,
  roleOptions,
  storeOptions,
  userId,
  onClose,
  onSaved,
}: {
  mode: UserMode;
  open: boolean;
  deptOptions: DeptOption[];
  roleOptions: RoleOption[];
  storeOptions: StoreOption[];
  userId: EntityId | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [loadingForm, setLoadingForm] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarUploadError, setAvatarUploadError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    formState: { errors },
    handleSubmit,
    register,
    reset,
    setValue,
    watch,
  } = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: defaultUserValues(),
  });
  const flatDeptOptions = flattenDeptOptions(deptOptions);

  useEffect(() => {
    if (!open) {
      return;
    }

    if (mode === 'create') {
      reset(defaultUserValues());
      return;
    }

    if (!userId) {
      return;
    }

    let active = true;
    setLoadingForm(true);
    userApi
      .getForm(userId)
      .then(async (payload) => {
        if (!active) {
          return;
        }
        reset(toUserFormValues(payload));
        setAvatarPreview('');
        setAvatarUploadError('');
        if (payload.avatar) {
          try {
            const url = await fileApi.urlByKey(payload.avatar);
            if (active) {
              setAvatarPreview(url);
            }
          } catch {
            // 无权访问或对象已删：预览留空，不影响编辑提交
          }
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
  }, [mode, open, reset, userId]);

  async function handleSave(values: UserFormValues): Promise<void> {
    setSubmitLoading(true);
    try {
      const payload = toUserPayload(values);
      if (mode === 'create') {
        await userApi.create(payload);
      } else if (payload.id) {
        await userApi.update(payload.id, payload);
      }
      onSaved();
      onClose();
    } finally {
      setSubmitLoading(false);
    }
  }

  const selectedRoleIds = watch('roleIds');
  const selectedStoreIds = watch('storeIds') ?? [];
  const avatarObjectKey = watch('avatar');

  async function handleAvatarChange(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    setAvatarUploading(true);
    setAvatarUploadError('');
    try {
      const vo = await fileApi.upload(file, 'avatar');
      setValue('avatar', vo.objectKey, { shouldValidate: true, shouldDirty: true });
      setAvatarPreview(vo.url ?? '');
    } catch (error) {
      setAvatarUploadError(error instanceof Error ? error.message : '头像上传失败');
    } finally {
      setAvatarUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }

  return (
    <Modal
      description={
        mode === 'create'
          ? '新建用户后会自动生成默认密码，由后端统一设置。'
          : '修改用户资料和角色分配。'
      }
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
      title={mode === 'create' ? '新增用户' : '编辑用户'}
    >
      {loadingForm ? (
        <PageLoading />
      ) : (
        <form className="space-y-4" onSubmit={handleSubmit(handleSave)}>
          <div className="grid gap-4 md:grid-cols-2">
            <Field error={errors.username?.message} label="用户名" required>
              <Input
                invalid={Boolean(errors.username)}
                placeholder="登录用户名"
                {...register('username')}
              />
            </Field>
            <Field error={errors.nickname?.message} label="昵称" required>
              <Input
                invalid={Boolean(errors.nickname)}
                placeholder="显示名称"
                {...register('nickname')}
              />
            </Field>
            <Field error={errors.phone?.message} label="手机号">
              <Input invalid={Boolean(errors.phone)} placeholder="手机号" {...register('phone')} />
            </Field>
            <Field error={errors.email?.message} label="邮箱">
              <Input invalid={Boolean(errors.email)} placeholder="邮箱" {...register('email')} />
            </Field>
            <Field error={errors.gender?.message} label="性别" required>
              <Select
                invalid={Boolean(errors.gender)}
                {...register('gender', { valueAsNumber: true })}
              >
                {GENDER_OPTIONS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </Select>
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

          <div className="grid gap-4 md:grid-cols-2">
            <Field error={errors.deptId?.message} label="所属部门">
              <Select invalid={Boolean(errors.deptId)} {...register('deptId')}>
                <option value="">不选择部门（仅绑定门店）</option>
                {flatDeptOptions.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field error={errors.avatar?.message || avatarUploadError} label="头像">
              <div className="flex items-center gap-3">
                {avatarPreview ? (
                  <img
                    alt="头像预览"
                    src={avatarPreview}
                    className="size-16 shrink-0 rounded-full border border-salon-line object-cover"
                  />
                ) : (
                  <div className="flex size-16 shrink-0 items-center justify-center rounded-full border border-dashed border-salon-line text-xs text-zinc-400">
                    无头像
                  </div>
                )}
                <div className="flex flex-col gap-1.5">
                  <input
                    ref={fileInputRef}
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => void handleAvatarChange(event)}
                    type="file"
                  />
                  <Button
                    disabled={avatarUploading}
                    loading={avatarUploading}
                    onClick={() => fileInputRef.current?.click()}
                    size="sm"
                    variant="secondary"
                  >
                    选择图片
                  </Button>
                  {avatarObjectKey ? (
                    <button
                      className="text-left text-xs text-zinc-500 hover:text-rose-600"
                      onClick={() => {
                        setValue('avatar', '', { shouldDirty: true });
                        setAvatarPreview('');
                      }}
                      type="button"
                    >
                      移除
                    </button>
                  ) : null}
                </div>
              </div>
            </Field>
          </div>

          <Field error={errors.roleIds?.message} label="角色" required>
            <div className="grid max-h-48 gap-2 overflow-y-auto rounded-md border border-salon-line bg-slate-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/60 md:grid-cols-2">
              {roleOptions.length ? (
                roleOptions.map((role) => {
                  const checked = selectedRoleIds.includes(role.value);
                  return (
                    <label
                      className="flex cursor-pointer items-center gap-2 rounded-md border border-transparent px-2 py-1.5 text-sm hover:border-salon-line hover:bg-white dark:hover:border-zinc-700 dark:hover:bg-zinc-900"
                      key={role.value}
                    >
                      <input
                        checked={checked}
                        className="size-4 rounded border-salon-line text-salon-accent focus:ring-salon-accent"
                        onChange={(event) => {
                          const nextRoleIds = event.target.checked
                            ? Array.from(new Set([...selectedRoleIds, role.value]))
                            : selectedRoleIds.filter((roleId) => roleId !== role.value);
                          setValue('roleIds', nextRoleIds, { shouldValidate: true });
                        }}
                        type="checkbox"
                      />
                      <span>{role.label}</span>
                    </label>
                  );
                })
              ) : (
                <div className="col-span-full text-sm text-zinc-500 dark:text-zinc-400">
                  暂无可选角色
                </div>
              )}
            </div>
          </Field>

          <Field label="绑定门店">
            <div className="grid max-h-48 gap-2 overflow-y-auto rounded-md border border-salon-line bg-slate-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/60 md:grid-cols-2">
              {storeOptions.length ? (
                storeOptions.map((store) => {
                  const checked = selectedStoreIds.includes(store.value);
                  return (
                    <label
                      className="flex cursor-pointer items-center gap-2 rounded-md border border-transparent px-2 py-1.5 text-sm hover:border-salon-line hover:bg-white dark:hover:border-zinc-700 dark:hover:bg-zinc-900"
                      key={store.value}
                    >
                      <input
                        checked={checked}
                        className="size-4 rounded border-salon-line text-salon-accent focus:ring-salon-accent"
                        onChange={(event) => {
                          const nextStoreIds = event.target.checked
                            ? Array.from(new Set([...selectedStoreIds, store.value]))
                            : selectedStoreIds.filter((id) => id !== store.value);
                          setValue('storeIds', nextStoreIds, {
                            shouldValidate: true,
                            shouldDirty: true,
                          });
                        }}
                        type="checkbox"
                      />
                      <span>{store.label}</span>
                    </label>
                  );
                })
              ) : (
                <div className="col-span-full text-sm text-zinc-500 dark:text-zinc-400">
                  暂无可选门店
                </div>
              )}
            </div>
          </Field>

          <Field label="补充说明">
            <Textarea
              readOnly
              value="用户表单仅负责账号、资料和角色分配；新增后默认密码由后端统一生成。"
            />
          </Field>
          <button className="hidden" type="submit" />
        </form>
      )}
    </Modal>
  );
}

export function UserManagement() {
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const {
    showTenant,
    showStore,
    tenantId,
    storeId,
    tenantOptions,
    storeOptions,
    changeTenant,
    changeStore,
    isRoot,
  } = useTenantStoreFilter({ withStore: true });
  const [rows, setRows] = useState<UserPageVO[]>([]);
  const [roleOptions, setRoleOptions] = useState<RoleOption[]>([]);
  const [deptOptions, setDeptOptions] = useState<DeptOption[]>([]);
  const [selectedIds, setSelectedIds] = useState<EntityId[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [modalMode, setModalMode] = useState<UserMode | null>(null);
  const [activeUserId, setActiveUserId] = useState<EntityId | null>(null);
  const [total, setTotal] = useState(0);
  const [pageNum, setPageNum] = useState(1);
  const [pageSize] = useState(10);
  const [queryKeyword, setQueryKeyword] = useState('');
  const [queryStatus, setQueryStatus] = useState<'all' | StatusValue>('all');
  const debouncedKeyword = useDebounce(queryKeyword, 350);

  const selectedCount = selectedIds.length;
  const allChecked = rows.length > 0 && rows.every((row) => selectedIds.includes(row.id));

  const loadUsers = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const params: UserPageQuery = {
        pageNum,
        pageSize,
        keywords: debouncedKeyword.trim() || undefined,
        status: queryStatus === 'all' ? undefined : queryStatus,
        tenantId: isRoot ? tenantId || undefined : undefined,
        storeId: showStore ? storeId || undefined : undefined,
      };
      const [userPage, roles, depts] = await Promise.all([
        userApi.list(params),
        roleApi.options(),
        deptApi.options(),
      ]);
      setRows(userPage.list);
      setTotal(userPage.total);
      setRoleOptions(roles);
      setDeptOptions(depts);
      setSelectedIds([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedKeyword, pageNum, pageSize, queryStatus, isRoot, showStore, tenantId, storeId]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  function openCreate(): void {
    setModalMode('create');
    setActiveUserId(null);
  }

  function openEdit(userId: EntityId): void {
    setModalMode('edit');
    setActiveUserId(userId);
  }

  function closeModal(): void {
    setModalMode(null);
    setActiveUserId(null);
  }

  function toggleSelection(userId: EntityId): void {
    setSelectedIds((current) =>
      current.includes(userId) ? current.filter((item) => item !== userId) : [...current, userId],
    );
  }

  function toggleSelectAll(checked: boolean): void {
    setSelectedIds(checked ? rows.map((row) => row.id) : []);
  }

  async function handleDelete(ids: EntityId[]): Promise<void> {
    if (!ids.length) {
      return;
    }
    setSubmitLoading(true);
    try {
      await userApi.remove(ids);
      await loadUsers();
    } finally {
      setSubmitLoading(false);
      setConfirm(null);
    }
  }

  async function toggleStatus(row: UserPageVO): Promise<void> {
    await userApi.updateStatus(row.id, row.status === 1 ? 0 : 1);
    await loadUsers();
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 rounded-lg border border-salon-line bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-lg font-semibold">用户管理</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            列表、新增、编辑、删除和启停控制。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {hasPermission('system:user:add') ? (
            <Button icon={<Plus className="size-4" />} onClick={openCreate}>
              新增用户
            </Button>
          ) : null}
          {hasPermission('system:user:delete') ? (
            <Button
              disabled={selectedCount === 0}
              icon={<Trash2 className="size-4" />}
              onClick={() =>
                setConfirm({
                  title: '批量删除用户',
                  description: `确定删除已选中的 ${selectedCount} 名用户吗？`,
                  ids: selectedIds,
                })
              }
              variant="danger"
            >
              删除所选
            </Button>
          ) : null}
        </div>
      </div>

      <div className="rounded-lg border border-salon-line bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
            <Input
              className="pl-9"
              clearable
              placeholder="按用户名、昵称或手机号搜索"
              value={queryKeyword}
              onChange={(event) => setQueryKeyword(event.target.value)}
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
          {showStore ? (
            <Select
              className="md:w-44"
              value={storeId}
              onChange={(event) => changeStore(event.target.value)}
            >
              <option value="">全部门店</option>
              {storeOptions.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </Select>
          ) : null}
          <Select
            className="md:w-36"
            value={queryStatus}
            onChange={(event) =>
              setQueryStatus(
                event.target.value === 'all' ? 'all' : (Number(event.target.value) as StatusValue),
              )
            }
          >
            <option value="all">全部状态</option>
            {STATUS_OPTIONS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </Select>
          <Button
            className="lg:w-24"
            icon={<Search className="size-4" />}
            onClick={loadUsers}
            variant="secondary"
          >
            查询
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-salon-line bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        {loading ? (
          <PageLoading />
        ) : rows.length === 0 ? (
          <div className="p-4">
            <EmptyState description="还没有找到符合条件的用户。" title="暂无用户数据" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-900/60 dark:text-zinc-400">
                <tr>
                  <th className="w-10 px-4 py-3">
                    <input
                      checked={allChecked}
                      className="size-4 rounded border-salon-line text-salon-accent focus:ring-salon-accent"
                      onChange={(event) => toggleSelectAll(event.target.checked)}
                      type="checkbox"
                    />
                  </th>
                  <th className="px-4 py-3 font-medium">用户名</th>
                  <th className="px-4 py-3 font-medium">昵称</th>
                  <th className="px-4 py-3 font-medium">手机号</th>
                  <th className="px-4 py-3 font-medium">角色</th>
                  <th className="px-4 py-3 font-medium">状态</th>
                  <th className="px-4 py-3 font-medium">创建时间</th>
                  <th className="px-4 py-3 text-right font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    className="border-t border-salon-line text-zinc-700 hover:bg-slate-50/60 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-900/70"
                    key={row.id}
                  >
                    <td className="px-4 py-3">
                      <input
                        checked={selectedIds.includes(row.id)}
                        className="size-4 rounded border-salon-line text-salon-accent focus:ring-salon-accent"
                        onChange={() => toggleSelection(row.id)}
                        type="checkbox"
                      />
                    </td>
                    <td className="px-4 py-3 font-medium text-salon-ink dark:text-white">
                      {row.username}
                    </td>
                    <td className="px-4 py-3">{row.nickname || '-'}</td>
                    <td className="px-4 py-3">{row.phone || '-'}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {row.roleNames
                          ? row.roleNames.split(',').map((roleName) => (
                              <Badge key={roleName} tone="info">
                                {roleName}
                              </Badge>
                            ))
                          : '-'}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={row.status === 1 ? 'success' : 'danger'}>
                        {getStatusLabel(row.status)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">{row.createTime || '-'}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        {hasPermission('system:user:status') ? (
                          <Button
                            icon={
                              row.status === 1 ? (
                                <ToggleLeft className="size-4" />
                              ) : (
                                <ToggleRight className="size-4" />
                              )
                            }
                            onClick={() => void toggleStatus(row)}
                            size="sm"
                            variant="secondary"
                          >
                            {row.status === 1 ? '禁用' : '启用'}
                          </Button>
                        ) : null}
                        {hasPermission('system:user:edit') ? (
                          <Button
                            icon={<Pencil className="size-4" />}
                            onClick={() => openEdit(row.id)}
                            size="sm"
                            variant="secondary"
                          >
                            编辑
                          </Button>
                        ) : null}
                        {hasPermission('system:user:delete') ? (
                          <Button
                            icon={<Trash2 className="size-4" />}
                            onClick={() =>
                              setConfirm({
                                title: '删除用户',
                                description: `确定删除用户「${row.nickname || row.username}」吗？`,
                                ids: [row.id],
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
      </div>

      <div className="flex items-center justify-between text-sm text-zinc-500 dark:text-zinc-400">
        <span>共 {total} 条</span>
        <div className="flex items-center gap-2">
          <Button
            disabled={pageNum <= 1}
            onClick={() => setPageNum((current) => Math.max(1, current - 1))}
            variant="secondary"
          >
            上一页
          </Button>
          <span className="min-w-16 text-center">{pageNum}</span>
          <Button
            disabled={pageNum * pageSize >= total}
            onClick={() => setPageNum((current) => current + 1)}
            variant="secondary"
          >
            下一页
          </Button>
        </div>
      </div>

      {modalMode ? (
        <UserFormDialog
          mode={modalMode}
          deptOptions={deptOptions}
          onClose={closeModal}
          onSaved={loadUsers}
          open={Boolean(modalMode)}
          roleOptions={roleOptions}
          storeOptions={storeOptions}
          userId={activeUserId}
        />
      ) : null}

      <ConfirmDialog
        confirmLabel="删除"
        danger
        description={confirm ? confirm.description : ''}
        loading={submitLoading}
        onCancel={() => setConfirm(null)}
        onConfirm={() => void handleDelete(confirm?.ids ?? [])}
        open={Boolean(confirm)}
        title={confirm ? confirm.title : '删除用户'}
      />
    </section>
  );
}
