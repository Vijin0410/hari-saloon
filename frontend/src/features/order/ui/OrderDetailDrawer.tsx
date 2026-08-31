import { useEffect, useState, type ReactNode } from 'react';
import { orderApi } from '@/shared/api/modules/orderApi';
import type { OrderDetailVO } from '@/features/order/model/orderTypes';
import {
  ORDER_STATUS_LABEL,
  REFUND_CHANNEL_STATUS_LABEL,
  REFUND_STATUS_LABEL,
} from '@/features/order/model/orderTypes';
import { Badge } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { Drawer } from '@/shared/ui/Drawer';
import { PageLoading } from '@/shared/ui/PageLoading';
import { StatCard } from '@/shared/ui/StatCard';
import { formatCurrency } from '@/shared/lib/format';
import { OrderRefundDialog } from './OrderRefundDialog';

function statusBadge(status: number): ReactNode {
  const label = ORDER_STATUS_LABEL[status] ?? '未知';
  const tone =
    status === 1
      ? 'success'
      : status === 0
        ? 'info'
        : status === 4
          ? 'neutral'
          : 'warning';
  return <Badge tone={tone}>{label}</Badge>;
}

function refundStatusBadge(status: number): ReactNode {
  const label = REFUND_STATUS_LABEL[status] ?? '未知';
  const tone = status === 1 ? 'success' : status === 2 ? 'danger' : 'warning';
  return <Badge tone={tone}>{label}</Badge>;
}

function payMethodText(m: { payMethod: number; payMethodLabel?: string }): string {
  return m.payMethodLabel ?? `方式${m.payMethod}`;
}

/** 订单详情抽屉：汇总金额 + 明细 + 支付方式 + 退款记录；已支付可退款（biz:order:refund） */
export function OrderDetailDrawer({
  id,
  onClose,
  onCancel,
  onRefund,
  canCancel,
  canRefund,
}: {
  id: string | null;
  onClose: () => void;
  onCancel?: (id: string) => void;
  onRefund?: () => void;
  canCancel?: boolean;
  canRefund?: boolean;
}) {
  const [detail, setDetail] = useState<OrderDetailVO | null>(null);
  const [loading, setLoading] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);

  const load = (orderId: string): void => {
    orderApi
      .detail(orderId)
      .then(setDetail)
      .catch(() => setDetail(null));
  };

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

  const refundable =
    detail && (detail.status === 1 || detail.status === 2)
      ? Math.max(0, detail.receivedAmount - (detail.refundedAmount ?? 0))
      : 0;

  return (
    <Drawer
      footer={
        <>
          {detail && (detail.status === 1 || detail.status === 2) && canRefund && refundable > 0 ? (
            <Button onClick={() => setRefundOpen(true)} variant="secondary">
              退款
            </Button>
          ) : null}
          {canCancel && detail && detail.status === 0 && onCancel ? (
            <Button
              onClick={() => onCancel(String(detail.id))}
              variant="secondary"
            >
              取消挂单
            </Button>
          ) : null}
        </>
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
              {(detail.refundedAmount ?? 0) > 0 ? (
                <div className="rounded-md bg-amber-50 p-3 dark:bg-amber-950/40">
                  <div className="text-xs text-amber-600 dark:text-amber-400">已退款</div>
                  <div className="mt-1 text-lg font-semibold text-amber-700 dark:text-amber-300">
                    {formatCurrency(detail.refundedAmount ?? 0)}
                    <span className="ml-1 text-xs font-normal text-zinc-500">
                      （可退 {formatCurrency(refundable)}）
                    </span>
                  </div>
                </div>
              ) : null}
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
          <Card title={`退款记录（${detail.refunds?.length ?? 0} 笔）`}>
            <div className="space-y-3">
              {(detail.refunds ?? []).map((r) => (
                <div
                  className="rounded-md border border-salon-line p-3 text-sm dark:border-zinc-800"
                  key={String(r.id)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{formatCurrency(r.refundAmount)}</span>
                    {refundStatusBadge(r.status)}
                  </div>
                  <div className="mt-1 text-xs text-zinc-500">
                    {r.refundNo}
                    {r.createTime ? ` · ${r.createTime}` : ''}
                  </div>
                  <div className="mt-1 text-xs text-zinc-500">原因：{r.reason ?? '暂无'}</div>
                  {(r.pointRefundPoints ?? 0) > 0 || (r.balanceRefundAmount ?? 0) > 0 ? (
                    <div className="mt-1 flex flex-wrap gap-2 text-xs text-zinc-500">
                      {(r.balanceRefundAmount ?? 0) > 0 ? (
                        <span>退回余额 {formatCurrency(r.balanceRefundAmount ?? 0)}（先本金后赠送）</span>
                      ) : null}
                      {(r.pointRefundPoints ?? 0) > 0 ? (
                        <span>退回积分 {r.pointRefundPoints} 分</span>
                      ) : null}
                    </div>
                  ) : null}
                  {r.payments?.length ? (
                    <div className="mt-2 space-y-1 border-t border-salon-line pt-2 text-xs dark:border-zinc-800">
                      {r.payments.map((p) => (
                        <div className="flex justify-between" key={String(p.id)}>
                          <span className="text-zinc-500">
                            {payMethodText(p)}
                            {p.channel ? `（${p.channel === 'wxpay' ? '微信原路' : '支付宝原路'}）` : ''}
                          </span>
                          <span className="flex items-center gap-2">
                            <span>{formatCurrency(p.amount)}</span>
                            <Badge tone={p.channelStatus === 'success' ? 'success' : p.channelStatus === 'failed' ? 'danger' : 'warning'}>
                              {REFUND_CHANNEL_STATUS_LABEL[p.channelStatus] ?? p.channelStatus}
                            </Badge>
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
              {detail.refunds?.length ? null : <div className="text-zinc-400">暂无退款记录</div>}
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

      <OrderRefundDialog
        onClose={() => setRefundOpen(false)}
        onRefunded={() => {
          if (id) {
            load(id);
          }
          onRefund?.();
        }}
        open={refundOpen}
        order={refundable > 0 ? detail : null}
      />
    </Drawer>
  );
}
