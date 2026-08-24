import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Search } from 'lucide-react';
import { orderApi } from '@/shared/api/modules/orderApi';
import type { OrderPageVO } from '@/features/order/model/orderTypes';
import { ORDER_STATUS_LABEL } from '@/features/order/model/orderTypes';
import { Badge } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog';
import { EmptyState } from '@/shared/ui/EmptyState';
import { Input } from '@/shared/ui/Input';
import { Pagination } from '@/shared/ui/Pagination';
import { Select } from '@/shared/ui/Select';
import { Table, type TableColumn } from '@/shared/ui/Table';
import { useDebounce } from '@/shared/hooks/useDebounce';
import { formatCurrency } from '@/shared/lib/format';
import { useAuthStore } from '@/store/useAuthStore';
import { OrderDetailDrawer } from './OrderDetailDrawer';

const PAGE_SIZE = 10;

function statusBadge(status: number): ReactNode {
  const label = ORDER_STATUS_LABEL[status] ?? '未知';
  const tone = status === 1 ? 'success' : status === 0 ? 'info' : status === 4 ? 'neutral' : 'warning';
  return <Badge tone={tone}>{label}</Badge>;
}

/** 订单记录列表：挂单可取消（biz:order:cancel），详情抽屉含明细与支付 */
export function OrderRecords({ refreshKey }: { refreshKey: number }) {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const [rows, setRows] = useState<OrderPageVO[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [pageNum, setPageNum] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState('');
  const debounced = useDebounce(keyword, 300);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [cancelId, setCancelId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await orderApi.list({
        pageNum,
        pageSize: PAGE_SIZE,
        keywords: debounced || undefined,
        status: status === '' ? undefined : Number(status),
      });
      setRows(data.list ?? []);
      setTotal(data.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, [pageNum, debounced, status]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  async function handleCancel(): Promise<void> {
    if (!cancelId) {
      return;
    }
    await orderApi.cancel(cancelId);
    setCancelId(null);
    await load();
  }

  const columns: TableColumn<OrderPageVO>[] = [
    {
      title: '订单号',
      render: (r) => (
        <button
          className="font-medium text-salon-ink hover:text-salon-accent dark:text-zinc-100"
          onClick={() => setDetailId(String(r.id))}
          type="button"
        >
          {r.orderNo}
        </button>
      ),
    },
    { title: '会员', render: (r) => r.memberName ?? '散客' },
    { title: '手机号', render: (r) => r.memberPhone ?? '暂无' },
    { title: '原价', align: 'right', render: (r) => formatCurrency(r.itemAmount) },
    { title: '优惠', align: 'right', render: (r) => formatCurrency(r.discountAmount) },
    { title: '实收', align: 'right', render: (r) => formatCurrency(r.receivedAmount) },
    { title: '状态', render: (r) => statusBadge(r.status) },
    { title: '门店', render: (r) => r.storeName ?? '暂无' },
    { title: '时间', render: (r) => r.createTime ?? '暂无' },
    {
      title: '操作',
      align: 'right',
      render: (r) => (
        <div className="flex justify-end gap-2">
          <Button onClick={() => setDetailId(String(r.id))} size="sm" variant="secondary">
            详情
          </Button>
          {r.status === 0 && hasPermission('biz:order:cancel') ? (
            <Button onClick={() => setCancelId(String(r.id))} size="sm" variant="secondary">
              取消
            </Button>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-salon-line bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
            <Input
              className="pl-9"
              clearable
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  void load();
                }
              }}
              placeholder="订单号/会员姓名/手机号"
              value={keyword}
            />
          </div>
          <Select className="lg:w-36" onChange={(e) => setStatus(e.target.value)} value={status}>
            <option value="">全部状态</option>
            <option value={0}>挂单</option>
            <option value={1}>已支付</option>
            <option value={4}>已取消</option>
          </Select>
          <Button className="lg:w-24" icon={<Search className="size-4" />} onClick={load} variant="secondary">
            查询
          </Button>
        </div>
      </div>

      <Table
        columns={columns}
        data={rows}
        empty={<EmptyState title="暂无订单" description="还没有任何订单记录。" />}
        loading={loading}
        rowKey={(r) => r.id}
      />

      <Pagination pageNum={pageNum} pageSize={PAGE_SIZE} total={total} onChange={setPageNum} />

      <OrderDetailDrawer
        canCancel={hasPermission('biz:order:cancel')}
        id={detailId}
        onClose={() => setDetailId(null)}
        onCancel={(id) => setCancelId(id)}
      />

      <ConfirmDialog
        danger
        description="取消后挂单作废，不可恢复。"
        onCancel={() => setCancelId(null)}
        onConfirm={() => void handleCancel()}
        open={Boolean(cancelId)}
        title="确认取消挂单"
      />
    </div>
  );
}
