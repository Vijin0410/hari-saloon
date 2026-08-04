import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { ChevronDown, ChevronRight, FolderTree, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { menuApi } from '@/shared/api/modules/systemApi';
import { Badge } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';
import { EmptyState } from '@/shared/ui/EmptyState';
import { Field } from '@/shared/ui/Field';
import { IconPicker } from '@/shared/ui/IconPicker';
import { Input } from '@/shared/ui/Input';
import { Modal } from '@/shared/ui/Modal';
import { PageLoading } from '@/shared/ui/PageLoading';
import { Select } from '@/shared/ui/Select';
import { Textarea } from '@/shared/ui/Textarea';
import { normalizeBoolean, normalizeNumber } from '@/shared/lib/format';
import { useAuthStore } from '@/store/useAuthStore';
import {
  getMenuTitle,
  getMenuTypeLabel,
  MENU_TYPE_OPTIONS,
  type EntityId,
  type MenuFormPayload,
  type MenuVO,
  type MenuTypeValue,
} from '@/features/system/model/systemTypes';
import { menuFormSchema, type MenuFormValues } from '@/features/system/model/systemSchemas';

/**
 * 菜单管理面板，负责树形展示、增改删和菜单元信息编辑。
 */
type MenuMode = 'create' | 'edit';

interface ConfirmState {
  title: string;
  description: string;
  ids: EntityId[];
}

const MENU_TREE_COLLAPSED_CACHE_KEY = 'hari-salon-menu-management-collapsed-ids';

function defaultMenuValues(): MenuFormValues {
  return {
    parentId: '',
    name: '',
    type: 'MENU',
    path: '',
    component: '',
    redirect: '',
    perm: '',
    apiPath: '',
    remark: '',
    metaTitle: '',
    metaIcon: '',
    metaRank: 0,
    metaShowLink: true,
    metaShowParent: false,
    metaHidden: false,
    metaKeepAlive: false,
    metaAlwaysShow: false,
    metaFrameSrc: '',
    metaFrameLoading: false,
  };
}

function toMenuFormValues(payload: MenuFormPayload): MenuFormValues {
  return {
    id: payload.id,
    parentId: payload.parentId ? String(payload.parentId) : '',
    name: payload.name ?? '',
    type: payload.type ?? 'MENU',
    path: payload.path ?? '',
    component: payload.component ?? '',
    redirect: payload.redirect ?? '',
    perm: payload.perm ?? '',
    apiPath: payload.apiPath ?? '',
    remark: payload.remark ?? '',
    metaTitle: payload.meta?.title ?? '',
    metaIcon: payload.meta?.icon ?? '',
    metaRank: normalizeNumber(payload.meta?.rank, 0),
    metaShowLink: normalizeBoolean(payload.meta?.showLink),
    metaShowParent: normalizeBoolean(payload.meta?.showParent),
    metaHidden: normalizeBoolean(payload.meta?.hidden),
    metaKeepAlive: normalizeBoolean(payload.meta?.keepAlive),
    metaAlwaysShow: normalizeBoolean(payload.meta?.alwaysShow),
    metaFrameSrc: payload.meta?.frameSrc ?? '',
    metaFrameLoading: normalizeBoolean(payload.meta?.frameLoading),
  };
}

function toMenuPayload(values: MenuFormValues): MenuFormPayload {
  return {
    id: values.id,
    parentId: values.parentId || undefined,
    name: values.name.trim(),
    type: values.type as MenuTypeValue,
    path: values.path?.trim() || undefined,
    component: values.component?.trim() || null,
    redirect: values.redirect?.trim() || null,
    perm: values.perm?.trim() || null,
    apiPath: values.apiPath?.trim() || null,
    remark: values.remark?.trim() || null,
    meta: {
      title: values.metaTitle.trim(),
      icon: values.metaIcon?.trim() || undefined,
      rank: values.metaRank,
      showLink: values.metaShowLink,
      showParent: values.metaShowParent,
      hidden: values.metaHidden,
      keepAlive: values.metaKeepAlive,
      alwaysShow: values.metaAlwaysShow,
      frameSrc: values.metaFrameSrc?.trim() || undefined,
      frameLoading: values.metaFrameLoading,
    },
  };
}

function buildMenuOptions(
  nodes: MenuVO[],
  depth = 0,
  excludedMenuId?: EntityId | null,
): Array<{ value: EntityId; label: string }> {
  return nodes.flatMap((node) => {
    if (excludedMenuId && String(node.id) === String(excludedMenuId)) {
      return [];
    }

    const prefix = depth === 0 ? '' : `${'　'.repeat(depth)}└─ `;
    return [
      {
        value: String(node.id),
        label: `${prefix}${getMenuTitle(node)}`,
      },
      ...buildMenuOptions(node.children ?? [], depth + 1, excludedMenuId),
    ];
  });
}

function getMenuRank(node: MenuVO): number {
  return normalizeNumber(node.meta?.rank, 999);
}

function collectExpandableIds(nodes: MenuVO[]): Set<string> {
  return new Set(
    nodes.flatMap((node) => {
      const children = node.children ?? [];
      if (children.length === 0) {
        return [];
      }
      return [String(node.id), ...collectExpandableIds(children)];
    }),
  );
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function readCollapsedIdsCache(expandableIds: Set<string>): Set<string> | null {
  try {
    const raw = window.localStorage.getItem(MENU_TREE_COLLAPSED_CACHE_KEY);
    if (!raw) {
      return null;
    }
    const parsed: unknown = JSON.parse(raw);
    if (!isStringArray(parsed)) {
      return null;
    }
    return new Set(parsed.filter((id) => expandableIds.has(id)));
  } catch {
    return null;
  }
}

function writeCollapsedIdsCache(collapsedIds: Set<string>): void {
  try {
    window.localStorage.setItem(MENU_TREE_COLLAPSED_CACHE_KEY, JSON.stringify([...collapsedIds]));
  } catch {
    // localStorage 不可用时只保留当前页面内的展开状态。
  }
}

function MenuFormDialog({
  mode,
  open,
  menuId,
  parentId,
  menuTree,
  onClose,
  onSaved,
}: {
  mode: MenuMode;
  open: boolean;
  menuId: EntityId | null;
  parentId: EntityId | null;
  menuTree: MenuVO[];
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
  } = useForm<MenuFormValues>({
    resolver: zodResolver(menuFormSchema),
    defaultValues: defaultMenuValues(),
  });
  const parentOptions = useMemo(
    () => [{ value: '', label: '顶级菜单' }, ...buildMenuOptions(menuTree, 0, menuId)],
    [menuId, menuTree],
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    if (mode === 'create') {
      reset({ ...defaultMenuValues(), parentId: parentId ? String(parentId) : '' });
      return;
    }

    if (!menuId) {
      return;
    }

    let active = true;
    setLoadingForm(true);
    menuApi
      .getForm(menuId)
      .then((payload) => {
        if (active) {
          reset(toMenuFormValues(payload));
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
  }, [menuId, mode, open, parentId, reset]);

  async function handleSave(values: MenuFormValues): Promise<void> {
    setSubmitLoading(true);
    try {
      const payload = toMenuPayload(values);
      if (mode === 'create') {
        await menuApi.create(payload);
      } else if (payload.id) {
        await menuApi.update(payload.id, payload);
      }
      onSaved();
      onClose();
    } finally {
      setSubmitLoading(false);
    }
  }

  return (
    <Modal
      description="目录、菜单、外链和按钮都在这里维护。"
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
      maxWidthClassName="max-w-4xl"
      onClose={onClose}
      open={open}
      title={mode === 'create' ? '新增菜单' : '编辑菜单'}
    >
      {loadingForm ? (
        <PageLoading />
      ) : (
        <form className="space-y-4" onSubmit={handleSubmit(handleSave)}>
          <div className="grid gap-4 md:grid-cols-2">
            <Field error={errors.parentId?.message} label="上级菜单">
              <Select {...register('parentId')}>
                {parentOptions.map((item) => (
                  <option key={item.value || 'root'} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field error={errors.name?.message} label="菜单名称" required>
              <Input invalid={Boolean(errors.name)} placeholder="例如：系统管理" {...register('name')} />
            </Field>
            <Field error={errors.type?.message} label="菜单类型" required>
              <Select invalid={Boolean(errors.type)} {...register('type')}>
                {MENU_TYPE_OPTIONS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field error={errors.metaRank?.message} label="排序" required>
              <Input invalid={Boolean(errors.metaRank)} type="number" {...register('metaRank', { valueAsNumber: true })} />
            </Field>
            <Field error={errors.path?.message} label="路由路径">
              <Input invalid={Boolean(errors.path)} placeholder="/system" {...register('path')} />
            </Field>
            <Field error={errors.component?.message} label="组件路径">
              <Input invalid={Boolean(errors.component)} placeholder="Layout / system/user/index" {...register('component')} />
            </Field>
            <Field error={errors.redirect?.message} label="重定向">
              <Input invalid={Boolean(errors.redirect)} placeholder="/system/user" {...register('redirect')} />
            </Field>
            <Field error={errors.perm?.message} label="权限编码">
              <Input invalid={Boolean(errors.perm)} placeholder="system:user:list" {...register('perm')} />
            </Field>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field error={errors.apiPath?.message} label="接口路径">
              <Input invalid={Boolean(errors.apiPath)} placeholder="/api/v1/users" {...register('apiPath')} />
            </Field>
            <Field error={errors.metaTitle?.message} label="显示标题" required>
              <Input invalid={Boolean(errors.metaTitle)} placeholder="菜单标题" {...register('metaTitle')} />
            </Field>
            <Field error={errors.metaIcon?.message} label="图标">
              <IconPicker
                onChange={(name) => setValue('metaIcon', name, { shouldDirty: true })}
                placeholder="选择图标"
                value={watch('metaIcon')}
              />
            </Field>
            <Field error={errors.metaFrameSrc?.message} label="外链地址">
              <Input invalid={Boolean(errors.metaFrameSrc)} placeholder="https://..." {...register('metaFrameSrc')} />
            </Field>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="显示链接">
              <label className="flex items-center gap-2 text-sm">
                <input className="size-4 rounded border-salon-line text-salon-accent" type="checkbox" {...register('metaShowLink')} />
                <span>在侧边栏显示</span>
              </label>
            </Field>
            <Field label="显示父级">
              <label className="flex items-center gap-2 text-sm">
                <input className="size-4 rounded border-salon-line text-salon-accent" type="checkbox" {...register('metaShowParent')} />
                <span>保留父级菜单</span>
              </label>
            </Field>
            <Field label="隐藏菜单">
              <label className="flex items-center gap-2 text-sm">
                <input className="size-4 rounded border-salon-line text-salon-accent" type="checkbox" {...register('metaHidden')} />
                <span>不在菜单栏显示</span>
              </label>
            </Field>
            <Field label="缓存页面">
              <label className="flex items-center gap-2 text-sm">
                <input className="size-4 rounded border-salon-line text-salon-accent" type="checkbox" {...register('metaKeepAlive')} />
                <span>启用 keepAlive</span>
              </label>
            </Field>
            <Field label="总是显示">
              <label className="flex items-center gap-2 text-sm">
                <input className="size-4 rounded border-salon-line text-salon-accent" type="checkbox" {...register('metaAlwaysShow')} />
                <span>多级菜单始终展开</span>
              </label>
            </Field>
            <Field label="外链加载态">
              <label className="flex items-center gap-2 text-sm">
                <input className="size-4 rounded border-salon-line text-salon-accent" type="checkbox" {...register('metaFrameLoading')} />
                <span>iframe 加载提示</span>
              </label>
            </Field>
          </div>

          <Field error={errors.remark?.message} label="备注">
            <Textarea invalid={Boolean(errors.remark)} placeholder="可选备注" {...register('remark')} />
          </Field>
          <button className="hidden" type="submit" />
        </form>
      )}
    </Modal>
  );
}

export function MenuManagement() {
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const [rows, setRows] = useState<MenuVO[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [modalMode, setModalMode] = useState<MenuMode | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<EntityId | null>(null);
  const [parentId, setParentId] = useState<EntityId | null>(null);
  const [queryKeyword, setQueryKeyword] = useState('');
  const [queryPath, setQueryPath] = useState('');
  const [queryPerm, setQueryPerm] = useState('');
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());

  const loadMenus = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const menuList = await menuApi.list({
        keywords: queryKeyword.trim() || undefined,
        path: queryPath.trim() || undefined,
        perm: queryPerm.trim() || undefined,
      });
      setRows(menuList);
      const expandableIds = collectExpandableIds(menuList);
      const cachedCollapsedIds = readCollapsedIdsCache(expandableIds);
      setCollapsedIds(cachedCollapsedIds ?? expandableIds);
    } finally {
      setLoading(false);
    }
  }, [queryKeyword, queryPath, queryPerm]);

  // 首次挂载加载一次；后续由查询按钮 / 回车触发，避免输入即请求
  useEffect(() => {
    void loadMenus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleCollapse(id: string): void {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      writeCollapsedIdsCache(next);
      return next;
    });
  }

  function renderRows(nodes: MenuVO[], depth: number): ReactNode[] {
    return nodes.flatMap((node) => {
      const id = String(node.id);
      const children = node.children ?? [];
      const hasChildren = children.length > 0;
      const collapsed = collapsedIds.has(id);
      return [
        (
          <tr
            className="border-t border-salon-line text-zinc-700 hover:bg-slate-50/60 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-900/70"
            key={id}
          >
            <td className="px-4 py-3">
              {hasChildren ? (
                <button
                  className="flex items-center gap-2 text-left transition hover:text-salon-accent"
                  onClick={() => toggleCollapse(id)}
                  style={{ paddingLeft: depth * 18 }}
                  type="button"
                >
                  {collapsed ? <ChevronRight className="size-4 text-zinc-400" /> : <ChevronDown className="size-4 text-zinc-400" />}
                  <FolderTree className="size-4 text-zinc-400" />
                  <div className="font-medium text-salon-ink dark:text-white">{getMenuTitle(node)}</div>
                </button>
              ) : (
                <div className="flex items-center gap-2" style={{ paddingLeft: depth * 18 }}>
                  <span className="inline-block w-4" />
                  <FolderTree className="size-4 text-zinc-400" />
                  <div className="font-medium text-salon-ink dark:text-white">{getMenuTitle(node)}</div>
                </div>
              )}
            </td>
            <td className="px-4 py-3">
              <Badge tone="info">{getMenuTypeLabel(node.type)}</Badge>
            </td>
            <td className="px-4 py-3 tabular-nums">{getMenuRank(node)}</td>
            <td className="px-4 py-3">{node.path || '-'}</td>
            <td className="px-4 py-3">{node.perm || '-'}</td>
            <td className="px-4 py-3">
              <div className="flex justify-end gap-2">
                {hasPermission('system:menu:add') ? (
                  <Button
                    icon={<Plus className="size-4" />}
                    onClick={() => openCreate(node.id)}
                    size="sm"
                    variant="secondary"
                  >
                    新增子项
                  </Button>
                ) : null}
                {hasPermission('system:menu:edit') ? (
                  <Button
                    icon={<Pencil className="size-4" />}
                    onClick={() => openEdit(node.id)}
                    size="sm"
                    variant="secondary"
                  >
                    编辑
                  </Button>
                ) : null}
                {hasPermission('system:menu:delete') ? (
                  <Button
                    icon={<Trash2 className="size-4" />}
                    onClick={() => void handleRowDelete(node)}
                    size="sm"
                    variant="danger"
                  >
                    删除
                  </Button>
                ) : null}
              </div>
            </td>
          </tr>
        ),
        ...(hasChildren && !collapsed ? renderRows(children, depth + 1) : []),
      ];
    });
  }

  function openCreate(parentMenuId: EntityId | null = null): void {
    setModalMode('create');
    setActiveMenuId(null);
    setParentId(parentMenuId);
  }

  function openEdit(menuId: EntityId): void {
    setModalMode('edit');
    setActiveMenuId(menuId);
    setParentId(null);
  }

  function closeForm(): void {
    setModalMode(null);
    setActiveMenuId(null);
    setParentId(null);
  }

  async function handleDelete(ids: EntityId[]): Promise<void> {
    if (!ids.length) {
      return;
    }
    setSubmitLoading(true);
    try {
      await menuApi.remove(ids);
      await loadMenus();
    } finally {
      setSubmitLoading(false);
      setConfirm(null);
    }
  }

  async function handleRowDelete(row: MenuVO): Promise<void> {
    setConfirm({
      title: '删除菜单',
      description: `确定删除菜单「${getMenuTitle(row)}」吗？`,
      ids: [row.id],
    });
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 rounded-lg border border-salon-line bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-lg font-semibold">菜单管理</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">树形菜单、按钮权限和路由元信息维护。</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {hasPermission('system:menu:add') ? (
            <Button icon={<Plus className="size-4" />} onClick={() => openCreate()}>
              新增菜单
            </Button>
          ) : null}
        </div>
      </div>

      <div className="rounded-lg border border-salon-line bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto]">
          <Input
            onChange={(event) => setQueryKeyword(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                void loadMenus();
              }
            }}
            placeholder="菜单名称"
            value={queryKeyword}
          />
          <Input
            onChange={(event) => setQueryPath(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                void loadMenus();
              }
            }}
            placeholder="路由路径"
            value={queryPath}
          />
          <Input
            onChange={(event) => setQueryPerm(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                void loadMenus();
              }
            }}
            placeholder="权限编码"
            value={queryPerm}
          />
          <Button
            className="lg:w-24"
            icon={<Search className="size-4" />}
            onClick={loadMenus}
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
            <EmptyState description="没有找到任何菜单节点。" title="暂无菜单数据" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-900/60 dark:text-zinc-400">
                <tr>
                  <th className="px-4 py-3 font-medium">名称</th>
                  <th className="px-4 py-3 font-medium">类型</th>
                  <th className="px-4 py-3 font-medium">Rank</th>
                  <th className="px-4 py-3 font-medium">路径</th>
                  <th className="px-4 py-3 font-medium">权限</th>
                  <th className="px-4 py-3 text-right font-medium">操作</th>
                </tr>
              </thead>
              <tbody>{renderRows(rows, 0)}</tbody>
            </table>
          </div>
        )}
      </div>

      {modalMode ? (
        <MenuFormDialog
          mode={modalMode}
          menuId={activeMenuId}
          menuTree={rows}
          onClose={closeForm}
          onSaved={loadMenus}
          open={Boolean(modalMode)}
          parentId={parentId}
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
        title={confirm ? confirm.title : '删除菜单'}
      />
    </section>
  );
}
