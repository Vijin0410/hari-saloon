import { useEffect, useState, type ReactNode } from 'react';
import { orderApi } from '@/shared/api/modules/orderApi';
import type { OrderDetailVO } from '@/features/order/model/orderTypes';
import { ORDER_STATUS_LABEL } from '@/features/order/model/orderTypes';
import { Badge } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { Drawer } from '@/shared/ui/Drawer';
import { PageLoading } from '@/shared/ui/PageLoading';
import { StatCard } from '@/shared/ui/StatCard';
import { formatCurrency } from '@/shared/lib/format';

function statusBadge(status: number): ReactNode {
  const label = ORDER_STATUS_LABEL[status] ?? '未知';
  const tone =
    status === 1 ? 'success' : status === 0 ? 'info' : status === 4 ? 'neutral' : 'warning';
  return <Badge tone={tone}>{label}</Badge>;
}

function payMethodText(m: { payMethod: number; payMethodLabel?: string }): string {
  return m.payMethodLabel ?? `方式${m.payMethod}`;
}

/** 订单详情抽屉：汇总金额 + 明细 + 支付方式 */
export function OrderDetailDrawer({
  id,
  onClose,
  onCancel,
  canCancel,
}: {
  id: string | null;
  onClose: () => void;
  onCancel?: (id: string) => void;
  canCancel?: boolean;
}) {
  const [detail, setDetail] = useState<OrderDetailVO | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!id) {
      setDetail(null);
      return;
    }
    let active = true;
    setLoading(true);
    orderApi
      .detail(id)
      .then((d) => {
        if (active) {
          setDetail(d);
        }
      })
      .catch(() => {
        if (active) {
          setDetail(null);
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
  }, [id]);

  return (
    <Drawer
      footer={
        canCancel && detail && detail.status === 0 && onCancel ? (
          <Button
            onClick={() => onCancel(String(detail.id))}
            variant="secondary"
          >
            取消挂单
          </Button>
        ) : undefined
      }
      onClose={onClose}
      open={id !== null}
      title="订单详情"
      width="560px"
    >
      {loading ? (
        <PageLoading />
      ) : detail ? (
        <div className="space-y-4">
          <StatCard
            hint={`订单号：${detail.orderNo ?? '暂无'}`}
            label="实收金额"
            tone="accent"
            value={formatCurrency(detail.receivedAmount)}
            extra={statusBadge(detail.status)}
          />
          <Card title="金额明细">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-md bg-stone-50 p-3 dark:bg-zinc-900">
                <div className="text-xs text-zinc-500 dark:text-zinc-400">原价合计</div>
                <div className="mt-1 text-lg font-semibold">{formatCurrency(detail.itemAmount)}</div>
              </div>
              <div className="rounded-md bg-stone-50 p-3 dark:bg-zinc-900">
                <div className="text-xs text-zinc-500 dark:text-zinc-400">会员折扣优惠</div>
                <div className="mt-1 text-lg font-semibold">{formatCurrency(detail.discountAmount)}</div>
              </div>
              <div className="rounded-md bg-stone-50 p-3 dark:bg-zinc-900">
                <div className="text-xs text-zinc-500 dark:text-zinc-400">积分抵扣</div>
                <div className="mt-1 text-lg font-semibold">
                  {detail.pointDeductAmount > 0
                    ? `${formatCurrency(detail.pointDeductAmount)}（${detail.pointDeductPoints ?? 0}分）`
                    : '暂无'}
                </div>
              </div>
              <div className="rounded-md bg-stone-50 p-3 dark:bg-zinc-900">
                <div className="text-xs text-zinc-500 dark:text-zinc-400">找零</div>
                <div className="mt-1 text-lg font-semibold">
                  {detail.changeAmount > 0 ? formatCurrency(detail.changeAmount) : '暂无'}
                </div>
              </div>
            </div>
          </Card>
          <Card title={`消费明细（${detail.items?.length ?? 0} 项）`}>
            <div className="space-y-2">
              {(detail.items ?? []).map((item) => (
                <div
                  className="flex items-start justify-between gap-2 rounded-md border border-salon-line p-2 text-sm dark:border-zinc-800"
                  key={String(item.id)}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge tone={item.itemType === 1 ? 'info' : 'neutral'}>
                        {item.itemType === 1 ? '服务' : '商品'}
                      </Badge>
                      <span className="font-medium">{item.itemName}</span>
                    </div>
                    <div className="mt-1 text-xs text-zinc-500">
                      {formatCurrency(item.price)} × {item.quantity}
                      {item.discountRate != null && item.discountRate < 1 ? ` · ${(item.discountRate * 10).toFixed(1)}折` : ''}
                      {item.staffName ? ` · ${item.staffName}` : ''}
                      {item.assistantName ? ` / ${item.assistantName}` : ''}
                    </div>
                  </div>
                  <span className="font-semibold">{formatCurrency(item.subtotal)}</span>
                </div>
              ))}
              {detail.items?.length ? null : <div className="text-sm text-zinc-400">暂无明细</div>}
            </div>
          </Card>
          <Card title="支付方式">
            <div className="space-y-1 text-sm">
              {(detail.payments ?? []).map((p) => (
                <div className="flex justify-between" key={String(p.id)}>
                  <span className="text-zinc-500">{payMethodText(p)}</span>
                  <span>{formatCurrency(p.amount)}</span>
                </div>
              ))}
              {detail.payments?.length ? null : <div className="text-zinc-400">暂无支付记录</div>}
            </div>
          </Card>
          <Card title="基础信息">
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-zinc-500">会员</dt>
                <dd>
                  {detail.memberName
                    ? `${detail.memberName}${detail.memberPhone ? `（${detail.memberPhone}）` : ''}`
                    : '散客'}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-zinc-500">门店</dt>
                <dd>{detail.storeName ?? '暂无'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-zinc-500">开单时间</dt>
                <dd>{detail.createTime ?? '暂无'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-zinc-500">支付时间</dt>
                <dd>{detail.paidTime ?? '暂无'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-zinc-500">备注</dt>
                <dd>{detail.remark ?? '暂无'}</dd>
              </div>
            </dl>
          </Card>
        </div>
      ) : null}
    </Drawer>
  );
}
