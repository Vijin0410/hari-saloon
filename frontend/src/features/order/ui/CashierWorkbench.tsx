import { useCallback, useEffect, useMemo, useState } from 'react';
import { Minus, Plus, Search, Trash2, UserRound, X } from 'lucide-react';
import { orderApi } from '@/shared/api/modules/orderApi';
import { memberApi, memberLevelApi } from '@/shared/api/modules/memberApi';
import { storeApi, userApi } from '@/shared/api/modules/systemApi';
import { serviceItemApi, serviceCategoryApi } from '@/shared/api/modules/serviceApi';
import { goodsApi, goodsCategoryApi } from '@/shared/api/modules/goodsApi';
import type { OrderPageVO, OrderPayPayload, OrderSavePayload } from '@/features/order/model/orderTypes';
import type { MemberPageVO } from '@/features/member/model/memberTypes';
import type { MemberLevelOption } from '@/features/member/model/memberTypes';
import type { ServiceItemOption } from '@/features/service/model/serviceTypes';
import type { GoodsOption } from '@/features/goods/model/goodsTypes';
import { Badge } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { EmptyState } from '@/shared/ui/EmptyState';
import { Input } from '@/shared/ui/Input';
import { Select } from '@/shared/ui/Select';
import { formatCurrency } from '@/shared/lib/format';
import { useAuthStore } from '@/store/useAuthStore';
import { OrderPayDialog } from './OrderPayDialog';

/** 金额输入中间态正则 */
const DECIMAL_RE = /^\d{1,9}(\.\d{0,2})?$/;

const round2 = (n: number): number => Math.round(n * 100) / 100;

interface CartItem {
  key: string;
  itemType: number;
  itemId: string;
  name: string;
  unitPrice: number;
  price: string;
  quantity: number;
  discountable: number;
  staffId: string;
  assistantId: string;
}

type StaffOption = { value: string; label: string };

function toCartItem(itemType: number, opt: ServiceItemOption | GoodsOption, hasMember: boolean): CartItem {
  const base =
    itemType === 1
      ? ((opt as ServiceItemOption).standardPrice ?? 0)
      : ((opt as GoodsOption).salePrice ?? 0);
  const memberPrice = itemType === 1 ? (opt as ServiceItemOption).memberPrice : undefined;
  const unit = hasMember && memberPrice != null ? memberPrice : base;
  return {
    key: `${itemType}-${opt.id}`,
    itemType,
    itemId: String(opt.id),
    name: opt.name,
    unitPrice: unit,
    price: String(unit),
    quantity: 1,
    discountable: opt.discountable ?? 1,
    staffId: '',
    assistantId: '',
  };
}

