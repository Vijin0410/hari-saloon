import { useEffect, useMemo, useState } from 'react';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import type { OrderPayPayload, OrderPrepayVO } from '@/features/order/model/orderTypes';
import { ORDER_PAY_METHODS, POINTS_PER_YUAN } from '@/features/order/model/orderTypes';
import type { MemberPageVO } from '@/features/member/model/memberTypes';
import { orderApi } from '@/shared/api/modules/orderApi';
import { payConfigApi } from '@/shared/api/modules/payConfigApi';
import { Button } from '@/shared/ui/Button';
import { Field } from '@/shared/ui/Field';
import { Input } from '@/shared/ui/Input';
import { Modal } from '@/shared/ui/Modal';
import { StatCard } from '@/shared/ui/StatCard';
import { Select } from '@/shared/ui/Select';
import { QrCode } from '@/shared/ui/QrCode';
import { formatCurrency } from '@/shared/lib/format';

/** 金额输入中间态正则 */
const DECIMAL_RE = /^\d{1,9}(\.\d{0,2})?$/;
/** 整数输入中间态正则 */
const INT_RE = /^\d{1,9}$/;
/** 扫码轮询间隔（毫秒） */
const POLL_INTERVAL = 3000;

/** 扫码渠道展示元信息（与后端 pay_channel 对应） */
const SCAN_META: Record<string, { name: string; app: string }> = {
  wxpay: { name: '微信', app: '微信' },
  alipay: { name: '支付宝', app: '支付宝' },
};

interface PaymentRow {
  payMethod: number;
  amount: string;
}

const round2 = (n: number): number => Math.round(n * 100) / 100;

/**
 * 订单结算弹窗：组合支付（每行一种方式）+ 积分抵扣（会员）+ 现金找零预览。
 * 支付合计必须等于「应收-积分抵扣」，前端就近校验，后端仍为最终裁决。
 * 含微信/支付宝行且租户已开通对应直连渠道时走「扫码收款」（出码轮询，回调自动结算）；
 * 未开通渠道时该行作为手动确认收款（收银员用自己的收款码）。
 */
