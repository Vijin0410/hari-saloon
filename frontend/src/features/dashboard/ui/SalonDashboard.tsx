import { getDictText } from '@/shared/lib/dict';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Package,
  Receipt,
  Scissors,
  ShoppingBag,
  Store,
  Users,
} from 'lucide-react';
import { goodsApi } from '@/shared/api/modules/goodsApi';
import { memberApi } from '@/shared/api/modules/memberApi';
import { orderApi } from '@/shared/api/modules/orderApi';
import { serviceItemApi } from '@/shared/api/modules/serviceApi';
import { storeApi } from '@/shared/api/modules/systemApi';
import type { GoodsPageVO } from '@/features/goods/model/goodsTypes';
import type { OrderPageVO } from '@/features/order/model/orderTypes';
import { Badge } from '@/shared/ui/Badge';
import { Card } from '@/shared/ui/Card';
import { EmptyState } from '@/shared/ui/EmptyState';
import { RequestError } from '@/shared/ui/RequestError';
import { SalonArtwork } from '@/shared/ui/SalonArtwork';
import { formatCurrency, formatDateTime } from '@/shared/lib/format';
import { useAuthStore } from '@/store/useAuthStore';

const SHORTCUTS = [
  {
    label: '收银开单',
    detail: '从一次服务开始',
    to: '/biz/cashier',
    icon: Receipt,
    permission: 'biz:order:list',
  },
  {
    label: '会员档案',
    detail: '记住每一份偏好',
    to: '/biz/members',
    icon: Users,
    permission: 'biz:member:list',
  },
  {
    label: '服务项目',
    detail: '打磨你的招牌手艺',
    to: '/biz/services',
    icon: Scissors,
    permission: 'biz:serviceItem:list',
  },
  {
    label: '商品库存',
    detail: '让好物触手可及',
    to: '/biz/goods',
    icon: ShoppingBag,
    permission: 'biz:goods:list',
  },
];
const METRICS = [
  {
    key: 'members',
    label: '会员档案',
    unit: '位',
    detail: '每一次到店，都是信任',
    to: '/biz/members',
    icon: Users,
    permission: 'biz:member:list',
    load: () => memberApi.list({ pageNum: 1, pageSize: 1 }),
  },
  {
    key: 'services',
    label: '服务项目',
    unit: '项',
    detail: '专业手艺，清晰呈现',
    to: '/biz/services',
    icon: Scissors,
    permission: 'biz:serviceItem:list',
    load: () => serviceItemApi.list({ pageNum: 1, pageSize: 1 }),
  },
  {
    key: 'goods',
    label: '商品档案',
    unit: '款',
    detail: '从沙龙延续到日常',
    to: '/biz/goods',
    icon: ShoppingBag,
    permission: 'biz:goods:list',
    load: () => goodsApi.list({ pageNum: 1, pageSize: 1 }),
  },
  {
    key: 'stores',
    label: '门店档案',
    unit: '家',
    detail: '把美好经营在每一处',
    to: '/biz/stores',
    icon: Store,
    permission: 'biz:store:list',
    load: () => storeApi.list({ pageNum: 1, pageSize: 1 }),
  },
];

