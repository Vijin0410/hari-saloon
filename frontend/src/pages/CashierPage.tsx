import { useState } from 'react';
import { Receipt, ClipboardList } from 'lucide-react';
import { CashierWorkbench } from '@/features/order/ui/CashierWorkbench';
import { OrderRecords } from '@/features/order/ui/OrderRecords';
import { cn } from '@/shared/lib/cn';

type Tab = 'cashier' | 'records';

/** 收银开单：收银台（开单/挂单/结算）与订单记录同页两视图 */
export function CashierPage() {
  const [tab, setTab] = useState<Tab>('cashier');
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">收银开单</h1>
          <p className="text-sm text-zinc-500">
            开单挂单、组合支付（现金/扫码/会员余额/积分抵扣），消费自动累计与等级升级。
          </p>
        </div>
        <div className="flex rounded-lg border border-salon-line bg-white p-1 dark:border-zinc-800 dark:bg-zinc-950">
          <button
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition',
              tab === 'cashier'
                ? 'bg-salon-accent/10 font-medium text-salon-accent'
                : 'text-zinc-500 hover:text-salon-ink dark:hover:text-zinc-200',
            )}
            onClick={() => setTab('cashier')}
            type="button"
          >
            <Receipt className="size-4" />
            收银台
          </button>
          <button
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition',
              tab === 'records'
                ? 'bg-salon-accent/10 font-medium text-salon-accent'
                : 'text-zinc-500 hover:text-salon-ink dark:hover:text-zinc-200',
            )}
            onClick={() => setTab('records')}
            type="button"
          >
            <ClipboardList className="size-4" />
            订单记录
          </button>
        </div>
      </div>

      {tab === 'cashier' ? (
        <CashierWorkbench onOrderChanged={() => setRefreshKey((k) => k + 1)} />
      ) : (
        <OrderRecords refreshKey={refreshKey} />
      )}
    </div>
  );
}
