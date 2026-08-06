import { useCallback, useEffect, useState } from 'react';
import { Plus, Search, Trash2 } from 'lucide-react';
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
import { dictApi } from '@/shared/api/modules/systemApi';
import type { DictOption } from '@/features/system/model/dictTypes';
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
import { useAuthStore } from '@/store/useAuthStore';
import { useTenantStoreFilter } from '@/features/system/model/useTenantStoreFilter';

function defaultMemberForm(storeId = ''): MemberFormPayload {
  return { name: '', storeId, status: 1, gender: 0 };
}

export function MemberPage() {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const { showTenant, showStore, tenantId, storeId, tenantOptions, storeOptions, changeTenant, changeStore, isRoot } =
    useTenantStoreFilter({ withStore: true });
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
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<MemberFormPayload>(() => defaultMemberForm());
  const [saving, setSaving] = useState(false);
  const [confirmIds, setConfirmIds] = useState<string[] | null>(null);

  // 详情
  const [detail, setDetail] = useState<MemberDetailVO | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // 余额调整
  const [balanceAdjustOpen, setBalanceAdjustOpen] = useState(false);
  const [balanceAdjust, setBalanceAdjust] = useState<MemberBalanceAdjustPayload>({ balanceType: 1, changeAmount: 0, remark: '' });

  // 积分调整
  const [pointAdjustOpen, setPointAdjustOpen] = useState(false);
  const [pointAdjust, setPointAdjust] = useState<MemberPointAdjustPayload>({ changePoints: 0, remark: '' });

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

  async function openEdit(id: string): Promise<void> {
    const d = await memberApi.detail(id);
    setEditId(id);
    setForm({
      name: d.name,
      phone: d.phone,
      gender: d.gender ?? 0,
      birthday: d.birthday,
      levelId: d.levelId,
      source: d.source,
      status: d.status ?? 1,
      remark: d.remark,
      storeId: String(d.storeId ?? ''),
    });
    setOpen(true);
  }

  async function handleSave(): Promise<void> {
    if (!form.storeId) {
      return;
    }
    setSaving(true);
    try {
      if (editId) {
        await memberApi.update(editId, form);
      } else {
        await memberApi.create(form);
      }
      setOpen(false);
      setEditId(null);
      await load();
    } finally {
      setSaving(false);
    }
  }

  function openCreate(): void {
    setEditId(null);
    setForm(defaultMemberForm(storeOptions[0]?.value ?? ''));
    setOpen(true);
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
    await memberBalanceApi.adjust(String(detail.id), balanceAdjust);
    setBalanceAdjustOpen(false);
    setBalanceAdjust({ balanceType: 1, changeAmount: 0, remark: '' });
    await refreshDetail();
    await load();
  }

  async function submitPointAdjust(): Promise<void> {
    if (!detail) {
      return;
    }
    await memberPointApi.adjust(String(detail.id), pointAdjust);
    setPointAdjustOpen(false);
    setPointAdjust({ changePoints: 0, remark: '' });
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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">会员管理</h1>
          <p className="text-sm text-zinc-500">列表按租户和门店数据范围过滤；余额/积分变动走流水接口。</p>
        </div>
        {hasPermission('biz:member:add') ? (
          <Button icon={<Plus className="size-4" />} onClick={openCreate}>
            新增会员
          </Button>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
          <Input className="pl-9" onChange={(e) => setKeyword(e.target.value)} placeholder="姓名/手机号/门店" value={keyword} />
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
        {showStore ? (
          <Select className="md:w-44" value={storeId} onChange={(e) => changeStore(e.target.value)}>
            <option value="">全部门店</option>
            {storeOptions.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </Select>
        ) : null}
        <Select className="md:w-40" value={filterLevelId} onChange={(e) => setFilterLevelId(e.target.value)}>
          <option value="">全部等级</option>
          {levelOptions.map((l) => (
            <option key={l.id} value={String(l.id)}>
              {l.name}
            </option>
          ))}
        </Select>
        <Select className="md:w-40" value={filterTagId} onChange={(e) => setFilterTagId(e.target.value)}>
          <option value="">全部标签</option>
          {tagOptions.map((t) => (
            <option key={t.id} value={String(t.id)}>
              {t.name}
            </option>
          ))}
        </Select>
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
                    <Badge tone={row.status === 1 ? 'success' : 'danger'}>{row.status === 1 ? '正常' : '停用'}</Badge>
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
                      <Button icon={<Trash2 className="size-4" />} onClick={() => setConfirmIds([row.id])} size="sm" variant="secondary">
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

      <div className="flex items-center justify-between text-sm text-zinc-500">
        <span>共 {total} 条</span>
        <div className="flex gap-2">
          <Button disabled={pageNum <= 1} onClick={() => setPageNum((p) => p - 1)} size="sm" variant="secondary">
            上一页
          </Button>
          <Button disabled={pageNum * 10 >= total} onClick={() => setPageNum((p) => p + 1)} size="sm" variant="secondary">
            下一页
          </Button>
        </div>
      </div>

      {/* 新增/编辑表单 */}
      <Modal
        footer={
          <>
            <Button onClick={() => setOpen(false)} variant="secondary">
              取消
            </Button>
            <Button loading={saving} onClick={() => void handleSave()}>
              保存
            </Button>
          </>
        }
        onClose={() => setOpen(false)}
        open={open}
        title={editId ? '编辑会员' : '新增会员'}
      >
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="姓名" required>
            <Input onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} value={form.name} />
          </Field>
          <Field label="手机">
            <Input onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} value={form.phone ?? ''} />
          </Field>
          <Field label="性别">
            <Select onChange={(e) => setForm((f) => ({ ...f, gender: Number(e.target.value) }))} value={form.gender ?? 0}>
              <option value={0}>未知</option>
              <option value={1}>男</option>
              <option value={2}>女</option>
            </Select>
          </Field>
          <Field label="生日">
            <Input onChange={(e) => setForm((f) => ({ ...f, birthday: e.target.value }))} placeholder="YYYY-MM-DD" value={form.birthday ?? ''} />
          </Field>
          <Field label="会员等级">
            <Select onChange={(e) => setForm((f) => ({ ...f, levelId: e.target.value || undefined }))} value={form.levelId ? String(form.levelId) : ''}>
              <option value="">请选择等级</option>
              {levelOptions.map((l) => (
                <option key={l.id} value={String(l.id)}>
                  {l.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="来源">
            <Select onChange={(e) => setForm((f) => ({ ...f, source: e.target.value || undefined }))} value={form.source ?? ''}>
              <option value="">请选择来源</option>
              {sourceOptions.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="所属门店" required>
            <Select onChange={(e) => setForm((f) => ({ ...f, storeId: e.target.value }))} value={form.storeId}>
              <option value="">请选择所属门店</option>
              {storeOptions.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="状态">
            <Select onChange={(e) => setForm((f) => ({ ...f, status: Number(e.target.value) }))} value={form.status ?? 1}>
              <option value={1}>正常</option>
              <option value={0}>停用</option>
            </Select>
          </Field>
          <Field className="md:col-span-2" label="备注">
            <Input onChange={(e) => setForm((f) => ({ ...f, remark: e.target.value }))} value={form.remark ?? ''} />
          </Field>
        </div>
      </Modal>

      {/* 详情 */}
      <Modal onClose={() => setDetailOpen(false)} open={detailOpen} title="会员详情" footer={<Button onClick={() => setDetailOpen(false)} variant="secondary">关闭</Button>}>
        {detail ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>姓名：{detail.name}</div>
              <div>手机：{detail.phone || '-'}</div>
              <div>等级：{detail.levelName || '-'}</div>
              <div>状态：{detail.status === 1 ? '正常' : '停用'}</div>
              <div>余额（可用）：{detail.balance ?? 0}</div>
              <div>积分：{detail.points ?? 0}</div>
            </div>
            <div className="rounded-md border border-salon-line p-3 text-sm dark:border-zinc-800">
              <div className="mb-2 font-medium">余额明细</div>
              <div className="grid grid-cols-2 gap-1 text-zinc-600 dark:text-zinc-300">
                <div>本金：{balance.principalBalance ?? 0}</div>
                <div>赠送：{balance.giftBalance ?? 0}</div>
                <div>冻结：{balance.frozenBalance ?? 0}</div>
                <div>可用：{balance.availableBalance ?? 0}</div>
                <div>最近充值：{balance.lastRechargeTime || '-'}</div>
                <div>最近消费：{balance.lastConsumeTime || '-'}</div>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {hasPermission('biz:memberBalance:adjust') ? (
                  <Button onClick={() => setBalanceAdjustOpen(true)} size="sm" variant="secondary">余额调整</Button>
                ) : null}
                {hasPermission('biz:memberBalance:log') ? (
                  <Button onClick={() => void openBalanceLogs()} size="sm" variant="secondary">余额流水</Button>
                ) : null}
                {hasPermission('biz:memberPoint:adjust') ? (
                  <Button onClick={() => setPointAdjustOpen(true)} size="sm" variant="secondary">积分调整</Button>
                ) : null}
                {hasPermission('biz:memberPoint:log') ? (
                  <Button onClick={() => void openPointLogs()} size="sm" variant="secondary">积分流水</Button>
                ) : null}
              </div>
            </div>
            <div className="rounded-md border border-salon-line p-3 text-sm dark:border-zinc-800">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-medium">标签</span>
                {hasPermission('biz:member:tag') ? <Button onClick={() => void openTagEdit()} size="sm" variant="secondary">编辑</Button> : null}
              </div>
              <div className="flex flex-wrap gap-1">
                {(detail.tags ?? []).map((t) => (
                  <Badge key={t.id} tone="info">{t.name}</Badge>
                ))}
                {(detail.tags ?? []).length === 0 ? <span className="text-zinc-400">无</span> : null}
              </div>
            </div>
            <div className="rounded-md border border-salon-line p-3 text-sm dark:border-zinc-800">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-medium">备注</span>
                {hasPermission('biz:member:edit') ? <Button onClick={openProfileEdit} size="sm" variant="secondary">编辑</Button> : null}
              </div>
              <div className="grid grid-cols-2 gap-1 text-zinc-600 dark:text-zinc-300">
                <div>发质：{detail.profile?.hairQuality || '-'}</div>
                <div>偏好发型：{detail.profile?.preferredStyle || '-'}</div>
                <div>常用发型师：{detail.profile?.preferredStylistName || '-'}</div>
                <div>过敏：{detail.profile?.allergy || '-'}</div>
                <div>禁忌：{detail.profile?.taboo || '-'}</div>
                <div>扩展备注：{detail.profile?.remark || '-'}</div>
              </div>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* 余额调整 */}
      <Modal footer={<><Button onClick={() => setBalanceAdjustOpen(false)} variant="secondary">取消</Button><Button onClick={() => void submitBalanceAdjust()}>确定</Button></>} onClose={() => setBalanceAdjustOpen(false)} open={balanceAdjustOpen} title="余额调整">
        <div className="grid gap-3">
          <Field label="余额桶">
            <Select onChange={(e) => setBalanceAdjust((b) => ({ ...b, balanceType: Number(e.target.value) }))} value={balanceAdjust.balanceType}>
              <option value={1}>本金</option>
              <option value={2}>赠送</option>
              <option value={3}>冻结</option>
            </Select>
          </Field>
          <Field label="变动金额（正增负减）">
            <Input onChange={(e) => setBalanceAdjust((b) => ({ ...b, changeAmount: Number(e.target.value) }))} type="number" step="0.01" value={balanceAdjust.changeAmount} />
          </Field>
          <Field label="备注" required>
            <Input onChange={(e) => setBalanceAdjust((b) => ({ ...b, remark: e.target.value }))} value={balanceAdjust.remark} />
          </Field>
        </div>
      </Modal>

      {/* 积分调整 */}
      <Modal footer={<><Button onClick={() => setPointAdjustOpen(false)} variant="secondary">取消</Button><Button onClick={() => void submitPointAdjust()}>确定</Button></>} onClose={() => setPointAdjustOpen(false)} open={pointAdjustOpen} title="积分调整">
        <div className="grid gap-3">
          <Field label="变动积分（正增负减）">
            <Input onChange={(e) => setPointAdjust((p) => ({ ...p, changePoints: Number(e.target.value) }))} type="number" value={pointAdjust.changePoints} />
          </Field>
          <Field label="过期时间（增加时可选）">
            <Input onChange={(e) => setPointAdjust((p) => ({ ...p, expireTime: e.target.value || undefined }))} placeholder="YYYY-MM-DD HH:mm:ss" value={pointAdjust.expireTime ?? ''} />
          </Field>
          <Field label="备注" required>
            <Input onChange={(e) => setPointAdjust((p) => ({ ...p, remark: e.target.value }))} value={pointAdjust.remark} />
          </Field>
        </div>
      </Modal>

      {/* 余额流水 */}
      <Modal onClose={() => setBalanceLogOpen(false)} open={balanceLogOpen} title="余额流水" footer={<Button onClick={() => setBalanceLogOpen(false)} variant="secondary">关闭</Button>}>
        <div className="max-h-96 overflow-auto">
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
                  <td className="px-2 py-2">{l.balanceType}/{l.changeType}</td>
                  <td className="px-2 py-2 text-right" style={{ color: (l.changeAmount ?? 0) >= 0 ? 'green' : 'red' }}>{l.changeAmount}</td>
                  <td className="px-2 py-2 text-right">{l.afterAmount}</td>
                  <td className="px-2 py-2">{l.operatorName || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Modal>

      {/* 积分流水 */}
      <Modal onClose={() => setPointLogOpen(false)} open={pointLogOpen} title="积分流水" footer={<Button onClick={() => setPointLogOpen(false)} variant="secondary">关闭</Button>}>
        <div className="max-h-96 overflow-auto">
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
                  <td className="px-2 py-2">{l.changeType}</td>
                  <td className="px-2 py-2 text-right" style={{ color: (l.changePoints ?? 0) >= 0 ? 'green' : 'red' }}>{l.changePoints}</td>
                  <td className="px-2 py-2 text-right">{l.afterPoints}</td>
                  <td className="px-2 py-2">{l.operatorName || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Modal>

      {/* 标签编辑 */}
      <Modal footer={<><Button onClick={() => setTagEditOpen(false)} variant="secondary">取消</Button><Button onClick={() => void submitTagEdit()}>保存</Button></>} onClose={() => setTagEditOpen(false)} open={tagEditOpen} title="编辑标签">
        <div className="grid max-h-72 grid-cols-2 gap-2 overflow-auto">
          {tagOptions.map((t) => {
            const checked = tagEditIds.includes(String(t.id));
            return (
              <label key={t.id} className="flex cursor-pointer items-center gap-2 rounded-md border border-transparent px-2 py-1.5 text-sm hover:border-salon-line dark:hover:border-zinc-700">
                <input type="checkbox" checked={checked} onChange={() => setTagEditIds((ids) => checked ? ids.filter((i) => i !== String(t.id)) : [...ids, String(t.id)])} />
                <span className="size-3 rounded-full" style={{ backgroundColor: t.color }} />
                <span>{t.name}</span>
              </label>
            );
          })}
        </div>
      </Modal>

      {/* 备注编辑 */}
      <Modal footer={<><Button onClick={() => setProfileEditOpen(false)} variant="secondary">取消</Button><Button onClick={() => void submitProfileEdit()}>保存</Button></>} onClose={() => setProfileEditOpen(false)} open={profileEditOpen} title="编辑备注">
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="发质"><Input onChange={(e) => setProfileEdit((p) => ({ ...p, hairQuality: e.target.value }))} value={profileEdit.hairQuality ?? ''} /></Field>
          <Field label="偏好发型"><Input onChange={(e) => setProfileEdit((p) => ({ ...p, preferredStyle: e.target.value }))} value={profileEdit.preferredStyle ?? ''} /></Field>
          <Field label="常用发型师ID"><Input onChange={(e) => setProfileEdit((p) => ({ ...p, preferredStylistId: e.target.value || undefined }))} value={profileEdit.preferredStylistId ? String(profileEdit.preferredStylistId) : ''} /></Field>
          <Field label="过敏信息"><Input onChange={(e) => setProfileEdit((p) => ({ ...p, allergy: e.target.value }))} value={profileEdit.allergy ?? ''} /></Field>
          <Field label="服务禁忌"><Input onChange={(e) => setProfileEdit((p) => ({ ...p, taboo: e.target.value }))} value={profileEdit.taboo ?? ''} /></Field>
          <Field className="md:col-span-2" label="扩展备注"><Textarea onChange={(e) => setProfileEdit((p) => ({ ...p, remark: e.target.value }))} value={profileEdit.remark ?? ''} /></Field>
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