/** 美业工作台：真实档案指标、最近订单和标注范围的库存提醒；请求失败不伪装成零。 */
export function SalonDashboard() {
  const user = useAuthStore((state) => state.user);
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const permissionKey = user?.perms.join('|') ?? '';
  const [revision, setRevision] = useState(0);
  const [metrics, setMetrics] = useState<Record<string, number | null>>({});
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<OrderPageVO[]>([]);
  const [ordersError, setOrdersError] = useState('');
  const [stock, setStock] = useState<GoodsPageVO[]>([]);
  const [stockError, setStockError] = useState('');
  const [stockTotal, setStockTotal] = useState(0);
  const date = new Intl.DateTimeFormat('zh-CN', {
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  }).format(new Date());

  useEffect(() => {
    let active = true;
    setLoading(true);
    setOrdersError('');
    setStockError('');
    const metricTasks = METRICS.filter((metric) => hasPermission(metric.permission)).map(
      async (metric) => {
        try {
          const result = await metric.load();
          return [metric.key, result.total ?? 0] as const;
        } catch {
          return [metric.key, null] as const;
        }
      },
    );
    const ordersTask = hasPermission('biz:order:list')
      ? orderApi
          .list({ pageNum: 1, pageSize: 5 })
          .then((data) => {
            if (active) setOrders(data.list ?? []);
          })
          .catch((error: unknown) => {
            if (active) setOrdersError(error instanceof Error ? error.message : '加载失败');
          })
      : Promise.resolve();
    const stockTask = hasPermission('biz:goods:list')
      ? goodsApi
          .list({ pageNum: 1, pageSize: 50 })
          .then((data) => {
            if (active) {
              setStockTotal(data.total ?? 0);
              setStock(
                (data.list ?? []).filter((item) => (item.stockQuantity ?? 0) <= 5).slice(0, 5),
              );
            }
          })
          .catch((error: unknown) => {
            if (active) setStockError(error instanceof Error ? error.message : '加载失败');
          })
      : Promise.resolve();
    Promise.all([Promise.all(metricTasks), ordersTask, stockTask]).then(([values]) => {
      if (active) {
        setMetrics(Object.fromEntries(values));
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [hasPermission, permissionKey, revision]);

  function retry() {
    setRevision((value) => value + 1);
  }

  return (
    <div className="mx-auto max-w-[1440px] space-y-6">
      <section className="relative isolate overflow-hidden rounded-2xl bg-salon-plum p-6 text-[#f5eee6] sm:p-8 lg:min-h-[238px]">
        <div className="pointer-events-none absolute -right-16 -top-28 size-[360px] rounded-full border border-white/10" />
        <div className="pointer-events-none absolute -right-7 -top-20 size-[300px] rounded-full border border-white/10" />
        <div className="relative z-10 lg:max-w-[68%]">
          <p className="flex items-center gap-2 text-[11px] tracking-[.16em] text-[#d6bfcb]">
            <span className="h-px w-5 bg-[#c6a3b3]" /> YOUR SALON, YOUR CRAFT{' '}
            <span className="ml-2 hidden tracking-normal sm:inline">{date}</span>
          </p>
          <h1 className="mt-5 text-2xl font-medium leading-relaxed tracking-wide sm:text-[30px]">
            {user?.nickname || user?.username || '店长'}，欢迎回来。
          </h1>
          <p className="mt-2 text-sm leading-7 text-[#ccb9c9]">
            把繁琐交给工作台，把用心留给每一位顾客。
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            {hasPermission('biz:order:list') ? (
              <Link
                to="/biz/cashier"
                className="inline-flex h-10 items-center gap-5 rounded-lg bg-[#efdfca] px-4 text-sm font-semibold text-[#49354c] transition hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
              >
                开始收银
                <ArrowUpRight className="size-4" />
              </Link>
            ) : null}
            {hasPermission('biz:member:list') ? (
              <Link
                to="/biz/members"
                className="inline-flex h-10 items-center gap-3 rounded-lg border border-white/20 px-4 text-sm transition hover:bg-white/10"
              >
                查看会员
                <ArrowRight className="size-3.5" />
              </Link>
            ) : null}
          </div>
        </div>
        <SalonArtwork
          animated={false}
          className="pointer-events-none absolute -bottom-16 right-6 hidden h-[340px] w-[310px] opacity-85 lg:block"
        />
      </section>

      <section aria-labelledby="overview-title">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 id="overview-title" className="text-sm font-semibold">
            经营概览
          </h2>
          <span className="text-xs text-zinc-400">与你的沙龙，一起成长</span>
        </div>
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {METRICS.filter((metric) => hasPermission(metric.permission)).map((metric) => {
            const Icon = metric.icon;
            const value = metrics[metric.key];
            return (
              <Link
                key={metric.key}
                to={metric.to}
                className="group rounded-xl border border-salon-line bg-white p-4 transition duration-200 hover:-translate-y-0.5 hover:border-salon-accent/35 hover:shadow-sm sm:p-5 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">{metric.label}</span>
                  <Icon className="size-4 text-salon-accent/70 dark:text-violet-300" />
                </div>
                <div className="mt-4 flex min-h-10 items-baseline gap-2">
                  {loading ? (
                    <span
                      aria-label="加载中"
                      className="h-8 w-16 animate-pulse rounded bg-salon-lilac dark:bg-zinc-800"
                    />
                  ) : value == null ? (
                    <span className="text-sm text-zinc-400">暂不可用</span>
                  ) : (
                    <>
                      <span className="text-[32px] font-semibold leading-none tracking-tight tabular-nums">
                        {value.toLocaleString('zh-CN')}
                      </span>
                      <span className="text-xs text-zinc-400">{metric.unit}</span>
                    </>
                  )}
                </div>
                <div className="mt-3 flex items-center justify-between text-[11px] text-zinc-400">
                  <span className="hidden sm:inline">{metric.detail}</span>
                  <ArrowUpRight className="ml-auto size-3.5 transition group-hover:text-salon-accent" />
                </div>
              </Link>
            );
          })}
        </div>
        {!loading && Object.values(metrics).some((value) => value === null) ? (
          <p className="mt-3 text-xs text-zinc-500">
            部分数据暂不可用，请核对权限或
            <button
              type="button"
              className="ml-1 text-salon-accent underline underline-offset-2 dark:text-violet-300"
              onClick={retry}
            >
              重新加载
            </button>
            。
          </p>
        ) : null}
      </section>

      <section aria-labelledby="quick-title">
        <h2 id="quick-title" className="mb-3 text-sm font-semibold">
          常用工作
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {SHORTCUTS.filter((item) => hasPermission(item.permission)).map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className="group flex items-center gap-3 rounded-xl border border-salon-line bg-white p-4 transition hover:border-salon-accent/35 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-salon-lilac text-salon-accent dark:bg-violet-500/10 dark:text-violet-300">
                  <Icon className="size-[18px]" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{item.label}</span>
                  <span className="mt-1 block text-[11px] text-zinc-400">{item.detail}</span>
                </span>
                <ArrowUpRight className="ml-auto size-4 shrink-0 text-zinc-300 transition group-hover:text-salon-accent" />
              </Link>
            );
          })}
        </div>
      </section>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(280px,1fr)]">
        {hasPermission('biz:order:list') ? (
          <Card
            title="最近订单"
            hover={false}
            extra={
              <Link
                className="inline-flex items-center gap-1 text-xs text-salon-accent dark:text-violet-300"
                to="/biz/cashier"
              >
                前往收银台
                <ArrowUpRight className="size-3.5" />
              </Link>
            }
          >
            {loading ? (
              <p className="py-12 text-center text-sm text-zinc-400">正在整理最近订单…</p>
            ) : ordersError ? (
              <RequestError message={ordersError} onRetry={retry} />
            ) : orders.length === 0 ? (
              <EmptyState title="暂无订单" description="开始为今天的第一位顾客开单吧。" />
            ) : (
              <div className="divide-y divide-salon-line dark:divide-zinc-800">
                {orders.map((order) => (
                  <div key={order.id} className="flex items-center gap-3 py-4 first:pt-1 last:pb-1">
                    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-salon-lilac text-sm font-medium text-salon-accent dark:bg-violet-500/10 dark:text-violet-300">
                      {(order.memberName || '散客').slice(0, 1)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {order.memberName || '散客'}
                        <span className="ml-2 text-[11px] font-normal text-zinc-400">
                          {order.storeName || ''}
                        </span>
                      </p>
                      <p className="mt-1 truncate text-[11px] text-zinc-400">
                        {order.orderNo} · {formatDateTime(order.createTime)}
                      </p>
                    </div>
                    <div className="shrink-0 space-y-1.5 text-right">
                      <p className="text-sm font-semibold tabular-nums">
                        {formatCurrency(order.payableAmount)}
                      </p>
                      <Badge
                        tone={
                          order.status === 1
                            ? 'success'
                            : order.status === 0
                              ? 'warning'
                              : 'neutral'
                        }
                      >
                        {getDictText(order.status_text)}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        ) : null}
        {hasPermission('biz:goods:list') ? (
          <Card title="库存提醒" hover={false} extra={<Package className="size-4 text-zinc-400" />}>
            {loading ? (
              <p className="py-12 text-center text-sm text-zinc-400">正在检查库存…</p>
            ) : stockError ? (
              <RequestError message={stockError} onRetry={retry} />
            ) : (
              <>
                <p className="mb-4 text-xs leading-6 text-zinc-400">
                  {stockTotal > 50 ? '检查前 50 款商品，' : ''}关注库存不高于 5 件的商品。
                </p>
                {stock.length ? (
                  <div className="space-y-3">
                    {stock.map((item) => (
                      <Link
                        key={item.id}
                        to="/biz/goods"
                        className="flex items-center justify-between gap-3 rounded-lg bg-salon-paper p-3 dark:bg-zinc-800"
                      >
                        <span className="min-w-0 truncate text-sm">{item.name}</span>
                        <Badge tone="warning">剩余 {item.stockQuantity ?? 0}</Badge>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center gap-3 rounded-xl bg-emerald-50/70 px-4 py-5 dark:bg-emerald-950/20">
                    <span className="grid size-8 place-items-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900">
                      <Check className="size-4" />
                    </span>
                    <div>
                      <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
                        暂无低库存提醒
                      </p>
                      <p className="mt-1 text-xs text-emerald-700/60 dark:text-emerald-400">
                        已检查的商品库存充足
                      </p>
                    </div>
                  </div>
                )}
                <Link
                  to="/biz/goods"
                  className="mt-5 inline-flex items-center gap-2 text-xs font-medium text-salon-accent dark:text-violet-300"
                >
                  管理商品库存
                  <ArrowRight className="size-3.5" />
                </Link>
              </>
            )}
          </Card>
        ) : null}
      </div>
      <p className="pb-2 pt-1 text-center text-[10px] tracking-[.14em] text-zinc-400">
        HAIR SALON · 专注每一份手艺与信任
      </p>
    </div>
  );
}
