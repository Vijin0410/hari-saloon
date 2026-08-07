import { useCallback, useEffect, useState, type ReactElement } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  ChevronDown,
  ChevronRight,
  Edit,
  Plus,
  Search,
  ShieldPlus,
  Trash2,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { menuApi, roleApi } from '@/shared/api/modules/systemApi';
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
import { normalizeNumber } from '@/shared/lib/format';
import { useAuthStore } from '@/store/useAuthStore';
import { useTenantStoreFilter } from '@/features/system/model/useTenantStoreFilter';
import {
  collectMenuIds,
  getDataScopeLabel,
  getMenuTitle,
  getMenuTypeLabel,
  getStatusLabel,
  ROLE_MENU_TYPE_WEB,
} from '@/features/system/model/systemTypes';
import { roleFormSchema, type RoleFormValues } from '@/features/system/model/systemSchemas';
import type {
  EntityId,
  MenuVO,
  RolePageVO,
  StatusValue,
} from '@/features/system/model/systemTypes';
import type { RoleFormPayload } from '@/features/system/model/systemTypes';
import { DATA_SCOPE_OPTIONS, STATUS_OPTIONS } from '@/features/system/model/systemTypes';

/**
 * 角色管理面板，提供列表、增改删、启停和菜单权限分配。
 */
type RoleMode = 'create' | 'edit';

interface ConfirmState {
  title: string;
  description: string;
  ids: EntityId[];
}

function defaultRoleValues(): RoleFormValues {
  return {
    name: '',
    code: '',
    sort: 0,
    status: 1,
    dataScope: 1,
    deptIds: '',
  };
}

function toRoleFormValues(payload: RoleFormPayload): RoleFormValues {
  return {
    id: payload.id,
    name: payload.name ?? '',
    code: payload.code ?? '',
    sort: normalizeNumber(payload.sort, 0),
    status: normalizeNumber(payload.status, 1) as StatusValue,
    dataScope: normalizeNumber(payload.dataScope, 1) as RoleFormValues['dataScope'],
    deptIds: payload.deptIds ?? '',
  };
}

function toRolePayload(values: RoleFormValues): RoleFormPayload {
  return {
    id: values.id,
    name: values.name.trim(),
    code: values.code.trim(),
    sort: Number(values.sort),
    status: values.status,
    dataScope: values.dataScope,
    deptIds: values.deptIds?.trim() || null,
  };
}