/** 收银台：选会员 -> 选服务/商品 -> 挂单/结算（金额与后端同口径本地预计算） */
export function CashierWorkbench({ onOrderChanged }: { onOrderChanged: () => void }) {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const [storeId, setStoreId] = useState('');
  const [stores, setStores] = useState<Array<{ id: string; name: string }>>([]);
  const [member, setMember] = useState<MemberPageVO | null>(null);
  const [memberKeyword, setMemberKeyword] = useState('');
  const [memberResults, setMemberResults] = useState<MemberPageVO[]>([]);
  const [searchingMember, setSearchingMember] = useState(false);
  const [levels, setLevels] = useState<MemberLevelOption[]>([]);
  const [staffOptions, setStaffOptions] = useState<StaffOption[]>([]);
  const [services, setServices] = useState<ServiceItemOption[]>([]);
  const [goodsList, setGoodsList] = useState<GoodsOption[]>([]);
  const [serviceCategories, setServiceCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [goodsCategories, setGoodsCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [pickTab, setPickTab] = useState<'service' | 'goods'>('service');
  const [pickCategory, setPickCategory] = useState('');
  const [pickKeyword, setPickKeyword] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [payOpen, setPayOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [pendingOrders, setPendingOrders] = useState<OrderPageVO[]>([]);

  useEffect(() => {
    storeApi
      .options()
      .then((opts) => {
        setStores(opts.map((o) => ({ id: String(o.value), name: o.label })));
      })
      .catch(() => setStores([]));
    memberLevelApi
      .options()
      .then(setLevels)
      .catch(() => setLevels([]));
    userApi
      .options()
      .then((opts) => setStaffOptions(opts.map((o) => ({ value: String(o.value), label: o.label }))))
      .catch(() => setStaffOptions([]));
    serviceItemApi
      .options()
      .then(setServices)
      .catch(() => setServices([]));
    goodsApi
      .options()
      .then(setGoodsList)
      .catch(() => setGoodsList([]));
    serviceCategoryApi
      .options()
      .then((opts) => setServiceCategories(opts.map((o) => ({ id: String(o.id), name: o.name }))))
      .catch(() => setServiceCategories([]));
    goodsCategoryApi
      .options()
      .then((opts) => setGoodsCategories(opts.map((o) => ({ id: String(o.id), name: o.name }))))
      .catch(() => setGoodsCategories([]));
  }, []);

  // 门店默认取第一家
  useEffect(() => {
    if (!storeId && stores.length > 0) {
      setStoreId(stores[0].id);
    }
  }, [stores, storeId]);

  const searchMembers = useCallback(async () => {
    if (!memberKeyword.trim()) {
      setMemberResults([]);
      return;
    }
    setSearchingMember(true);
    try {
      const data = await memberApi.list({ pageNum: 1, pageSize: 5, keywords: memberKeyword.trim() });
      setMemberResults(data.list ?? []);
    } catch {
      setMemberResults([]);
    } finally {
      setSearchingMember(false);
    }
  }, [memberKeyword]);

  const level = useMemo(
    () => (member?.levelId ? levels.find((l) => String(l.id) === String(member.levelId)) : undefined),
    [member, levels],
  );

  const rowRate = useCallback(
    (item: CartItem): number => {
      if (item.discountable !== 1 || !level) {
        return 1;
      }
      const discount = item.itemType === 1 ? level.serviceDiscount : level.goodsDiscount;
      return discount != null && discount > 0 ? discount : 1;
    },
    [level],
  );

  const subtotalOf = useCallback(
    (item: CartItem): number => round2((Number(item.price) || 0) * item.quantity * rowRate(item)),
    [rowRate],
  );

  const totals = useMemo(() => {
    const itemAmount = round2(cart.reduce((s, i) => s + i.unitPrice * i.quantity, 0));
    const payable = round2(cart.reduce((s, i) => s + subtotalOf(i), 0));
    return { itemAmount, payable, discount: round2(itemAmount - payable) };
  }, [cart, subtotalOf]);

  const filteredServices = useMemo(() => {
    const kw = pickKeyword.trim();
    return services.filter(
      (s) => (!pickCategory || String(s.categoryId ?? '') === pickCategory) && (!kw || s.name.includes(kw)),
    );
  }, [pickKeyword, pickCategory, services]);

  const filteredGoods = useMemo(() => {
    const kw = pickKeyword.trim();
    return goodsList.filter(
      (g) => (!pickCategory || String(g.categoryId ?? '') === pickCategory) && (!kw || g.name.includes(kw)),
    );
  }, [pickKeyword, pickCategory, goodsList]);

  const loadPending = useCallback(async () => {
    try {
      const data = await orderApi.list({ pageNum: 1, pageSize: 10, status: 0 });
      setPendingOrders(data.list ?? []);
    } catch {
      setPendingOrders([]);
    }
  }, []);

  useEffect(() => {
    void loadPending();
  }, [loadPending]);

  function addItem(itemType: number, opt: ServiceItemOption | GoodsOption): void {
    setCart((prev) => {
      const key = `${itemType}-${opt.id}`;
      const exists = prev.find((i) => i.key === key);
      if (exists) {
        return prev.map((i) => (i.key === key ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [...prev, toCartItem(itemType, opt, member != null)];
    });
  }

  function updateItem(key: string, patch: Partial<CartItem>): void {
    setCart((prev) => prev.map((i) => (i.key === key ? { ...i, ...patch } : i)));
  }

  function removeItem(key: string): void {
    setCart((prev) => prev.filter((i) => i.key !== key));
  }

  /** 选中/移除会员后，服务行默认单价按 会员价/标准价 刷新 */
  function applyMember(next: MemberPageVO | null): void {
    setMember(next);
    setMemberKeyword('');
    setMemberResults([]);
    setCart((prev) =>
      prev.map((i) => {
        if (i.itemType !== 1) {
          return i;
        }
        const opt = services.find((s) => String(s.id) === i.itemId);
        if (!opt) {
          return i;
        }
        const memberPrice = next ? opt.memberPrice : undefined;
        const unit = next && memberPrice != null ? memberPrice : (opt.standardPrice ?? 0);
        // 用户改过价（price != unitPrice）则保留改价，否则跟随默认价刷新
        if (Number(i.price) !== i.unitPrice) {
          return { ...i, unitPrice: unit };
        }
        return { ...i, unitPrice: unit, price: String(unit) };
      }),
    );
  }

  function buildPayload(): OrderSavePayload {
    return {
      memberId: member?.id ?? null,
      storeId,
      items: cart.map((i) => ({
        itemType: i.itemType,
        itemId: i.itemId,
        price: round2(Number(i.price) || 0),
        quantity: i.quantity,
        staffId: i.staffId || undefined,
        assistantId: i.assistantId || undefined,
      })),
    };
  }

  async function handleSavePending(): Promise<void> {
    if (!storeId || cart.length === 0) {
      return;
    }
    setPending(true);
    try {
      if (editingOrderId) {
        await orderApi.update(editingOrderId, buildPayload());
      } else {
        await orderApi.save(buildPayload());
      }
      setCart([]);
      setMember(null);
      setEditingOrderId(null);
      onOrderChanged();
      await loadPending();
    } finally {
      setPending(false);
    }
  }

  async function handlePay(payload: OrderPayPayload): Promise<void> {
    if (!storeId || cart.length === 0) {
      return;
    }
    if (editingOrderId) {
      await orderApi.update(editingOrderId, buildPayload());
      await orderApi.pay(editingOrderId, payload);
    } else {
      const id = await orderApi.save(buildPayload());
      await orderApi.pay(id, payload);
    }
    setCart([]);
    setMember(null);
    setEditingOrderId(null);
    onOrderChanged();
    await loadPending();
  }

  /** 取单回填：行是否可折从已加载的服务/商品里找回（与后端 buildItems 同源；找不到兜底 1） */
  function discountableOf(itemType: number, itemId: string): number {
    const opt =
      itemType === 1
        ? services.find((s) => String(s.id) === itemId)
        : goodsList.find((g) => String(g.id) === itemId);
    return opt?.discountable ?? 1;
  }

  /** 取单：回填会员与明细 */
  async function loadOrder(id: string): Promise<void> {
    const detail = await orderApi.detail(id);
    setEditingOrderId(String(detail.id));
    setStoreId((prev) => prev || String(detail.storeId ?? ''));
    if (detail.memberId) {
      try {
        const m = await memberApi.detail(detail.memberId);
        setMember({
          id: m.id,
          name: m.name,
          phone: m.phone,
          levelId: m.levelId,
          levelName: m.levelName,
          balance: m.balance,
          points: m.points,
        });
      } catch {
        setMember(null);
      }
    } else {
      setMember(null);
    }
    setCart(
      (detail.items ?? []).map((i) => ({
        key: `${i.itemType}-${i.itemId}`,
        itemType: i.itemType,
        itemId: String(i.itemId),
        name: i.itemName,
        unitPrice: i.unitPrice,
        price: String(i.price),
        quantity: i.quantity,
        discountable: discountableOf(i.itemType, String(i.itemId)),
        staffId: i.staffId != null ? String(i.staffId) : '',
        assistantId: i.assistantId != null ? String(i.assistantId) : '',
      })),
    );
    await loadPending();
  }

  const canOperate = hasPermission('biz:order:add') || hasPermission('biz:order:pay');
  const categoryOptions = pickTab === 'service' ? serviceCategories : goodsCategories;

  return (
    <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)_300px]">
      {/* 左栏：会员 + 门店 */}
      <div className="space-y-4">
        <Card title="开单门店">
          <Select onChange={(e) => setStoreId(e.target.value)} value={storeId}>
            {stores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </Card>
        <Card title="会员（散客可跳过）">
          {member ? (
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex size-9 items-center justify-center rounded-full bg-salon-accent/10 text-sm font-medium text-salon-accent">
                    {(member.name || '会').charAt(0)}
                  </div>
                  <div>
                    <div className="text-sm font-semibold">{member.name}</div>
                    <div className="text-xs text-zinc-500">{member.phone ?? '暂无手机号'}</div>
                  </div>
                </div>
                <Button
                  icon={<X className="size-4" />}
                  onClick={() => applyMember(null)}
                  size="sm"
                  variant="secondary"
                />
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-md bg-stone-50 p-2 dark:bg-zinc-900">
                  <div className="text-xs text-zinc-500">可用余额</div>
                  <div className="font-semibold">{formatCurrency(member.balance ?? 0)}</div>
                </div>
                <div className="rounded-md bg-stone-50 p-2 dark:bg-zinc-900">
                  <div className="text-xs text-zinc-500">积分</div>
                  <div className="font-semibold">{member.points ?? 0}</div>
                </div>
              </div>
              {level ? (
                <div className="text-xs text-zinc-500">
                  {level.name}：服务 {(level.serviceDiscount ?? 1) * 10} 折 / 商品{' '}
                  {(level.goodsDiscount ?? 1) * 10} 折
                </div>
              ) : null}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
                <Input
                  className="pl-9"
                  clearable
                  onChange={(e) => setMemberKeyword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      void searchMembers();
                    }
                  }}
                  placeholder="姓名/手机号搜索"
                  value={memberKeyword}
                />
              </div>
              <Button
                className="w-full"
                disabled={!memberKeyword.trim()}
                loading={searchingMember}
                onClick={() => void searchMembers()}
                size="sm"
                variant="secondary"
              >
                搜索会员
              </Button>
              {memberResults.length > 0 ? (
                <div className="divide-y divide-salon-line rounded-md border border-salon-line dark:divide-zinc-800 dark:border-zinc-800">
                  {memberResults.map((m) => (
                    <button
                      className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-stone-50 dark:hover:bg-zinc-900"
                      key={String(m.id)}
                      onClick={() => applyMember(m)}
                      type="button"
                    >
                      <span>
                        {m.name}
                        <span className="ml-2 text-xs text-zinc-500">{m.phone ?? '暂无手机号'}</span>
                      </span>
                      <UserRound className="size-4 text-zinc-400" />
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          )}
        </Card>

        {/* 挂单列表：点击取单继续结算 */}
        <Card title={`挂单（${pendingOrders.length}）`}>
          {pendingOrders.length === 0 ? (
            <div className="py-2 text-center text-xs text-zinc-400">暂无挂单</div>
          ) : (
            <div className="space-y-2">
              {pendingOrders.map((o) => (
                <button
                  className="flex w-full items-center justify-between rounded-md border border-salon-line p-2 text-left text-sm transition hover:border-salon-accent dark:border-zinc-800"
                  key={String(o.id)}
                  onClick={() => void loadOrder(String(o.id))}
                  type="button"
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium">{o.orderNo}</div>
                    <div className="text-xs text-zinc-500">
                      {o.memberName ?? '散客'} · {o.createTime ?? ''}
                    </div>
                  </div>
                  <span className="ml-2 shrink-0 font-semibold">
                    {formatCurrency(o.payableAmount ?? 0)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* 中栏：消费明细 */}
      <div className="space-y-4">
        <Card
          extra={
            editingOrderId ? <Badge tone="info">编辑挂单中</Badge> : undefined
          }
          title={`消费明细（${cart.length} 项）`}
        >
          {cart.length === 0 ? (
            <EmptyState description="从右侧选择服务项目或商品开始开单。" title="还未选择项目" />
          ) : (
            <div className="space-y-2">
              {cart.map((item) => (
                <div
                  className="rounded-md border border-salon-line p-3 dark:border-zinc-800"
                  key={item.key}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge tone={item.itemType === 1 ? 'info' : 'neutral'}>
                        {item.itemType === 1 ? '服务' : '商品'}
                      </Badge>
                      <span className="font-medium">{item.name}</span>
                      {rowRate(item) < 1 ? (
                        <Badge tone="success">{round2(rowRate(item) * 10)}折</Badge>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{formatCurrency(subtotalOf(item))}</span>
                      <Button
                        icon={<Trash2 className="size-4" />}
                        onClick={() => removeItem(item.key)}
                        size="sm"
                        variant="secondary"
                      />
                    </div>
                  </div>
                  <div className="mt-2 grid gap-2 md:grid-cols-4">
                    <label className="text-xs text-zinc-500">
                      单价
                      <Input
                        className="mt-1"
                        inputMode="decimal"
                        onChange={(e) => {
                          const v = e.target.value;
                          if (v === '' || DECIMAL_RE.test(v)) {
                            updateItem(item.key, { price: v });
                          }
                        }}
                        value={item.price}
                      />
                    </label>
                    <label className="text-xs text-zinc-500">
                      数量
                      <div className="mt-1 flex items-center gap-1">
                        <Button
                          disabled={item.quantity <= 1}
                          icon={<Minus className="size-4" />}
                          onClick={() => updateItem(item.key, { quantity: item.quantity - 1 })}
                          size="sm"
                          variant="secondary"
                        />
                        <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                        <Button
                          icon={<Plus className="size-4" />}
                          onClick={() => updateItem(item.key, { quantity: item.quantity + 1 })}
                          size="sm"
                          variant="secondary"
                        />
                      </div>
                    </label>
                    <label className="text-xs text-zinc-500">
                      服务人员
                      <Select
                        className="mt-1"
                        onChange={(e) => updateItem(item.key, { staffId: e.target.value })}
                        value={item.staffId}
                      >
                        <option value="">暂无</option>
                        {staffOptions.map((s) => (
                          <option key={s.value} value={s.value}>
                            {s.label}
                          </option>
                        ))}
                      </Select>
                    </label>
                    <label className="text-xs text-zinc-500">
                      助理
                      <Select
                        className="mt-1"
                        onChange={(e) => updateItem(item.key, { assistantId: e.target.value })}
                        value={item.assistantId}
                      >
                        <option value="">暂无</option>
                        {staffOptions.map((s) => (
                          <option key={s.value} value={s.value}>
                            {s.label}
                          </option>
                        ))}
                      </Select>
                    </label>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* 金额汇总与操作 */}
        <Card title="结算">
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div>
              <div className="text-xs text-zinc-500">原价合计</div>
              <div className="mt-1 text-base font-semibold">{formatCurrency(totals.itemAmount)}</div>
            </div>
            <div>
              <div className="text-xs text-zinc-500">会员折扣</div>
              <div className="mt-1 text-base font-semibold">{formatCurrency(totals.discount)}</div>
            </div>
            <div>
              <div className="text-xs text-zinc-500">应收</div>
              <div className="mt-1 text-lg font-bold text-salon-accent">
                {formatCurrency(totals.payable)}
              </div>
            </div>
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <Button
              disabled={!canOperate || !storeId || cart.length === 0}
              loading={pending}
              onClick={() => void handleSavePending()}
              variant="secondary"
            >
              挂单
            </Button>
            <Button
              disabled={!hasPermission('biz:order:pay') || !storeId || cart.length === 0}
              onClick={() => setPayOpen(true)}
            >
              结算
            </Button>
          </div>
        </Card>
      </div>

      {/* 右栏：项目/商品选择 */}
      <Card
        title={
          <div className="flex gap-2">
            <button
              className={`rounded-md px-2 py-1 text-sm ${pickTab === 'service' ? 'bg-salon-accent/10 font-medium text-salon-accent' : 'text-zinc-500'}`}
              onClick={() => {
                setPickTab('service');
                setPickCategory('');
              }}
              type="button"
            >
              服务
            </button>
            <button
              className={`rounded-md px-2 py-1 text-sm ${pickTab === 'goods' ? 'bg-salon-accent/10 font-medium text-salon-accent' : 'text-zinc-500'}`}
              onClick={() => {
                setPickTab('goods');
                setPickCategory('');
              }}
              type="button"
            >
              商品
            </button>
          </div>
        }
      >
        <div className="space-y-2">
          <Select onChange={(e) => setPickCategory(e.target.value)} value={pickCategory}>
            <option value="">全部分类</option>
            {categoryOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <Input
            clearable
            onChange={(e) => setPickKeyword(e.target.value)}
            placeholder="名称搜索"
            value={pickKeyword}
          />
        </div>
        <div className="mt-3 max-h-[520px] space-y-2 overflow-y-auto">
          {pickTab === 'service'
            ? filteredServices.map((s) => (
                <button
                  className="flex w-full items-center justify-between rounded-md border border-salon-line p-2 text-left text-sm transition hover:border-salon-accent hover:bg-salon-accent/5 dark:border-zinc-800"
                  key={String(s.id)}
                  onClick={() => addItem(1, s)}
                  type="button"
                >
                  <span className="min-w-0 truncate">{s.name}</span>
                  <span className="ml-2 shrink-0 text-zinc-500">
                    {formatCurrency(
                      member && s.memberPrice != null ? s.memberPrice : (s.standardPrice ?? 0),
                    )}
                  </span>
                </button>
              ))
            : filteredGoods.map((g) => (
                <button
                  className="flex w-full items-center justify-between rounded-md border border-salon-line p-2 text-left text-sm transition hover:border-salon-accent hover:bg-salon-accent/5 dark:border-zinc-800"
                  key={String(g.id)}
                  onClick={() => addItem(2, g)}
                  type="button"
                >
                  <span className="min-w-0 truncate">{g.name}</span>
                  <span className="ml-2 shrink-0 text-zinc-500">{formatCurrency(g.salePrice ?? 0)}</span>
                </button>
              ))}
          {(pickTab === 'service' ? filteredServices : filteredGoods).length === 0 ? (
            <div className="py-4 text-center text-sm text-zinc-400">暂无可选项</div>
          ) : null}
        </div>
      </Card>

      <OrderPayDialog
        member={member}
        onClose={() => setPayOpen(false)}
        onConfirm={handlePay}
        open={payOpen}
        payable={totals.payable}
      />
    </div>
  );
}
