import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Package, Scissors, ShoppingBag, Store, TriangleAlert, UserRound } from 'lucide-react';
import { goodsApi } from '@/shared/api/modules/goodsApi';
import { memberApi } from '@/shared/api/modules/memberApi';
import { serviceItemApi } from '@/shared/api/modules/serviceApi';
import { storeApi } from '@/shared/api/modules/systemApi';
import type { GoodsPageVO } from '@/features/goods/model/goodsTypes';
import { Badge } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { PageLoading } from '@/shared/ui/PageLoading';
import { StatCard } from '@/shared/ui/StatCard';
import { formatDateTime } from '@/shared/lib/format';
import { useAuthStore } from '@/store/useAuthStore';

/** 库存预警阈值：与 GoodsPage 保持一致，低于等于该值视为低库存 */
const LOW_STOCK_THRESHOLD = 5;

interface DashboardStats {
  memberCount: number;
  goodsCount: number;
  serviceCount: number;
  storeCount: number;
}

interface QuickLink {
  label: string;
  to: string;
  icon: typeof UserRound;
  permission: string;
}

const QUICK_LINKS: QuickLink[] = [
  { label: '会员管理', to: '/biz/members', icon: UserRound, permission: 'biz:member:list' },
  { label: '服务项目', to: '/biz/services', icon: Scissors, permission: 'biz:serviceItem:list' },
  { label: '商品管理', to: '/biz/goods', icon: ShoppingBag, permission: 'biz:goods:list' },
  { label: '门店管理', to: '/biz/stores', icon: Store, permission: 'biz:store:list' },
];

/**
 * 工作台首页：经营资产指标 + 快捷入口 + 低库存预警。
 * 营业额/订单/充值等经营业绩数据待 P5 收银、P8 财务模块接入后补齐。
 */
export function HomePage() {
  const user = useAuthStore((s) => s.user);
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const permKey = user?.perms?.length ?? 0;
  const [stats, setStats] = useState<DashboardStats>({
    memberCount: 0,
    goodsCount: 0,
    serviceCount: 0,
    storeCount: 0,
  });
  const [lowStockGoods, setLowStockGoods] = useState<GoodsPageVO[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const tasks: Promise<number>[] = [
      hasPermission('biz:member:list')
        ? memberApi.list({ pageNum: 1, pageSize: 1 }).then((d) => d.total ?? 0).catch(() => 0)
        : Promise.resolve(0),
      hasPermission('biz:goods:list')
        ? goodsApi.list({ pageNum: 1, pageSize: 1 }).then((d) => d.total ?? 0).catch(() => 0)
        : Promise.resolve(0),
      hasPermission('biz:serviceItem:list')
        ? serviceItemApi.list({ pageNum: 1, pageSize: 1 }).then((d) => d.total ?? 0).catch(() => 0)
        : Promise.resolve(0),
      hasPermission('biz:store:list')
        ? storeApi.list({ pageNum: 1, pageSize: 1 }).then((d) => d.total ?? 0).catch(() => 0)
        : Promise.resolve(0),
    ];
    Promise.all(tasks)
      .then(([memberCount, goodsCount, serviceCount, storeCount]) => {
        if (active) {
          setStats({ memberCount, goodsCount, serviceCount, storeCount });
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
  }, [hasPermission, permKey]);

  useEffect(() => {
    if (!hasPermission('biz:goods:list')) {
      setLowStockGoods([]);
      return;
    }
    let active = true;
    goodsApi
      .list({ pageNum: 1, pageSize: 50 })
      .then((data) => {
        if (active) {
          setLowStockGoods(
            (data.list ?? [])
              .filter((g) => (g.stockQuantity ?? 0) <= LOW_STOCK_THRESHOLD)
              .slice(0, 5),
          );
        }
      })
      .catch(() => {
        if (active) {
          setLowStockGoods([]);
        }
      });
    return () => {
      active = false;
    };
  }, [hasPermission, permKey]);

  const quickLinks = QUICK_LINKS.filter((item) => hasPermission(item.permission));

  if (loading) {
    return <PageLoading />;
  }

  return (
    <div className="space-y-4">
      {/* 欢迎区 */}
      <Card hover={false}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">欢迎回来</p>
            <h1 className="mt-1 text-2xl font-semibold text-salon-ink dark:text-zinc-100">
              {user?.nickname || user?.username || '当前用户'}
            </h1>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {(user?.roles ?? []).map((role) => (
                <Badge key={role} tone="info">
                  {role}
                </Badge>
              ))}
            </div>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            当前时间 {formatDateTime(new Date().toISOString())}
          </p>
        </div>
      </Card>

      {/* 经营资产指标 */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">经营资产</h2>
          <span className="text-xs text-zinc-400 dark:text-zinc-500">
            营业数据待收银财务模块接入
          </span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="会员总数" value={stats.memberCount} hint="建档会员" tone="accent" />
          <StatCard label="服务项目" value={stats.serviceCount} hint="在售项目" tone="accent" />
          <StatCard label="商品种类" value={stats.goodsCount} hint="在售商品" tone="accent" />
          <StatCard label="门店数量" value={stats.storeCount} hint="营业门店" tone="accent" />
        </div>
      </div>

      {/* 快捷入口 */}
      {quickLinks.length > 0 ? (
        <Card title="快捷入口" hover={false}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {quickLinks.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className="flex items-center justify-between rounded-md border border-salon-line bg-white px-4 py-2.5 text-sm transition hover:bg-stone-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
                >
                  <span className="flex items-center gap-2 font-medium text-salon-ink dark:text-zinc-100">
                    <Icon className="size-4 text-salon-accent" />
                    {item.label}
                  </span>
                  <ArrowRight className="size-4 text-zinc-400" />
                </Link>
              );
            })}
          </div>
        </Card>
      ) : null}

      {/* 低库存预警 */}
      {hasPermission('biz:goods:list') ? (
        <Card
          title="低库存预警"
          hover={false}
          extra={
            <Link to="/biz/goods">
              <Button size="sm" variant="secondary">
                查看全部 <ArrowRight className="size-4" />
              </Button>
            </Link>
          }
        >
          {lowStockGoods.length > 0 ? (
            <div className="space-y-2">
              {lowStockGoods.map((g) => (
                <div
                  key={g.id}
                  className="flex items-center justify-between rounded-md bg-stone-50 px-3 py-2 dark:bg-zinc-900"
                >
                  <div className="flex items-center gap-2">
                    <Package className="size-4 text-zinc-400" />
                    <span className="text-sm font-medium text-salon-ink dark:text-zinc-100">
                      {g.name}
                    </span>
                  </div>
                  <Badge tone="warning">库存 {g.stockQuantity ?? 0}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
              <TriangleAlert className="size-4 text-emerald-500" />
              暂无低库存商品
            </div>
          )}
        </Card>
      ) : null}
    </div>
  );
}
