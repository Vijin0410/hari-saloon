import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { OrderPayPayload } from '@/features/order/model/orderTypes';
import { ORDER_PAY_METHODS, POINTS_PER_YUAN } from '@/features/order/model/orderTypes';
import type { MemberPageVO } from '@/features/member/model/memberTypes';
import { Button } from '@/shared/ui/Button';
import { Field } from '@/shared/ui/Field';
import { Input } from '@/shared/ui/Input';
import { Modal } from '@/shared/ui/Modal';
import { StatCard } from '@/shared/ui/StatCard';
import { Select } from '@/shared/ui/Select';
import { formatCurrency } from '@/shared/lib/format';

/** 金额输入中间态正则 */
const DECIMAL_RE = /^\d{1,9}(\.\d{0,2})?$/;
/** 整数输入中间态正则 */
const INT_RE = /^\d{1,9}$/;

interface PaymentRow {
  payMethod: number;
  amount: string;
}

const round2 = (n: number): number => Math.round(n * 100) / 100;

/**
 * 订单结算弹窗：组合支付（每行一种方式）+ 积分抵扣（会员）+ 现金找零预览。
 * 支付合计必须等于「应收-积分抵扣」，前端就近校验，后端仍为最终裁决。
 */
export function OrderPayDialog({
  open,
  payable,
  member,
  onClose,
  onConfirm,
}: {
  open: boolean;
  payable: number;
  member: MemberPageVO | null;
  onClose: () => void;
  onConfirm: (payload: OrderPayPayload) => Promise<void>;
}) {
  const [usePoints, setUsePoints] = useState('');
  const [cashReceived, setCashReceived] = useState('');
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setUsePoints('');
      setCashReceived('');
      setPayments([{ payMethod: 1, amount: String(round2(payable)) }]);
    }
  }, [open, payable]);

  const memberPoints = member?.points ?? 0;
  const memberBalance = member?.balance ?? 0;

  const pointDeductAmount = useMemo(() => {
    const p = Number(usePoints) || 0;
    if (p <= 0) {
      return 0;
    }
    return Math.floor((p / POINTS_PER_YUAN) * 100) / 100;
  }, [usePoints]);

  const receivable = round2(payable - pointDeductAmount);
  const payTotal = useMemo(
    () => round2(payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0)),
    [payments],
  );
  const balanceTotal = useMemo(
    () =>
      round2(
        payments.filter((p) => p.payMethod === 5).reduce((sum, p) => sum + (Number(p.amount) || 0), 0),
      ),
    [payments],
  );
  const cashTotal = useMemo(
    () =>
      round2(
        payments.filter((p) => p.payMethod === 1).reduce((sum, p) => sum + (Number(p.amount) || 0), 0),
      ),
    [payments],
  );
  const change = round2(Math.max(0, (Number(cashReceived) || 0) - cashTotal));

  const pointsError =
    Number(usePoints) > memberPoints
      ? '积分不足'
      : pointDeductAmount > payable
        ? '积分抵扣不能超过应收'
        : undefined;
  const balanceError = balanceTotal > memberBalance ? '会员余额不足' : undefined;
  const totalError =
    payTotal !== receivable && pointDeductAmount <= payable
      ? `支付合计 ${formatCurrency(payTotal)} 须等于应收 ${formatCurrency(receivable)}`
      : undefined;
  const hasError = Boolean(pointsError || balanceError || totalError);

  function updatePayment(index: number, patch: Partial<PaymentRow>): void {
    setPayments((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function removePayment(index: number): void {
    setPayments((prev) => prev.filter((_, i) => i !== index));
  }

  function addPayment(): void {
    // 快捷补一行：默认抵剩余未付金额，方式默认微信
    const rest = round2(receivable - payTotal);
    setPayments((prev) => [...prev, { payMethod: 2, amount: rest > 0 ? String(rest) : '' }]);
  }

  /** 余额支付快捷行：金额自动取 min(可用余额, 待付余额) */
  function addBalancePayment(): void {
    const rest = round2(receivable - payTotal);
    if (rest <= 0) {
      return;
    }
    setPayments((prev) => [
      ...prev,
      { payMethod: 5, amount: String(round2(Math.min(memberBalance, rest))) },
    ]);
  }

  async function handleConfirm(): Promise<void> {
    if (hasError || submitting) {
      return;
    }
    setSubmitting(true);
    try {
      await onConfirm({
        usePoints: Number(usePoints) || 0,
        cashReceived: Number(cashReceived) || 0,
        payments: payments
          .filter((p) => (Number(p.amount) || 0) > 0)
          .map((p) => ({ payMethod: p.payMethod, amount: round2(Number(p.amount) || 0) })),
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  const cashRowExists = payments.some((p) => p.payMethod === 1);

  return (
    <Modal
      description="组合支付：每行一种方式；支付合计须等于应收金额（积分抵扣部分除外）。"
      footer={
        <>
          <Button onClick={onClose} variant="secondary">
            取消
          </Button>
          <Button disabled={hasError} loading={submitting} onClick={() => void handleConfirm()}>
            确认支付
          </Button>
        </>
      }
      onClose={onClose}
      open={open}
      title="订单结算"
      maxWidthClassName="max-w-xl"
    >
      <div className="space-y-4">
        <StatCard
          hint={
            pointDeductAmount > 0
              ? `积分抵扣 ${formatCurrency(pointDeductAmount)} 后应收 ${formatCurrency(receivable)}`
              : `应收金额（会员等级折扣已按行计算）`
          }
          label="应收"
          tone="accent"
          value={formatCurrency(payable)}
        />

        {member ? (
          <Field
            error={pointsError}
            hint={pointDeductAmount > 0 ? `本次抵扣 ${formatCurrency(pointDeductAmount)}` : undefined}
            label={`积分抵扣（可用 ${memberPoints} 分，${POINTS_PER_YUAN} 分 = 1 元）`}
          >
            <Input
              inputMode="numeric"
              invalid={Boolean(pointsError)}
              onChange={(e) => {
                const v = e.target.value;
                if (v === '' || INT_RE.test(v)) {
                  setUsePoints(v);
                }
              }}
              placeholder="不使用则留空"
              value={usePoints}
            />
          </Field>
        ) : null}

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">支付方式</span>
            <div className="flex gap-2">
              {member && memberBalance > 0 && receivable - payTotal > 0 ? (
                <Button onClick={addBalancePayment} size="sm" variant="secondary">
                  余额支付（可用 {formatCurrency(memberBalance)}）
                </Button>
              ) : null}
              <Button
                disabled={payTotal >= receivable || payments.length >= 4}
                icon={<Plus className="size-4" />}
                onClick={addPayment}
                size="sm"
                variant="secondary"
              >
                添加方式
              </Button>
            </div>
          </div>
          {payments.map((row, index) => (
            <div className="flex items-center gap-2" key={index}>
              <Select
                className="w-32"
                onChange={(e) => updatePayment(index, { payMethod: Number(e.target.value) })}
                value={row.payMethod}
              >
                {ORDER_PAY_METHODS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </Select>
              <Input
                inputMode="decimal"
                invalid={row.payMethod === 5 && Boolean(balanceError)}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === '' || DECIMAL_RE.test(v)) {
                    updatePayment(index, { amount: v });
                  }
                }}
                placeholder="金额"
                value={row.amount}
              />
              {payments.length > 1 ? (
                <Button
                  icon={<Trash2 className="size-4" />}
                  onClick={() => removePayment(index)}
                  size="sm"
                  variant="secondary"
                />
              ) : null}
            </div>
          ))}
          {balanceError ? <p className="text-xs text-rose-500">{balanceError}</p> : null}
          {totalError ? <p className="text-xs text-rose-500">{totalError}</p> : null}
        </div>

        {cashRowExists ? (
          <div className="grid grid-cols-2 gap-3">
            <Field label="现金投入">
              <Input
                inputMode="decimal"
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === '' || DECIMAL_RE.test(v)) {
                    setCashReceived(v);
                  }
                }}
                placeholder="顾客实付现金"
                value={cashReceived}
              />
            </Field>
            <div className="rounded-md bg-stone-50 p-3 dark:bg-zinc-900">
              <div className="text-xs text-zinc-500 dark:text-zinc-400">找零</div>
              <div className="mt-1 text-lg font-semibold">{formatCurrency(change)}</div>
            </div>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