function RoleFormDialog({
  mode,
  open,
  roleId,
  onClose,
  onSaved,
}: {
  mode: RoleMode;
  open: boolean;
  roleId: EntityId | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [loadingForm, setLoadingForm] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [isPreset, setIsPreset] = useState(false);
  const {
    formState: { errors },
    handleSubmit,
    register,
    reset,
    watch,
  } = useForm<RoleFormValues>({
    resolver: zodResolver(roleFormSchema),
    defaultValues: defaultRoleValues(),
  });
  const dataScope = watch('dataScope');

  useEffect(() => {
    if (!open) {
      return;
    }

    if (mode === 'create') {
      reset(defaultRoleValues());
      setIsPreset(false);
      return;
    }

    if (!roleId) {
      return;
    }

    let active = true;
    setLoadingForm(true);
    roleApi
      .getForm(roleId)
      .then((payload) => {
        if (active) {
          reset(toRoleFormValues(payload));
          setIsPreset(Boolean(payload.preset));
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
  }, [mode, open, reset, roleId]);

  async function handleSave(values: RoleFormValues): Promise<void> {
    setSubmitLoading(true);
    try {
      const payload = toRolePayload(values);
      if (mode === 'create') {
        await roleApi.create(payload);
      } else if (payload.id) {
        await roleApi.update(payload.id, payload);
      }
      onSaved();
      onClose();
    } finally {
      setSubmitLoading(false);
    }
  }

  return (
    <Modal
      description="角色用于控制用户能看到哪些页面和按钮。"
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
      title={mode === 'create' ? '新增角色' : '编辑角色'}
    >
      {loadingForm ? (
        <PageLoading />
      ) : (
        <form className="space-y-4" onSubmit={handleSubmit(handleSave)}>
          <div className="grid gap-4 md:grid-cols-2">
            <Field error={errors.name?.message} label="角色名称" required>
              <Input
                invalid={Boolean(errors.name)}
                placeholder="例如：门店管理员"
                {...register('name')}
              />
            </Field>
            <Field error={errors.code?.message} label="角色编码" required>
              <>
                <Input
                  disabled={isPreset}
                  invalid={Boolean(errors.code)}
                  placeholder="例如：STORE_ADMIN"
                  {...register('code')}
                />
                {isPreset ? (
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    系统预置角色编码不可修改。
                  </span>
                ) : null}
              </>
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

          <Field error={errors.dataScope?.message} label="数据范围" required>
            <Select
              invalid={Boolean(errors.dataScope)}
              {...register('dataScope', { valueAsNumber: true })}
            >
              {DATA_SCOPE_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </Select>
          </Field>

          {dataScope === 5 ? (
            <Field error={errors.deptIds?.message} label="自定义部门ID" required>
              <Textarea
                invalid={Boolean(errors.deptIds)}
                placeholder="多个部门 ID 用英文逗号分隔"
                {...register('deptIds')}
              />
            </Field>
          ) : (
            <Field label="自定义部门ID">
              <Textarea readOnly value="仅在数据范围选择「自定义部门」时启用。" />
            </Field>
          )}
          <button className="hidden" type="submit" />
        </form>
      )}
    </Modal>
  );
}

function MenuPermissionDialog({
  open,
  roleId,
  onClose,
  onSaved,
}: {
  open: boolean;
  roleId: EntityId | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [menuTree, setMenuTree] = useState<MenuVO[]>([]);
  const [selectedIds, setSelectedIds] = useState<EntityId[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [queryKeyword, setQueryKeyword] = useState('');
  const [queryPath, setQueryPath] = useState('');
  const [queryPerm, setQueryPerm] = useState('');
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open || !roleId) {
      return;
    }

    let active = true;
    setLoading(true);
    Promise.all([menuApi.list(), roleApi.menuIds(roleId, ROLE_MENU_TYPE_WEB)])
      .then(([menus, menuIds]) => {
        if (active) {
          setMenuTree(menus);
          setSelectedIds(menuIds);
          setCollapsedIds(new Set());
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [open, roleId]);

  function loadMenuTree(): void {
    setLoading(true);
    menuApi
      .list({
        title: queryKeyword.trim() || undefined,
        path: queryPath.trim() || undefined,
        perm: queryPerm.trim() || undefined,
      })
      .then((menus) => {
        setMenuTree(menus);
        setCollapsedIds(new Set());
      })
      .finally(() => {
        setLoading(false);
      });
  }

  function updateSelection(menu: MenuVO, checked: boolean): void {
    const menuIds = collectMenuIds([menu]);
    setSelectedIds((current) => {
      const next = checked
        ? Array.from(new Set([...current, ...menuIds]))
        : current.filter((id) => !menuIds.includes(id));
      return next;
    });
  }

  function toggleCollapse(id: string): void {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function renderMenuNodes(nodes: MenuVO[], depth = 0): ReactElement[] {
    return nodes.flatMap((node) => {
      const id = String(node.id);
      const checked = selectedIds.includes(node.id);
      const children = node.children ?? [];
      const hasChildren = children.length > 0;
      const collapsed = collapsedIds.has(id);
      return [
        <div
          className="flex items-start gap-2 rounded-md border border-salon-line bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
          key={id}
          style={{ marginLeft: depth * 14 }}
        >
          <div className="flex items-center gap-1">
            {hasChildren ? (
              <button
                className="text-zinc-400 transition hover:text-salon-accent"
                onClick={() => toggleCollapse(id)}
                type="button"
              >
                {collapsed ? (
                  <ChevronRight className="size-4" />
                ) : (
                  <ChevronDown className="size-4" />
                )}
              </button>
            ) : (
              <span className="inline-block w-4" />
            )}
            <input
              checked={checked}
              className="mt-0.5 size-4 rounded border-salon-line text-salon-accent focus:ring-salon-accent"
              onChange={(event) => updateSelection(node, event.target.checked)}
              type="checkbox"
            />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-salon-ink dark:text-zinc-100">
                {getMenuTitle(node)}
              </span>
              <Badge tone="info">{getMenuTypeLabel(node.type)}</Badge>
            </div>
            <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              {node.perm || node.path || '未配置权限标识'}
            </div>
          </div>
        </div>,
        ...(hasChildren && !collapsed ? renderMenuNodes(children, depth + 1) : []),
      ];
    });
  }

  async function handleSave(): Promise<void> {
    if (!roleId) {
      return;
    }
    setSubmitLoading(true);
    try {
      await roleApi.updateMenus(roleId, ROLE_MENU_TYPE_WEB, selectedIds);
      onSaved();
      onClose();
    } finally {
      setSubmitLoading(false);
    }
  }

  return (
    <Modal
      description="勾选页面和按钮节点后保存即可完成权限分配。"
      footer={
        <>
          <Button onClick={onClose} variant="secondary">
            取消
          </Button>
          <Button loading={submitLoading} onClick={handleSave}>
            保存权限
          </Button>
        </>
      }
      maxWidthClassName="max-w-3xl"
      onClose={onClose}
      open={open}
      title="菜单权限分配"
    >
      {loading ? (
        <PageLoading />
      ) : menuTree.length ? (
        <div className="space-y-3">
          <div className="grid gap-2 md:grid-cols-[1fr_1fr_1fr_auto]">
            <Input
              onChange={(event) => setQueryKeyword(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  loadMenuTree();
                }
              }}
              clearable
              placeholder="菜单名称"
              value={queryKeyword}
            />
            <Input
              onChange={(event) => setQueryPath(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  loadMenuTree();
                }
              }}
              clearable
              placeholder="路由路径"
              value={queryPath}
            />
            <Input
              onChange={(event) => setQueryPerm(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  loadMenuTree();
                }
              }}
              clearable
              placeholder="权限编码"
              value={queryPerm}
            />
            <Button icon={<Search className="size-4" />} onClick={loadMenuTree} variant="secondary">
              查询
            </Button>
          </div>
          <div className="max-h-[60vh] space-y-2 overflow-y-auto">{renderMenuNodes(menuTree)}</div>
        </div>
      ) : (
        <EmptyState description="菜单树为空。" title="暂无菜单" />
      )}
    </Modal>
  );
}

export function RoleManagement() {
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const { showTenant, tenantId, tenantOptions, changeTenant, isRoot } = useTenantStoreFilter();
  const [rows, setRows] = useState<RolePageVO[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [modalMode, setModalMode] = useState<RoleMode | null>(null);
  const [activeRoleId, setActiveRoleId] = useState<EntityId | null>(null);
  const [menuRoleId, setMenuRoleId] = useState<EntityId | null>(null);
  const [selectedIds, setSelectedIds] = useState<EntityId[]>([]);
  const [total, setTotal] = useState(0);
  const [pageNum, setPageNum] = useState(1);
  const [pageSize] = useState(10);
  const [queryKeyword, setQueryKeyword] = useState('');
  const debouncedKeyword = useDebounce(queryKeyword, 350);

  const selectedCount = selectedIds.length;

  const loadRoles = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const page = await roleApi.list({
        pageNum,
        pageSize,
        keywords: debouncedKeyword.trim() || undefined,
        tenantId: isRoot ? tenantId || undefined : undefined,
      });
      setRows(page.list);
      setTotal(page.total);
      setSelectedIds([]);
      setSelectedIds([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedKeyword, pageNum, pageSize, isRoot, tenantId]);

  useEffect(() => {
    void loadRoles();
  }, [loadRoles]);

  function openCreate(): void {
    setModalMode('create');
    setActiveRoleId(null);
  }

  function openEdit(roleId: EntityId): void {
    setModalMode('edit');
    setActiveRoleId(roleId);
  }

  function closeForm(): void {
    setModalMode(null);
    setActiveRoleId(null);
  }

  function openPermission(roleId: EntityId): void {
    setMenuRoleId(roleId);
  }

  function closePermission(): void {
    setMenuRoleId(null);
  }

  function toggleSelection(roleId: EntityId): void {
    setSelectedIds((current) =>
      current.includes(roleId) ? current.filter((item) => item !== roleId) : [...current, roleId],
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
      await roleApi.remove(ids);
      await loadRoles();
    } finally {
      setSubmitLoading(false);
      setConfirm(null);
    }
  }

  async function toggleStatus(row: RolePageVO): Promise<void> {
    await roleApi.updateStatus(row.id, row.status === 1 ? 0 : 1);
    await loadRoles();
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 rounded-lg border border-salon-line bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-lg font-semibold">角色管理</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            管理角色、数据范围和菜单权限。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {hasPermission('system:role:add') ? (
            <Button icon={<Plus className="size-4" />} onClick={openCreate}>
              新增角色
            </Button>
          ) : null}
          {hasPermission('system:role:delete') ? (
            <Button
              disabled={selectedCount === 0}
              icon={<Trash2 className="size-4" />}
              onClick={() =>
                setConfirm({
                  title: '批量删除角色',
                  description: `确定删除已选中的 ${selectedCount} 个角色吗？`,
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
              placeholder="按角色名称或编码搜索"
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
          <Button
            className="lg:w-24"
            icon={<Search className="size-4" />}
            onClick={loadRoles}
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
            <EmptyState description="没有匹配的角色。" title="暂无角色数据" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-900/60 dark:text-zinc-400">
                <tr>
                  <th className="w-10 px-4 py-3 font-medium">
                    <input
                      checked={rows.length > 0 && rows.every((row) => selectedIds.includes(row.id))}
                      className="size-4 rounded border-salon-line text-salon-accent focus:ring-salon-accent"
                      onChange={(event) => toggleSelectAll(event.target.checked)}
                      type="checkbox"
                    />
                  </th>
                  <th className="px-4 py-3 font-medium">角色名称</th>
                  <th className="px-4 py-3 font-medium">编码</th>
                  <th className="px-4 py-3 font-medium">排序</th>
                  <th className="px-4 py-3 font-medium">数据范围</th>
                  <th className="px-4 py-3 font-medium">状态</th>
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
                      {row.name}
                    </td>
                    <td className="px-4 py-3">{row.code}</td>
                    <td className="px-4 py-3">{row.sort ?? '-'}</td>
                    <td className="px-4 py-3">
                      <Badge tone="info">{getDataScopeLabel(row.dataScope)}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={row.status === 1 ? 'success' : 'danger'}>
                        {getStatusLabel(row.status)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        {hasPermission('system:role:status') ? (
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
                        {hasPermission('system:role:edit') ? (
                          <Button
                            icon={<Edit className="size-4" />}
                            onClick={() => openEdit(row.id)}
                            size="sm"
                            variant="secondary"
                          >
                            编辑
                          </Button>
                        ) : null}
                        {hasPermission('system:role:assign') ? (
                          <Button
                            icon={<ShieldPlus className="size-4" />}
                            onClick={() => openPermission(row.id)}
                            size="sm"
                            variant="soft"
                          >
                            权限分配
                          </Button>
                        ) : null}
                        {hasPermission('system:role:delete') ? (
                          <Button
                            icon={<Trash2 className="size-4" />}
                            onClick={() =>
                              setConfirm({
                                title: '删除角色',
                                description: `确定删除角色「${row.name}」吗？`,
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
        <RoleFormDialog
          mode={modalMode}
          onClose={closeForm}
          onSaved={loadRoles}
          open={Boolean(modalMode)}
          roleId={activeRoleId}
        />
      ) : null}

      <MenuPermissionDialog
        onClose={closePermission}
        onSaved={loadRoles}
        open={Boolean(menuRoleId)}
        roleId={menuRoleId}
      />

      <ConfirmDialog
        confirmLabel="删除"
        danger
        description={confirm ? confirm.description : ''}
        loading={submitLoading}
        onCancel={() => setConfirm(null)}
        onConfirm={() => void handleDelete(confirm?.ids ?? [])}
        open={Boolean(confirm)}
        title={confirm ? confirm.title : '删除角色'}
      />
    </section>
  );
}