export function OrderPayDialog({
  open,
  payable,
  member,
  onClose,
  onConfirm,
  onPrepay,
  onPaid,
}: {
  open: boolean;
  payable: number;
  member: MemberPageVO | null;
  onClose: () => void;
  onConfirm: (payload: OrderPayPayload) => Promise<void>;
  onPrepay: (payload: OrderPayPayload) => Promise<OrderPrepayVO>;
  onPaid: () => void | Promise<void>;
}) {
  const [usePoints, setUsePoints] = useState('');
  const [cashReceived, setCashReceived] = useState('');
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [scanChannels, setScanChannels] = useState<string[]>([]);
  // 扫码视图：预下单结果 + 轮询状态（orderId 由落单回调返回）
  const [scan, setScan] = useState<{ orderId: string; codeUrl: string; amount: number; channel: string } | null>(null);

  useEffect(() => {
    if (open) {
      setUsePoints('');
      setCashReceived('');
      setPayments([{ payMethod: 1, amount: String(round2(payable)) }]);
      setScan(null);
      payConfigApi
        .options()
        .then((channels) =>
          setScanChannels(
            channels.map((c) => c.channel).filter((c) => c === 'wxpay' || c === 'alipay'),
          ),
        )
        .catch(() => setScanChannels([]));
    }
  }, [open, payable]);

  // 扫码轮询：订单已支付则回调清理并关闭；订单被取消则回表单
  useEffect(() => {
    if (!open || !scan) {
      return undefined;
    }
    let active = true;
    const timer = window.setInterval(() => {
      orderApi
        .payStatus(scan.orderId)
        .then((status) => {
          if (!active) {
            return;
          }
          if (status.status === 1) {
            window.clearInterval(timer);
            void Promise.resolve(onPaid()).then(() => onClose());
          } else if (status.status === 4) {
            window.clearInterval(timer);
            setScan(null);
          }
        })
        .catch(() => {
          // 轮询失败忽略，下一轮重试（查单兜底任务也会补偿）
        });
    }, POLL_INTERVAL);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [open, scan, onPaid, onClose]);

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

  // 扫码行：微信/支付宝（一次仅一行，渠道须已开通直连；未开通时作手动确认）
  const scanRows = payments.filter((p) => p.payMethod === 2 || p.payMethod === 3);
  const scanRowCount = scanRows.length;
  const scanChannel =
    scanRowCount === 1
      ? scanRows[0].payMethod === 2
        ? 'wxpay'
        : 'alipay'
      : null;
  const isScan = Boolean(scanChannel && scanChannels.includes(scanChannel));

  const pointsError =
    Number(usePoints) > memberPoints
      ? '积分不足'
      : pointDeductAmount > payable
        ? '积分抵扣不能超过应收'
        : undefined;
  const balanceError = balanceTotal > memberBalance ? '会员余额不足' : undefined;
  const scanError =
    scanRowCount > 1 ? '扫码支付仅支持一行微信或支付宝（一次只出一种码）' : undefined;
  const totalError =
    payTotal !== receivable && pointDeductAmount <= payable
      ? `支付合计 ${formatCurrency(payTotal)} 须等于应收 ${formatCurrency(receivable)}`
      : undefined;
  const hasError = Boolean(pointsError || balanceError || scanError || totalError);

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
      const payload: OrderPayPayload = {
        usePoints: Number(usePoints) || 0,
        cashReceived: Number(cashReceived) || 0,
        payments: payments
          .filter((p) => (Number(p.amount) || 0) > 0)
          .map((p) => ({ payMethod: p.payMethod, amount: round2(Number(p.amount) || 0) })),
      };
      if (isScan && scanChannel) {
        // 扫码收款：落单 + 出码，结算由回调/查单补偿自动完成
        const prepay = await onPrepay(payload);
        setScan({
          orderId: String(prepay.orderId),
          codeUrl: prepay.codeUrl,
          amount: prepay.amount,
          channel: scanChannel,
        });
      } else {
        await onConfirm(payload);
        onClose();
      }
    } finally {
      setSubmitting(false);
    }
  }

  // 扫码视图：二维码 + 支付等待（按渠道区分文案）
  if (scan) {
    const meta = SCAN_META[scan.channel];
    const handleScanCancel = async (): Promise<void> => {
      // 关流水回表单（订单保持挂单，可改支付方式重新结算）
      try {
        await orderApi.cancelPrepay(scan.orderId);
      } catch {
        // 已确认/已关闭时后端拒绝，忽略（可能是轮询即将确认的成功单）
      } finally {
        setScan(null);
      }
    };
    return (
      <Modal
        description={`顾客使用${meta.app}扫码完成支付后自动确认结算；网络波动导致未到账时，系统每 2 分钟查单自动补偿。`}
        footer={
          <>
            <Button onClick={() => void handleScanCancel()} variant="secondary">
              取消支付
            </Button>
          </>
        }
        onClose={onClose}
        open={open}
        title={`${meta.name}扫码支付`}
        maxWidthClassName="max-w-sm"
      >
        <div className="flex flex-col items-center gap-3 py-2">
          <div className="flex items-center gap-2 text-2xl font-bold">
            {formatCurrency(scan.amount)}
          </div>
          <QrCode size={224} text={scan.codeUrl} />
          <div className="flex items-center gap-2 text-sm text-zinc-500">
            <Loader2 className="size-4 animate-spin" />
            等待顾客扫码支付…
          </div>
        </div>
      </Modal>
    );
  }

  const cashRowExists = payments.some((p) => p.payMethod === 1);

  return (
    <Modal
      description={
        isScan
          ? '扫码收款：确认后生成付款码，顾客支付成功自动结算（含余额/积分/现金组合部分）。'
          : '组合支付：每行一种方式；支付合计须等于应收金额（积分抵扣部分除外）。'
      }
      footer={
        <>
          <Button onClick={onClose} variant="secondary">
            取消
          </Button>
          <Button disabled={hasError} loading={submitting} onClick={() => void handleConfirm()}>
            {isScan ? '生成付款码' : '确认支付'}
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
                    {m.value === 2 && scanChannels.includes('wxpay')
                      ? '（扫码）'
                      : m.value === 3 && scanChannels.includes('alipay')
                        ? '（扫码）'
                        : ''}
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
          {scanError ? <p className="text-xs text-rose-500">{scanError}</p> : null}
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
