import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { financeApi } from '@/shared/api/modules/financeApi';
import { businessDate } from '@/features/finance/model/financeSchemas';
import type { FinanceReport } from '@/features/finance/model/financeTypes';
import { StatCard } from '@/shared/ui/StatCard';
import { RequestError } from '@/shared/ui/RequestError';
import { PageLoading } from '@/shared/ui/PageLoading';
import { formatCurrency } from '@/shared/lib/format';
/** 工作台真实经营指标，与财务页复用同一口径；只对授权角色加载。 */
export function BusinessOverview() {
  const [data, setData] = useState<{ today: FinanceReport; month: FinanceReport } | null>(null);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    const today = businessDate();
    Promise.all([
      financeApi.report({ startDate: today, endDate: today }),
      financeApi.report({ startDate: today.slice(0, 7) + '-01', endDate: today }),
    ])
      .then(([day, month]) => {
        if (active) {
          setData({ today: day, month });
          setError('');
        }
      })
      .catch((e: unknown) => {
        if (active) setError(e instanceof Error ? e.message : '经营数据加载失败');
      });
    return () => {
      active = false;
    };
  }, [revision]);
  return (
    <section className="space-y-3">
      <div className="flex justify-between">
        <h2 className="text-sm font-semibold">今日经营</h2>
        <Link className="text-xs text-salon-accent" to="/biz/reports">
          查看经营报表 →
        </Link>
      </div>
      {error ? (
        <RequestError message={error} onRetry={() => setRevision((x) => x + 1)} />
      ) : data ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="今日消费实收"
              value={formatCurrency(data.today.summary.consumptionAmount)}
              hint={data.today.summary.orderCount + ' 笔 · 含会员余额'}
            />
            <StatCard
              label="今日充值本金"
              value={formatCurrency(data.today.summary.rechargeAmount)}
              hint="预收款，单列统计"
            />
            <StatCard
              label="今日成功退款"
              value={formatCurrency(data.today.summary.refundAmount)}
              hint="按退款成功时间归属"
            />
            <StatCard
              label="本月消费净额"
              value={formatCurrency(data.month.summary.netConsumption)}
              hint={'今日新增会员 ' + data.today.summary.newMemberCount + ' 人'}
              tone="accent"
            />
          </div>
        </>
      ) : (
        <PageLoading />
      )}
    </section>
  );
}
