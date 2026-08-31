import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { orderApi } from '@/shared/api/modules/orderApi';
import type { OrderPageVO } from '@/features/order/model/orderTypes';
import { Badge } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { Field } from '@/shared/ui/Field';
import { Input } from '@/shared/ui/Input';
import { Modal } from '@/shared/ui/Modal';
import { Textarea } from '@/shared/ui/Textarea';
import { formatCurrency } from '@/shared/lib/format';

/** 金额：最多两位小数（中间态正则，与后端 @Digits 一致） */
const AMOUNT_RE = /^\d{1,9}(\.\d{1,2})?$/;

/**
 * 订单退款弹窗（P6）：金额默认可退上限（整单），原因必填；
 * 微信/支付宝原路退回（微信异步处理中见详情进度），余额/积分退回会员。
 */
export function OrderRefundDialog({
  onClose,
  onRefunded,
  open,
  order,
}: {
  onClose: () => void;
  onRefunded: () => void;
  open: boolean;
  order: OrderPageVO | null;
}) {
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [reasonError, setReasonError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [pendingMessage, setPendingMessage] = useState('');

  const refundable = Math.max(
    0,
    (order?.receivedAmount ?? 0) - (order?.refundedAmount ?? 0),
  );
  const amountNum = Number(amount);
  // 整单退光时后端会一并退回积分抵扣
  const pointHint =
    order && amountNum >= refundable && (order.pointDeductAmount ?? 0) > 0
      ? `本单积分抵扣 ${order.pointDeductAmount} 元将一并退回会员积分`
      : undefined;

  useEffect(() => {
    if (open) {
      setAmount(refundable > 0 ? String(refundable) : '');
      setReason('');
      setError('');
      setReasonError('');
      setPendingMessage('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, order?.id]);

  if (!order) {
    return null;
  }
  const current = order;

  async function handleConfirm(): Promise<void> {
    if (!amount || !AMOUNT_RE.test(amount)) {
      setError('退款金额格式不正确（最多两位小数）');
      return;
    }
    if (amountNum <= 0) {
      setError('退款金额必须大于0');
      return;
    }
    if (amountNum > refundable) {
      setError(`退款金额不能超过可退金额 ${refundable}`);
      return;
    }
    if (!reason.trim()) {
      setReasonError('退款原因不能为空');
      return;
    }
    setSubmitting(true);
    try {
      const result = await orderApi.refund(String(current.id), {
        refundAmount: amountNum,
        reason: reason.trim(),
      });
      if (result.status === 0) {
        // 微信退款异步：渠道处理中，详情/列表可见进度
        setPendingMessage('退款已发起，微信渠道处理中，可在订单详情查看进度');
      } else {
        onRefunded();
        onClose();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '退款失败，请重试');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      description={`订单 ${order.orderNo}：实收 ${formatCurrency(order.receivedAmount)}，已退 ${formatCurrency(order.refundedAmount ?? 0)}，可退 ${formatCurrency(refundable)}。`}
      footer={
        pendingMessage ? (
          <Button onClick={onRefundedAndClose} variant="secondary">
            知道了
          </Button>
        ) : (
          <>
            <Button onClick={onClose} variant="secondary">
              取消
            </Button>
            <Button
              disabled={refundable <= 0}
              loading={submitting}
              onClick={() => void handleConfirm()}
              variant="danger"
            >
              确认退款
            </Button>
          </>
        )
      }
      onClose={onClose}
      open={open}
      title="订单退款"
      maxWidthClassName="max-w-md"
    >
      {pendingMessage ? (
        <div className="flex items-start gap-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <div>{pendingMessage}</div>
        </div>
      ) : (
        <div className="space-y-4">
          <Field error={error} hint="余额退回会员（先本金后赠送）；微信/支付宝原路退回；现金等由门店线下退给顾客" label="退款金额" required>
            <div className="flex gap-2">
              <Input
                inputMode="decimal"
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === '' || AMOUNT_RE.test(v)) {
                    setAmount(v);
                    setError('');
                  }
                }}
                placeholder="如：100"
                value={amount}
              />
              {refundable > 0 && amountNum !== refundable ? (
                <Button
                  className="shrink-0"
                  onClick={() => {
                    setAmount(String(refundable));
                    setError('');
                  }}
                  size="sm"
                  variant="secondary"
                >
                  全部退款
                </Button>
              ) : null}
            </div>
          </Field>
          <Field hint={pointHint} label="退款原因" required>
            <Textarea
              onChange={(e) => {
                setReason(e.target.value);
                setReasonError('');
              }}
              placeholder="如：顾客对服务不满意，协商退款"
              rows={3}
              value={reason}
            />
            {reasonError ? (
              <span className="block text-xs text-rose-600 dark:text-rose-300">{reasonError}</span>
            ) : null}
          </Field>
          {order.status === 2 ? (
            <div className="flex items-center gap-2 text-sm text-zinc-500">
              <Badge tone="warning">部分退款</Badge>
              本单已有退款记录，剩余可退 {formatCurrency(refundable)}
            </div>
          ) : null}
        </div>
      )}
    </Modal>
  );

  function onRefundedAndClose(): void {
    onRefunded();
    onClose();
  }
}
