import { useCallback, useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Search, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import {
  memberApi,
  memberBalanceApi,
  memberLevelApi,
  memberPointApi,
  memberTagApi,
} from '@/shared/api/modules/memberApi';
import type {
  MemberBalanceAdjustPayload,
  MemberBalanceLogVO,
  MemberBalanceVO,
  MemberDetailVO,
  MemberFormPayload,
  MemberLevelOption,
  MemberPageVO,
  MemberPointAdjustPayload,
  MemberPointLogVO,
  MemberProfilePayload,
  MemberTagOption,
} from '@/features/member/model/memberTypes';
import { memberFormSchema, type MemberFormValues } from '@/features/member/model/memberSchemas';
import { dictApi } from '@/shared/api/modules/systemApi';
import type { DictOption } from '@/features/system/model/dictTypes';
import type { StoreOption } from '@/features/system/model/systemTypes';
import { Badge } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';
import { Drawer } from '@/shared/ui/Drawer';
import { EmptyState } from '@/shared/ui/EmptyState';
import { Field } from '@/shared/ui/Field';
import { Input } from '@/shared/ui/Input';
import { Modal } from '@/shared/ui/Modal';
import { PageLoading } from '@/shared/ui/PageLoading';
import { Pagination } from '@/shared/ui/Pagination';
import { Select } from '@/shared/ui/Select';
import { StatCard } from '@/shared/ui/StatCard';
import { Textarea } from '@/shared/ui/Textarea';
import { useDebounce } from '@/shared/hooks/useDebounce';
import { formatCurrency } from '@/shared/lib/format';
import { useAuthStore } from '@/store/useAuthStore';
import { useTenantStoreFilter } from '@/features/system/model/useTenantStoreFilter';
import { cn } from '@/shared/lib/cn';

type MemberFormMode = 'create' | 'edit';

function defaultMemberValues(storeId = ''): MemberFormValues {
  return {
    name: '',
    phone: '',
    gender: 0,
    birthday: '',
    levelId: '',
    source: '',
    storeId,
    status: 1,
    remark: '',
  };
}

function toMemberFormValues(d: MemberDetailVO): MemberFormValues {
  return {
    name: d.name ?? '',
    phone: d.phone ?? '',
    gender: (d.gender ?? 0) as 0 | 1 | 2,
    birthday: d.birthday ?? '',
    levelId: d.levelId != null ? String(d.levelId) : '',
    source: d.source ?? '',
    storeId: d.storeId != null ? String(d.storeId) : '',
    status: (d.status ?? 1) as 0 | 1,
    remark: d.remark ?? '',
  };
}

function toMemberPayload(v: MemberFormValues): MemberFormPayload {
  return {
    name: v.name.trim(),
    phone: v.phone?.trim() || undefined,
    gender: v.gender,
    birthday: v.birthday || undefined,
    levelId: v.levelId || undefined,
    source: v.source || undefined,
    storeId: v.storeId,
    status: v.status,
    remark: v.remark?.trim() || undefined,
  };
}

function MemberFormDialog({
  mode,
  open,
  memberId,
  levelOptions,
  sourceOptions,
  storeOptions,
  onClose,
  onSaved,
}: {
  mode: MemberFormMode;
  open: boolean;
  memberId: string | null;
  levelOptions: MemberLevelOption[];
  sourceOptions: DictOption[];
  storeOptions: StoreOption[];
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
  } = useForm<MemberFormValues>({
    resolver: zodResolver(memberFormSchema),
    defaultValues: defaultMemberValues(),
  });

  useEffect(() => {
    if (!open) {
      return;
    }
    if (mode === 'create') {
      reset(defaultMemberValues(storeOptions[0]?.value ?? ''));
      return;
    }
    if (!memberId) {
      return;
    }
    let active = true;
    setLoadingForm(true);
    memberApi
      .detail(memberId)
      .then((d) => {
        if (active) {
          reset(toMemberFormValues(d));
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
  }, [mode, open, memberId, reset, storeOptions]);

  async function handleSave(values: MemberFormValues): Promise<void> {
    setSubmitLoading(true);
    try {
      const payload = toMemberPayload(values);
      if (mode === 'create') {
        await memberApi.create(payload);
      } else if (memberId) {
        await memberApi.update(memberId, payload);
      }
      onSaved();
      onClose();
    } finally {
      setSubmitLoading(false);
    }
  }

  return (
    <Modal
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
      title={mode === 'create' ? '新增会员' : '编辑会员'}
    >
      {loadingForm ? (
        <PageLoading />
      ) : (
        <form className="grid gap-3 md:grid-cols-2" onSubmit={handleSubmit(handleSave)}>
          <Field error={errors.name?.message} label="姓名" required>
            <Input invalid={Boolean(errors.name)} placeholder="会员姓名" {...register('name')} />
          </Field>
          <Field error={errors.phone?.message} label="手机">
            <Input invalid={Boolean(errors.phone)} placeholder="11 位手机号" {...register('phone')} />
          </Field>
          <Field label="性别">
            <Select {...register('gender', { valueAsNumber: true })}>
              <option value={0}>未知</option>
              <option value={1}>男</option>
              <option value={2}>女</option>
            </Select>
          </Field>
          <Field label="生日">
            <Input type="date" {...register('birthday')} />
          </Field>
          <Field label="会员等级">
            <Select {...register('levelId')}>
              <option value="">请选择等级</option>
              {levelOptions.map((l) => (
                <option key={l.id} value={String(l.id)}>
                  {l.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="来源">
            <Select {...register('source')}>
              <option value="">请选择来源</option>
              {sourceOptions.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field error={errors.storeId?.message} label="所属门店" required>
            <Select invalid={Boolean(errors.storeId)} {...register('storeId')}>
              <option value="">请选择所属门店</option>
              {storeOptions.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="状态">
            <Select {...register('status', { valueAsNumber: true })}>
              <option value={1}>正常</option>
              <option value={0}>停用</option>
            </Select>
          </Field>
          <Field className="md:col-span-2" label="备注">
            <Input placeholder="会员备注（可选）" {...register('remark')} />
          </Field>
          <button className="hidden" type="submit" />
        </form>
      )}
    </Modal>
  );
}

/** 积分变动类型中文标签（与后端 SalonMemberPointLog.changeType 对应） */
const POINT_CHANGE_TYPE_LABEL: Record<number, string> = {
  1: '消费获得',
  2: '充值获得',
  3: '活动赠送',
  4: '手工调整',
  5: '抵扣消费',
  6: '兑换商品',
  7: '手工扣减',
  8: '过期清零',
};

export function MemberPage() {
  const hasPermission = useAuthStore((s) => s.hasPermission);
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
  const [rows, setRows] = useState<MemberPageVO[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [pageNum, setPageNum] = useState(1);
  const [keyword, setKeyword] = useState('');
  const debounced = useDebounce(keyword, 300);
  const [levelOptions, setLevelOptions] = useState<MemberLevelOption[]>([]);
  const [tagOptions, setTagOptions] = useState<MemberTagOption[]>([]);
  const [sourceOptions, setSourceOptions] = useState<DictOption[]>([]);
  const [filterLevelId, setFilterLevelId] = useState('');
  const [filterTagId, setFilterTagId] = useState('');

  // 编辑表单
  const [editMode, setEditMode] = useState<MemberFormMode | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [confirmIds, setConfirmIds] = useState<string[] | null>(null);

  // 详情
  const [detail, setDetail] = useState<MemberDetailVO | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // 余额调整
  const [balanceAdjustOpen, setBalanceAdjustOpen] = useState(false);
  const [balanceAdjust, setBalanceAdjust] = useState<MemberBalanceAdjustPayload>({
    balanceType: 1,
    changeAmount: 0,
    remark: '',
  });
  // 变动金额：方向 Tab 决定正负，输入正数（支持两位小数）；扣除兼容负号
  const [balanceDirection, setBalanceDirection] = useState<'add' | 'deduct'>('add');
  const [balanceInput, setBalanceInput] = useState('0');
  const [balanceError, setBalanceError] = useState('');
  const [balanceRemarkError, setBalanceRemarkError] = useState('');

  // 积分调整
  const [pointAdjustOpen, setPointAdjustOpen] = useState(false);
  const [pointAdjust, setPointAdjust] = useState<MemberPointAdjustPayload>({
    changePoints: 0,
    remark: '',
  });
  // 变动积分：按钮选择新增/扣除方向，输入用字符串承载中间态；
  // 扣除模式兼容用户输入负号（-100 与 100 均按扣除 100 处理），失焦兜底回 "0"
  const [pointDirection, setPointDirection] = useState<'add' | 'deduct'>('add');
  const [pointInput, setPointInput] = useState('0');
  const [pointError, setPointError] = useState('');
  const [pointRemarkError, setPointRemarkError] = useState('');

  // 余额流水
  const [balanceLogs, setBalanceLogs] = useState<MemberBalanceLogVO[]>([]);
  const [balanceLogOpen, setBalanceLogOpen] = useState(false);

  // 积分流水
  const [pointLogs, setPointLogs] = useState<MemberPointLogVO[]>([]);
  const [pointLogOpen, setPointLogOpen] = useState(false);

  // 标签编辑
  const [tagEditOpen, setTagEditOpen] = useState(false);
  const [tagEditIds, setTagEditIds] = useState<string[]>([]);

  // 备注编辑
  const [profileEditOpen, setProfileEditOpen] = useState(false);
  const [profileEdit, setProfileEdit] = useState<MemberProfilePayload>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const memberPage = await memberApi.list({
        pageNum,
        pageSize: 10,
        keywords: debounced || undefined,
        tenantId: isRoot ? tenantId || undefined : undefined,
        storeId: showStore ? storeId || undefined : undefined,
        levelId: filterLevelId || undefined,
        tagId: filterTagId || undefined,
      });
      setRows(memberPage.list ?? []);
      setTotal(memberPage.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, [pageNum, debounced, isRoot, showStore, tenantId, storeId, filterLevelId, filterTagId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void memberLevelApi.options().then((data) => setLevelOptions(data ?? []));
    void memberTagApi.options().then((data) => setTagOptions(data ?? []));
    void dictApi.options('member_source').then((data) => setSourceOptions(data ?? []));
  }, []);

  async function openDetail(id: string): Promise<void> {
    const d = await memberApi.detail(id);
    setDetail(d);
    setDetailOpen(true);
  }

  function openEdit(id: string): void {
    setEditMode('edit');
    setEditId(id);
  }

  function openCreate(): void {
    setEditMode('create');
    setEditId(null);
  }

  function closeEdit(): void {
    setEditMode(null);
    setEditId(null);
  }

  async function refreshDetail(): Promise<void> {
    if (detail) {
      const d = await memberApi.detail(String(detail.id));
      setDetail(d);
    }
  }

  async function submitBalanceAdjust(): Promise<void> {
    if (!detail) {
      return;
    }
    // 取绝对值后按方向取正/负；扣除兼容用户输入的负号
    const abs = Math.abs(Number(balanceInput) || 0);
    const before = balance.availableBalance ?? detail.balance ?? 0;
    if (abs <= 0) {
      setBalanceError('请输入调整数量');
      return;
    }
    if (!balanceAdjust.remark.trim()) {
      setBalanceRemarkError('请输入调整原因');
      return;
    }
    const changeAmount = balanceDirection === 'deduct' ? -abs : abs;
    const delta = (balanceAdjust.balanceType === 3 ? -1 : 1) * changeAmount;
    if (before + delta < 0) {
      setBalanceError('调整后可用余额不足');
      return;
    }
    setBalanceError('');
    setBalanceRemarkError('');
    try {
      await memberBalanceApi.adjust(String(detail.id), { ...balanceAdjust, changeAmount });
    } catch (err) {
      setBalanceError(err instanceof Error ? err.message : '调整失败');
      return;
    }
    setBalanceAdjustOpen(false);
    setBalanceAdjust({ balanceType: 1, changeAmount: 0, remark: '' });
    setBalanceInput('0');
    setBalanceDirection('add');
    setBalanceError('');
    setBalanceRemarkError('');
    await refreshDetail();
    await load();
  }

  async function submitPointAdjust(): Promise<void> {
    if (!detail) {
      return;
    }
    // 取绝对值后按方向取正/负；扣除兼容用户输入的负号
    const abs = Math.abs(Number(pointInput) || 0);
    const before = detail.points ?? 0;
    if (abs <= 0) {
      setPointError('请输入调整数量');
      return;
    }
    if (!pointAdjust.remark.trim()) {
      setPointRemarkError('请输入调整原因');
      return;
    }
    if (pointDirection === 'deduct' && before - abs < 0) {
      setPointError('积分不足，无法扣除该数量');
      return;
    }
    setPointError('');
    setPointRemarkError('');
    const changePoints = pointDirection === 'deduct' ? -abs : abs;
    // 扣除不带有效期；type="date" 的 value 为 YYYY-MM-DD，与后端 LocalDate 一致
    const expireTime = pointDirection === 'add' ? pointAdjust.expireTime : undefined;
    try {
      await memberPointApi.adjust(String(detail.id), { ...pointAdjust, changePoints, expireTime });
    } catch (err) {
      setPointError(err instanceof Error ? err.message : '调整失败');
      return;
    }
    setPointAdjustOpen(false);
    setPointAdjust({ changePoints: 0, remark: '' });
    setPointInput('0');
    setPointDirection('add');
    setPointError('');
    setPointRemarkError('');
    await refreshDetail();
    await load();
  }

  async function openBalanceLogs(): Promise<void> {
    if (!detail) {
      return;
    }
    const data = await memberBalanceApi.logs({ pageNum: 1, pageSize: 50, memberId: detail.id });
    setBalanceLogs(data.list ?? []);
    setBalanceLogOpen(true);
  }

  async function openPointLogs(): Promise<void> {
    if (!detail) {
      return;
    }
    const data = await memberPointApi.logs({ pageNum: 1, pageSize: 50, memberId: detail.id });
    setPointLogs(data.list ?? []);
    setPointLogOpen(true);
  }

  async function openTagEdit(): Promise<void> {
    if (!detail) {
      return;
    }
    const current = await memberApi.tags(String(detail.id));
    setTagEditIds(current.map((t) => String(t.id)));
    setTagEditOpen(true);
  }

  async function submitTagEdit(): Promise<void> {
    if (!detail) {
      return;
    }
    await memberApi.setTags(String(detail.id), tagEditIds);
    setTagEditOpen(false);
    await refreshDetail();
    await load();
  }

  function openProfileEdit(): void {
    if (!detail?.profile) {
      setProfileEdit({});
    } else {
      const p = detail.profile;
      setProfileEdit({
        hairQuality: p.hairQuality,
        preferredStyle: p.preferredStyle,
        preferredStylistId: p.preferredStylistId,
        allergy: p.allergy,
        taboo: p.taboo,
        remark: p.remark,
      });
    }
    setProfileEditOpen(true);
  }

  async function submitProfileEdit(): Promise<void> {
    if (!detail) {
      return;
    }
    await memberApi.updateProfile(String(detail.id), profileEdit);
    setProfileEditOpen(false);
    await refreshDetail();
  }

  const balance: MemberBalanceVO = detail?.balanceDetail ?? {};

  // 积分调整实时预览：当前余额 / 解析后的本次数量 / 调整后余额（扣除为负时提示不足）
  const currentPoints = detail?.points ?? 0;
  const adjustAmount = Math.abs(Number(pointInput) || 0);
  const afterPoints =
    pointDirection === 'add' ? currentPoints + adjustAmount : currentPoints - adjustAmount;

  // 余额调整实时预览：当前可用 / 本次变动 / 调整后可用（冻结桶方向反向）
  const currentAvailable = balance.availableBalance ?? detail?.balance ?? 0;
  const balanceAdjustAmount = Math.abs(Number(balanceInput) || 0);
  const balanceChangeAmount =
    balanceDirection === 'deduct' ? -balanceAdjustAmount : balanceAdjustAmount;
  const availableDelta = (balanceAdjust.balanceType === 3 ? -1 : 1) * balanceChangeAmount;
  const afterAvailable = currentAvailable + availableDelta;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">会员管理</h1>
          <p className="text-sm text-zinc-500">
            列表按租户和门店数据范围过滤；余额/积分变动走流水接口。
          </p>
        </div>
        {hasPermission('biz:member:add') ? (
          <Button icon={<Plus className="size-4" />} onClick={openCreate}>
            新增会员
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
              placeholder="姓名/手机号/门店"
              value={keyword}
            />
          </div>
          {showTenant ? (
            <Select
              className="md:w-44"
              value={tenantId}
              onChange={(e) => changeTenant(e.target.value)}
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
              onChange={(e) => changeStore(e.target.value)}
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
            className="md:w-40"
            value={filterLevelId}
            onChange={(e) => setFilterLevelId(e.target.value)}
          >
            <option value="">全部等级</option>
            {levelOptions.map((l) => (
              <option key={l.id} value={String(l.id)}>
                {l.name}
              </option>
            ))}
          </Select>
          <Select
            className="md:w-40"
            value={filterTagId}
            onChange={(e) => setFilterTagId(e.target.value)}
          >
            <option value="">全部标签</option>
            {tagOptions.map((t) => (
              <option key={t.id} value={String(t.id)}>
                {t.name}
              </option>
            ))}
          </Select>
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
      ) : rows.length === 0 ? (
        <EmptyState title="暂无会员" description="当前门店权限范围内还没有会员。" />
      ) : (
        <div className="overflow-hidden rounded-lg border border-salon-line dark:border-zinc-800">
          <table className="min-w-full divide-y divide-salon-line text-sm dark:divide-zinc-800">
            <thead className="bg-slate-50 dark:bg-zinc-900/60">
              <tr>
                <th className="px-4 py-3 text-left font-medium">姓名</th>
                <th className="px-4 py-3 text-left font-medium">手机</th>
                <th className="px-4 py-3 text-left font-medium">门店</th>
                <th className="px-4 py-3 text-left font-medium">等级</th>
                <th className="px-4 py-3 text-left font-medium">余额</th>
                <th className="px-4 py-3 text-left font-medium">积分</th>
                <th className="px-4 py-3 text-left font-medium">标签</th>
                <th className="px-4 py-3 text-left font-medium">状态</th>
                <th className="px-4 py-3 text-right font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-salon-line dark:divide-zinc-800">
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="px-4 py-3">{row.name}</td>
                  <td className="px-4 py-3">{row.phone || '-'}</td>
                  <td className="px-4 py-3">{row.storeName || '-'}</td>
                  <td className="px-4 py-3">{row.levelName || '-'}</td>
                  <td className="px-4 py-3">{typeof row.balance === 'number' ? row.balance : 0}</td>
                  <td className="px-4 py-3">{typeof row.points === 'number' ? row.points : 0}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {(row.tagNames ?? []).slice(0, 3).map((t) => (
                        <Badge key={t} tone="info">
                          {t}
                        </Badge>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={row.status === 1 ? 'success' : 'danger'}>
                      {row.status === 1 ? '正常' : '停用'}
                    </Badge>
                  </td>
                  <td className="space-x-2 px-4 py-3 text-right">
                    {hasPermission('biz:member:view') ? (
                      <Button onClick={() => void openDetail(row.id)} size="sm" variant="secondary">
                        详情
                      </Button>
                    ) : null}
                    {hasPermission('biz:member:edit') ? (
                      <Button onClick={() => void openEdit(row.id)} size="sm" variant="secondary">
                        编辑
                      </Button>
                    ) : null}
                    {hasPermission('biz:member:delete') ? (
                      <Button
                        icon={<Trash2 className="size-4" />}
                        onClick={() => setConfirmIds([row.id])}
                        size="sm"
                        variant="secondary"
                      >
                        删除
                      </Button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination pageNum={pageNum} pageSize={10} total={total} onChange={setPageNum} />

      {/* 新增/编辑表单 */}
      <MemberFormDialog
        levelOptions={levelOptions}
        memberId={editId}
        mode={editMode ?? 'create'}
        onClose={closeEdit}
        onSaved={() => void load()}
        open={editMode !== null}
        sourceOptions={sourceOptions}
        storeOptions={storeOptions}
      />

      {/* 详情 */}
      <Drawer
        onClose={() => setDetailOpen(false)}
        open={detailOpen}
        title="会员详情"
        width="560px"
        footer={
          <Button onClick={() => setDetailOpen(false)} variant="secondary">
            关闭
          </Button>
        }
      >
        {detail ? (
          <div className="space-y-4">
            {/* 会员基础信息 */}
            <Card>
              <div className="flex items-center gap-4">
                <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-salon-accent text-xl font-semibold text-white">
                  {detail.name.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-lg font-semibold text-salon-ink dark:text-zinc-100">
                      {detail.name}
                    </span>
                    <Badge tone="success">{detail.levelName || '普通会员'}</Badge>
                    <Badge
                      tone={detail.status === 1 ? 'neutral' : 'danger'}
                      className={
                        detail.status === 1
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300'
                          : undefined
                      }
                    >
                      {detail.status === 1 ? '正常' : '停用'}
                    </Badge>
                  </div>
                  <div className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                    {detail.phone || '未绑定手机'}
                  </div>
                </div>
              </div>
            </Card>

            {/* 账户资产：余额 + 积分两大卡片 */}
            <div className="grid grid-cols-2 gap-4">
              <StatCard
                label="账户余额"
                value={formatCurrency(balance.availableBalance ?? detail.balance ?? 0)}
                tone="accent"
                hint="可用余额"
                extra={
                  <div className="flex shrink-0 gap-2">
                    {hasPermission('biz:memberBalance:adjust') ? (
                      <Button
                        size="sm"
                        onClick={() => {
                          setBalanceAdjust({ balanceType: 1, changeAmount: 0, remark: '' });
                          setBalanceInput('0');
                          setBalanceDirection('add');
                          setBalanceError('');
                          setBalanceRemarkError('');
                          setBalanceAdjustOpen(true);
                        }}
                      >
                        调整余额
                      </Button>
                    ) : null}
                    {hasPermission('biz:memberBalance:log') ? (
                      <Button size="sm" variant="secondary" onClick={() => void openBalanceLogs()}>
                        余额流水
                      </Button>
                    ) : null}
                  </div>
                }
              >
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <div className="text-zinc-500 dark:text-zinc-400">最近充值</div>
                    <div className="mt-0.5 text-zinc-700 dark:text-zinc-200">
                      {balance.lastRechargeTime || '暂无记录'}
                    </div>
                  </div>
                  <div>
                    <div className="text-zinc-500 dark:text-zinc-400">最近消费</div>
                    <div className="mt-0.5 text-zinc-700 dark:text-zinc-200">
                      {balance.lastConsumeTime || '暂无记录'}
                    </div>
                  </div>
                </div>
              </StatCard>

              <StatCard
                label="积分账户"
                value={detail.points ?? 0}
                tone="accent"
                hint="当前积分"
                extra={
                  <div className="flex shrink-0 gap-2">
                    {hasPermission('biz:memberPoint:adjust') ? (
                      <Button
                        size="sm"
                        onClick={() => {
                          setPointAdjust({ changePoints: 0, remark: '' });
                          setPointInput('0');
                          setPointDirection('add');
                          setPointError('');
                          setPointRemarkError('');
                          setPointAdjustOpen(true);
                        }}
                      >
                        调整积分
                      </Button>
                    ) : null}
                    {hasPermission('biz:memberPoint:log') ? (
                      <Button size="sm" variant="secondary" onClick={() => void openPointLogs()}>
                        积分流水
                      </Button>
                    ) : null}
                  </div>
                }
              >
                <div className="text-xs text-zinc-400 dark:text-zinc-500">
                  积分按批次过期，变动记录详见流水
                </div>
              </StatCard>
            </div>

            {/* 余额明细四宫格 */}
            <Card title="余额明细">
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: '本金余额', value: balance.principalBalance },
                  { label: '赠送余额', value: balance.giftBalance },
                  { label: '冻结金额', value: balance.frozenBalance },
                  { label: '可用余额', value: balance.availableBalance },
                ].map((s) => (
                  <div key={s.label} className="rounded-md bg-stone-50 p-3 dark:bg-zinc-900">
                    <div className="text-xs text-zinc-500 dark:text-zinc-400">{s.label}</div>
                    <div className="mt-1 text-lg font-semibold text-salon-ink dark:text-zinc-100">
                      {formatCurrency(s.value)}
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* 会员标签 */}
            <Card
              title="会员标签"
              extra={
                hasPermission('biz:member:tag') ? (
                  <Button size="sm" variant="secondary" onClick={() => void openTagEdit()}>
                    编辑
                  </Button>
                ) : null
              }
            >
              {(detail.tags ?? []).length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {(detail.tags ?? []).map((t) => (
                    <Badge key={t.id} tone="info">
                      {t.name}
                    </Badge>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-zinc-400">暂无标签</div>
              )}
            </Card>

            {/* 会员偏好 */}
            <Card
              title="会员偏好"
              extra={
                hasPermission('biz:member:edit') ? (
                  <Button size="sm" variant="secondary" onClick={openProfileEdit}>
                    编辑
                  </Button>
                ) : null
              }
            >
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                {[
                  { label: '发质', value: detail.profile?.hairQuality },
                  { label: '偏好发型', value: detail.profile?.preferredStyle },
                  { label: '常用发型师', value: detail.profile?.preferredStylistName },
                  { label: '过敏信息', value: detail.profile?.allergy },
                  { label: '禁忌', value: detail.profile?.taboo },
                ].map((f) => (
                  <div key={f.label}>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400">{f.label}</div>
                    <div className="mt-0.5 text-zinc-800 dark:text-zinc-100">
                      {f.value || '暂无'}
                    </div>
                  </div>
                ))}
                <div className="col-span-2">
                  <div className="text-xs text-zinc-500 dark:text-zinc-400">扩展备注</div>
                  <div className="mt-0.5 text-zinc-800 dark:text-zinc-100">
                    {detail.profile?.remark || '暂无'}
                  </div>
                </div>
              </div>
            </Card>
          </div>
        ) : null}
      </Drawer>

      {/* 余额调整 */}
      <Modal
        description="调整将写入余额流水，请确认桶位、方向与数量后提交。"
        footer={
          <>
            <Button onClick={() => setBalanceAdjustOpen(false)} variant="secondary">
              取消
            </Button>
            <Button
              onClick={() => void submitBalanceAdjust()}
              variant={balanceDirection === 'deduct' ? 'danger' : 'primary'}
            >
              {balanceDirection === 'deduct' ? '确认扣除' : '确认增加'}
            </Button>
          </>
        }
        onClose={() => setBalanceAdjustOpen(false)}
        open={balanceAdjustOpen}
        title="余额调整"
      >
        <div className="grid gap-4">
          {/* 当前可用余额卡片 */}
          <div className="rounded-lg border border-salon-line bg-violet-50/60 p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="text-xs text-zinc-500 dark:text-zinc-400">当前可用余额</div>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-2xl font-bold text-salon-accent">
                {currentAvailable.toFixed(2)}
              </span>
              <span className="text-sm text-zinc-500 dark:text-zinc-400">元</span>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-zinc-500 dark:text-zinc-400">
              <span>本金 {balance.principalBalance ?? 0}</span>
              <span>赠送 {balance.giftBalance ?? 0}</span>
              <span>冻结 {balance.frozenBalance ?? 0}</span>
            </div>
          </div>

          {/* 余额桶 */}
          <Field label="余额桶">
            <Select
              onChange={(e) => {
                setBalanceAdjust((b) => ({ ...b, balanceType: Number(e.target.value) }));
                setBalanceError('');
              }}
              value={balanceAdjust.balanceType}
            >
              <option value={1}>本金</option>
              <option value={2}>赠送</option>
              <option value={3}>冻结</option>
            </Select>
          </Field>

          {/* 调整类型（Tab 单选，选中紫底白字） */}
          <Field label="调整类型">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setBalanceDirection('add');
                  setBalanceInput((v) => (v.startsWith('-') ? v.slice(1) : v));
                  setBalanceError('');
                }}
                className={cn(
                  'h-10 rounded-md border text-sm font-medium transition',
                  balanceDirection === 'add'
                    ? 'border-salon-accent bg-salon-accent text-white'
                    : 'border-salon-line bg-white text-zinc-600 hover:bg-stone-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800',
                )}
              >
                + 增加余额
              </button>
              <button
                type="button"
                onClick={() => {
                  setBalanceDirection('deduct');
                  setBalanceError('');
                }}
                className={cn(
                  'h-10 rounded-md border text-sm font-medium transition',
                  balanceDirection === 'deduct'
                    ? 'border-salon-accent bg-salon-accent text-white'
                    : 'border-salon-line bg-white text-zinc-600 hover:bg-stone-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800',
                )}
              >
                - 扣除余额
              </button>
            </div>
          </Field>

          {/* 调整数量（金额，支持两位小数，右侧实时显示带符号金额） */}
          <Field label="调整数量" error={balanceError || undefined}>
            <div className="relative">
              <Input
                inputMode="decimal"
                placeholder="请输入调整金额数量"
                className="pr-24"
                value={balanceInput}
                onChange={(e) => {
                  const raw = e.target.value;
                  // 扣除兼容负号；正数金额支持两位小数中间态；整数最多 9 位避免溢出
                  const allowMinus = balanceDirection === 'deduct';
                  if (
                    raw === '' ||
                    (allowMinus && raw === '-') ||
                    (allowMinus ? /^-?\d{1,9}(\.\d{0,2})?$/ : /^\d{1,9}(\.\d{0,2})?$/).test(raw)
                  ) {
                    setBalanceInput(raw);
                    setBalanceError('');
                  }
                }}
                onBlur={() => {
                  if (balanceInput === '' || balanceInput === '-') {
                    setBalanceInput('0');
                  }
                }}
              />
              {balanceAdjustAmount > 0 ? (
                <span
                  className={cn(
                    'pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium',
                    balanceDirection === 'add'
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-rose-600 dark:text-rose-400',
                  )}
                >
                  {balanceDirection === 'add' ? '+' : '-'}
                  {balanceAdjustAmount.toFixed(2)} 元
                </span>
              ) : null}
            </div>
          </Field>

          {/* 调整后可用余额预览（实时计算） */}
          <div className="rounded-md border border-salon-line bg-stone-50 p-3 text-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center justify-between gap-2">
              <span className="text-zinc-500 dark:text-zinc-400">调整前可用</span>
              <span className="font-medium text-salon-ink dark:text-zinc-100">
                {currentAvailable.toFixed(2)} 元
              </span>
            </div>
            <div className="my-1.5 border-t border-dashed border-salon-line dark:border-zinc-700" />
            <div className="flex items-center justify-between gap-2">
              <span className="text-zinc-500 dark:text-zinc-400">调整后可用</span>
              {afterAvailable < 0 ? (
                <span className="font-semibold text-rose-600 dark:text-rose-400">余额不足</span>
              ) : (
                <span className="font-semibold text-salon-accent">
                  {afterAvailable.toFixed(2)} 元
                </span>
              )}
            </div>
            <div className="mt-1.5 text-center text-xs text-zinc-400 dark:text-zinc-500">
              {currentAvailable.toFixed(2)} {availableDelta >= 0 ? '+' : '−'}{' '}
              {Math.abs(availableDelta).toFixed(2)} = {afterAvailable.toFixed(2)} 元
            </div>
          </div>

          {/* 调整原因（必填） */}
          <Field label="调整原因" required error={balanceRemarkError || undefined}>
            <Input
              placeholder="请输入调整原因，例如：充值 / 消费退还 / 客服补偿 / 人工修正"
              onChange={(e) => {
                setBalanceAdjust((b) => ({ ...b, remark: e.target.value }));
                setBalanceRemarkError('');
              }}
              value={balanceAdjust.remark}
            />
          </Field>
        </div>
      </Modal>

      {/* 积分调整 */}
      <Modal
        description="调整将写入积分流水，请确认方向与数量后提交。"
        footer={
          <>
            <Button onClick={() => setPointAdjustOpen(false)} variant="secondary">
              取消
            </Button>
            <Button
              onClick={() => void submitPointAdjust()}
              variant={pointDirection === 'deduct' ? 'danger' : 'primary'}
            >
              {pointDirection === 'deduct' ? '确认扣除' : '确认增加'}
            </Button>
          </>
        }
        onClose={() => setPointAdjustOpen(false)}
        open={pointAdjustOpen}
        title="积分调整"
      >
        <div className="grid gap-4">
          {/* 当前积分余额卡片 */}
          <div className="rounded-lg border border-salon-line bg-violet-50/60 p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="text-xs text-zinc-500 dark:text-zinc-400">当前积分余额</div>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-2xl font-bold text-salon-accent">{currentPoints}</span>
              <span className="text-sm text-zinc-500 dark:text-zinc-400">积分</span>
            </div>
          </div>

          {/* 调整类型（Tab 单选，选中紫底白字） */}
          <Field label="调整类型">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setPointDirection('add');
                  setPointInput((v) => (v.startsWith('-') ? v.slice(1) : v));
                  setPointError('');
                }}
                className={cn(
                  'h-10 rounded-md border text-sm font-medium transition',
                  pointDirection === 'add'
                    ? 'border-salon-accent bg-salon-accent text-white'
                    : 'border-salon-line bg-white text-zinc-600 hover:bg-stone-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800',
                )}
              >
                + 增加积分
              </button>
              <button
                type="button"
                onClick={() => {
                  setPointDirection('deduct');
                  setPointAdjust((p) => ({ ...p, expireTime: undefined }));
                  setPointError('');
                }}
                className={cn(
                  'h-10 rounded-md border text-sm font-medium transition',
                  pointDirection === 'deduct'
                    ? 'border-salon-accent bg-salon-accent text-white'
                    : 'border-salon-line bg-white text-zinc-600 hover:bg-stone-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800',
                )}
              >
                - 扣除积分
              </button>
            </div>
          </Field>

          {/* 调整数量（统一标签，右侧实时显示带符号数量） */}
          <Field label="调整数量" error={pointError || undefined}>
            <div className="relative">
              <Input
                inputMode="numeric"
                placeholder="请输入调整积分数量"
                className="pr-24"
                value={pointInput}
                onChange={(e) => {
                  const raw = e.target.value;
                  // 扣除兼容负号；新增仅正整数；最多 9 位（999999999）避免 int4 溢出
                  const allowMinus = pointDirection === 'deduct';
                  if (
                    raw === '' ||
                    (allowMinus && raw === '-') ||
                    (allowMinus ? /^-?\d{1,9}$/ : /^\d{1,9}$/).test(raw)
                  ) {
                    setPointInput(raw);
                    setPointError('');
                  }
                }}
                onBlur={() => {
                  if (pointInput === '' || pointInput === '-') {
                    setPointInput('0');
                  }
                }}
              />
              {adjustAmount > 0 ? (
                <span
                  className={cn(
                    'pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium',
                    pointDirection === 'add'
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-rose-600 dark:text-rose-400',
                  )}
                >
                  {pointDirection === 'add' ? `+${adjustAmount}` : `-${adjustAmount}`} 积分
                </span>
              ) : null}
            </div>
          </Field>

          {/* 调整后余额预览（实时计算） */}
          <div className="rounded-md border border-salon-line bg-stone-50 p-3 text-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center justify-between gap-2">
              <span className="text-zinc-500 dark:text-zinc-400">调整前</span>
              <span className="font-medium text-salon-ink dark:text-zinc-100">
                {currentPoints} 积分
              </span>
            </div>
            <div className="my-1.5 border-t border-dashed border-salon-line dark:border-zinc-700" />
            <div className="flex items-center justify-between gap-2">
              <span className="text-zinc-500 dark:text-zinc-400">调整后</span>
              {afterPoints < 0 ? (
                <span className="font-semibold text-rose-600 dark:text-rose-400">积分不足</span>
              ) : (
                <span className="font-semibold text-salon-accent">{afterPoints} 积分</span>
              )}
            </div>
            <div className="mt-1.5 text-center text-xs text-zinc-400 dark:text-zinc-500">
              {currentPoints} {pointDirection === 'add' ? '+' : '−'} {adjustAmount} = {afterPoints}{' '}
              积分
            </div>
          </div>

          {/* 有效期（扣除禁用，保持表单结构稳定） */}
          <Field
            label="有效期"
            hint={
              pointDirection === 'deduct'
                ? '不适用于扣除积分'
                : '增加时可选，按天；于选择当天 24:00 后过期'
            }
          >
            <Input
              type="date"
              disabled={pointDirection === 'deduct'}
              className="disabled:cursor-not-allowed disabled:opacity-60"
              onChange={(e) =>
                setPointAdjust((p) => ({ ...p, expireTime: e.target.value || undefined }))
              }
              value={pointDirection === 'deduct' ? '' : (pointAdjust.expireTime ?? '')}
            />
          </Field>

          {/* 调整原因（必填） */}
          <Field label="调整原因" required error={pointRemarkError || undefined}>
            <Input
              placeholder="请输入调整原因，例如：活动奖励 / 客服补偿 / 人工修正 / 违规扣除"
              onChange={(e) => {
                setPointAdjust((p) => ({ ...p, remark: e.target.value }));
                setPointRemarkError('');
              }}
              value={pointAdjust.remark}
            />
          </Field>
        </div>
      </Modal>

      {/* 余额流水 */}
      <Drawer
        onClose={() => setBalanceLogOpen(false)}
        open={balanceLogOpen}
        title="余额流水"
        width="640px"
        footer={
          <Button onClick={() => setBalanceLogOpen(false)} variant="secondary">
            关闭
          </Button>
        }
      >
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-salon-line text-xs dark:divide-zinc-800">
            <thead className="bg-slate-50 dark:bg-zinc-900/60">
              <tr>
                <th className="px-2 py-2 text-left">时间</th>
                <th className="px-2 py-2 text-left">桶/类型</th>
                <th className="px-2 py-2 text-right">变动额</th>
                <th className="px-2 py-2 text-right">变动后</th>
                <th className="px-2 py-2 text-left">操作人</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-salon-line dark:divide-zinc-800">
              {balanceLogs.map((l) => (
                <tr key={l.id}>
                  <td className="px-2 py-2">{l.createTime}</td>
                  <td className="px-2 py-2">
                    {l.balanceType_text ?? l.balanceType}/{l.changeType_text ?? l.changeType}
                  </td>
                  <td
                    className={cn(
                      'px-2 py-2 text-right',
                      (l.changeAmount ?? 0) >= 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-rose-600 dark:text-rose-400',
                    )}
                  >
                    {l.changeAmount}
                  </td>
                  <td className="px-2 py-2 text-right">{l.afterAmount}</td>
                  <td className="px-2 py-2">{l.operatorName || '暂无'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Drawer>

      {/* 积分流水 */}
      <Drawer
        onClose={() => setPointLogOpen(false)}
        open={pointLogOpen}
        title="积分流水"
        width="640px"
        footer={
          <Button onClick={() => setPointLogOpen(false)} variant="secondary">
            关闭
          </Button>
        }
      >
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-salon-line text-xs dark:divide-zinc-800">
            <thead className="bg-slate-50 dark:bg-zinc-900/60">
              <tr>
                <th className="px-2 py-2 text-left">时间</th>
                <th className="px-2 py-2 text-left">类型</th>
                <th className="px-2 py-2 text-right">变动</th>
                <th className="px-2 py-2 text-right">变动后</th>
                <th className="px-2 py-2 text-left">操作人</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-salon-line dark:divide-zinc-800">
              {pointLogs.map((l) => (
                <tr key={l.id}>
                  <td className="px-2 py-2">{l.createTime}</td>
                  <td className="px-2 py-2">
                    {POINT_CHANGE_TYPE_LABEL[l.changeType ?? 0] ?? l.changeType}
                  </td>
                  <td
                    className={cn(
                      'px-2 py-2 text-right',
                      (l.changePoints ?? 0) >= 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-rose-600 dark:text-rose-400',
                    )}
                  >
                    {l.changePoints}
                  </td>
                  <td className="px-2 py-2 text-right">{l.afterPoints}</td>
                  <td className="px-2 py-2">{l.operatorName || '暂无'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Drawer>

      {/* 标签编辑 */}
      <Modal
        footer={
          <>
            <Button onClick={() => setTagEditOpen(false)} variant="secondary">
              取消
            </Button>
            <Button onClick={() => void submitTagEdit()}>保存</Button>
          </>
        }
        onClose={() => setTagEditOpen(false)}
        open={tagEditOpen}
        title="编辑标签"
      >
        <div className="grid max-h-72 grid-cols-2 gap-2 overflow-auto">
          {tagOptions.map((t) => {
            const checked = tagEditIds.includes(String(t.id));
            return (
              <label
                key={t.id}
                className="flex cursor-pointer items-center gap-2 rounded-md border border-transparent px-2 py-1.5 text-sm hover:border-salon-line dark:hover:border-zinc-700"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() =>
                    setTagEditIds((ids) =>
                      checked ? ids.filter((i) => i !== String(t.id)) : [...ids, String(t.id)],
                    )
                  }
                />
                <span className="size-3 rounded-full" style={{ backgroundColor: t.color }} />
                <span>{t.name}</span>
              </label>
            );
          })}
        </div>
      </Modal>

      {/* 备注编辑 */}
      <Modal
        footer={
          <>
            <Button onClick={() => setProfileEditOpen(false)} variant="secondary">
              取消
            </Button>
            <Button onClick={() => void submitProfileEdit()}>保存</Button>
          </>
        }
        onClose={() => setProfileEditOpen(false)}
        open={profileEditOpen}
        title="编辑备注"
      >
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="发质">
            <Input
              onChange={(e) => setProfileEdit((p) => ({ ...p, hairQuality: e.target.value }))}
              value={profileEdit.hairQuality ?? ''}
            />
          </Field>
          <Field label="偏好发型">
            <Input
              onChange={(e) => setProfileEdit((p) => ({ ...p, preferredStyle: e.target.value }))}
              value={profileEdit.preferredStyle ?? ''}
            />
          </Field>
          <Field label="常用发型师ID">
            <Input
              onChange={(e) =>
                setProfileEdit((p) => ({ ...p, preferredStylistId: e.target.value || undefined }))
              }
              value={profileEdit.preferredStylistId ? String(profileEdit.preferredStylistId) : ''}
            />
          </Field>
          <Field label="过敏信息">
            <Input
              onChange={(e) => setProfileEdit((p) => ({ ...p, allergy: e.target.value }))}
              value={profileEdit.allergy ?? ''}
            />
          </Field>
          <Field label="服务禁忌">
            <Input
              onChange={(e) => setProfileEdit((p) => ({ ...p, taboo: e.target.value }))}
              value={profileEdit.taboo ?? ''}
            />
          </Field>
          <Field className="md:col-span-2" label="扩展备注">
            <Textarea
              onChange={(e) => setProfileEdit((p) => ({ ...p, remark: e.target.value }))}
              value={profileEdit.remark ?? ''}
            />
          </Field>
        </div>
      </Modal>

      <ConfirmDialog
        danger
        description="删除后不可恢复。"
        onCancel={() => setConfirmIds(null)}
        onConfirm={() => {
          if (!confirmIds) {
            return;
          }
          void memberApi.remove(confirmIds).then(async () => {
            setConfirmIds(null);
            await load();
          });
        }}
        open={Boolean(confirmIds)}
        title="确认删除会员"
      />
    </div>
  );
}
