import { useMemberSettingsStore } from '@/store/useMemberSettingsStore';
import { useEffect, useMemo, useState } from 'react';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { OrderPayPayload, OrderPrepayVO } from '@/features/order/model/orderTypes';
import { ORDER_PAY_METHODS, POINTS_PER_YUAN } from '@/features/order/model/orderTypes';
import { createOrderPaySchema, type OrderPayValues } from '@/features/order/model/orderSchemas';
import {
  allocatePayments,
  maxRedeemPoints,
  pointsDeduction,
  type PaymentRow,
} from '@/features/order/model/orderSettlement';
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
  const pointsEnabled = useMemberSettingsStore((s) => s.pointsEnabled);
  const memberId = member?.id;
  const memberPoints = member?.points ?? 0;
  const memberBalance = member?.balance ?? 0;
  const pointDebt = member?.pointDebt ?? 0;
  const context = useMemo(
    () => ({ payable, member, pointsEnabled }),
    [payable, member, pointsEnabled],
  );
  const schema = useMemo(() => createOrderPaySchema(context), [context]);
  const {
    control,
    register,
    reset,
    setValue,
    handleSubmit,
    formState: { errors },
  } = useForm<OrderPayValues>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: { usePoints: '', cashReceived: '', payments: [] },
  });
  const usePoints = useWatch({ control, name: 'usePoints' });
  const cashReceived = useWatch({ control, name: 'cashReceived' });
  const payments = useWatch({ control, name: 'payments' });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [scanChannels, setScanChannels] = useState<string[]>([]);
  // 扫码视图：预下单结果 + 轮询状态（orderId 由落单回调返回）
  const [scan, setScan] = useState<{
    orderId: string;
    codeUrl: string;
    amount: number;
    channel: string;
  } | null>(null);

  useEffect(() => {
    if (open) {
      const initialContext = {
        payable,
        member:
          memberId == null
            ? null
            : { id: memberId, points: memberPoints, balance: memberBalance, pointDebt },
        pointsEnabled,
      };
      const points = maxRedeemPoints(initialContext);
      reset({
        usePoints: String(points),
        cashReceived: '',
        payments: allocatePayments(
          round2(payable - pointsDeduction(initialContext, points)),
          memberBalance,
        ),
      });
      setSubmitError('');
      setScan(null);
    }
  }, [open, payable, memberId, memberPoints, memberBalance, pointDebt, pointsEnabled, reset]);

  useEffect(() => {
    if (open) {
      let active = true;
      payConfigApi
        .options()
        .then(
          (channels) =>
            active &&
            setScanChannels(
              channels.map((c) => c.channel).filter((c) => c === 'wxpay' || c === 'alipay'),
            ),
        )
        .catch(() => {
          if (active) setScanChannels([]);
        });
      return () => {
        active = false;
      };
    }
  }, [open]);

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

  const pointDeductAmount = pointsDeduction(context, Number(usePoints) || 0);

  const receivable = round2(payable - pointDeductAmount);
  const payTotal = useMemo(
    () => round2(payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0)),
    [payments],
  );
  const balanceTotal = useMemo(
    () =>
      round2(
        payments
          .filter((p) => p.payMethod === 5)
          .reduce((sum, p) => sum + (Number(p.amount) || 0), 0),
      ),
    [payments],
  );
  const cashTotal = useMemo(
    () =>
      round2(
        payments
          .filter((p) => p.payMethod === 1)
          .reduce((sum, p) => sum + (Number(p.amount) || 0), 0),
      ),
    [payments],
  );
  const change = round2(Math.max(0, (Number(cashReceived) || 0) - cashTotal));

  // 扫码行：微信/支付宝（一次仅一行，渠道须已开通直连；未开通时作手动确认）
  const scanRows = payments.filter((p) => p.payMethod === 2 || p.payMethod === 3);
  const scanRowCount = scanRows.length;
  const scanChannel =
    scanRowCount === 1 ? (scanRows[0].payMethod === 2 ? 'wxpay' : 'alipay') : null;
  const isScan = Boolean(scanChannel && scanChannels.includes(scanChannel));

  const pointsError = errors.usePoints?.message;
  const balanceError = balanceTotal > memberBalance ? '会员余额不足' : undefined;
  const scanError =
    scanRowCount > 1 ? '扫码支付仅支持一行微信或支付宝（一次只出一种码）' : undefined;
  const totalError =
    payTotal !== receivable && pointDeductAmount <= payable
      ? `支付合计 ${formatCurrency(payTotal)} 须等于应收 ${formatCurrency(receivable)}`
      : undefined;
  const hasError = Boolean(pointsError || balanceError || scanError || totalError);

  function updatePoints(value: string): void {
    setValue('usePoints', value, { shouldValidate: true });
    const due = round2(payable - pointsDeduction(context, Number(value) || 0));
    const preferred = payments.find((row) => row.payMethod !== 5)?.payMethod ?? 1;
    setValue('payments', allocatePayments(due, memberBalance, preferred), { shouldValidate: true });
  }

  function updatePayment(index: number, patch: Partial<PaymentRow>): void {
    setValue(
      'payments',
      payments.map((row, i) => (i === index ? { ...row, ...patch } : row)),
      { shouldValidate: true },
    );
  }

  function removePayment(index: number): void {
    setValue(
      'payments',
      payments.filter((_, i) => i !== index),
      { shouldValidate: true },
    );
  }

  function addPayment(): void {
    // 快捷补一行：默认抵剩余未付金额，方式默认微信
    const rest = round2(receivable - payTotal);
    const method = ORDER_PAY_METHODS.find(
      (m) => m.value !== 5 && !payments.some((p) => p.payMethod === m.value),
    );
    if (method)
      setValue(
        'payments',
        [...payments, { payMethod: method.value, amount: rest > 0 ? String(rest) : '' }],
        { shouldValidate: true },
      );
  }

  /** 余额支付快捷行：金额自动取 min(可用余额, 待付余额) */
  function addBalancePayment(): void {
    const rest = round2(receivable - payTotal);
    if (rest <= 0) {
      return;
    }
    setValue(
      'payments',
      [...payments, { payMethod: 5, amount: String(round2(Math.min(memberBalance, rest))) }],
      { shouldValidate: true },
    );
  }

  async function handleConfirm(): Promise<void> {
    if (hasError || submitting) {
      return;
    }
    setSubmitting(true);
    setSubmitError('');
    try {
      const payload: OrderPayPayload = {
        usePoints: pointsEnabled ? Number(usePoints) || 0 : 0,
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
    } catch (error: unknown) {
      setSubmitError(error instanceof Error ? error.message : '结算失败，请重试');
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
          <Button
            disabled={hasError}
            loading={submitting}
            onClick={() => void handleSubmit(handleConfirm)()}
          >
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
          label="待支付"
          tone="accent"
          value={formatCurrency(receivable)}
        />

        {member && pointsEnabled ? (
          <Field
            error={pointsError}
            hint={
              pointDebt > 0
                ? '会员有待追回积分，暂不能使用积分抵扣'
                : maxRedeemPoints(context) === 0
                  ? '至少100积分起抵，抵扣金额不能超过本单应收'
                  : `至少100积分起抵，本单最多可用 ${maxRedeemPoints(context)} 分；本次抵扣 ${formatCurrency(pointDeductAmount)}`
            }
            label={`积分抵扣（可用 ${memberPoints} 分，${POINTS_PER_YUAN} 分 = 1 元）`}
          >
            <Input
              {...register('usePoints')}
              readOnly={maxRedeemPoints(context) === 0}
              inputMode="numeric"
              invalid={Boolean(pointsError)}
              onChange={(e) => {
                const v = e.target.value;
                if (v === '' || INT_RE.test(v)) {
                  updatePoints(v);
                }
              }}
              placeholder="不使用则留空"
              value={usePoints}
            />
          </Field>
        ) : null}

        <div className="space-y-2">
          {member ? (
            <div className="rounded-md bg-salon-accent/5 p-3 text-sm dark:bg-violet-500/10">
              <div className="text-xs text-zinc-500 dark:text-zinc-400">会员当前可用余额</div>
              <div className="mt-1 text-lg font-semibold">{formatCurrency(memberBalance)}</div>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                {receivable === 0
                  ? '本单无需支付'
                  : memberBalance >= receivable
                    ? '余额足够，本单自动使用会员余额支付'
                    : `优先使用会员余额，差额 ${formatCurrency(Math.max(0, round2(receivable - memberBalance)))} 使用其他方式支付`}
              </p>
            </div>
          ) : null}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">支付方式</span>
            <div className="flex gap-2">
              {member &&
              memberBalance > 0 &&
              !payments.some((row) => row.payMethod === 5) &&
              receivable - payTotal > 0 ? (
                <Button onClick={addBalancePayment} size="sm" variant="secondary">
                  余额支付（可用 {formatCurrency(memberBalance)}）
                </Button>
              ) : null}
              {!member || memberBalance < receivable ? (
                <Button
                  disabled={payTotal >= receivable || payments.length >= 4}
                  icon={<Plus className="size-4" />}
                  onClick={addPayment}
                  size="sm"
                  variant="secondary"
                >
                  添加方式
                </Button>
              ) : null}
            </div>
          </div>
          {payments.map((row, index) => (
            <div className="flex items-center gap-2" key={index}>
              <Select
                {...register(`payments.${index}.payMethod`, { valueAsNumber: true })}
                className="w-32"
                onChange={(e) => updatePayment(index, { payMethod: Number(e.target.value) })}
                value={row.payMethod}
              >
                {ORDER_PAY_METHODS.filter(
                  (m) =>
                    m.value === row.payMethod ||
                    (m.value === 5
                      ? Boolean(member && memberBalance > 0)
                      : !member || memberBalance < receivable),
                ).map((m) => (
                  <option
                    disabled={payments.some((p, i) => i !== index && p.payMethod === m.value)}
                    key={m.value}
                    value={m.value}
                  >
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
                {...register(`payments.${index}.amount`)}
                inputMode="decimal"
                invalid={
                  Boolean(errors.payments?.[index]?.amount) ||
                  (row.payMethod === 5 && Boolean(balanceError))
                }
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === '' || DECIMAL_RE.test(v)) {
                    updatePayment(index, { amount: v });
                  }
                }}
                placeholder="金额"
                value={row.amount}
              />
              {errors.payments?.[index]?.amount?.message ? (
                <p className="text-xs text-rose-500">{errors.payments[index]?.amount?.message}</p>
              ) : null}
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
          {errors.payments?.root?.message || errors.payments?.message ? (
            <p className="text-xs text-rose-500">
              {errors.payments.root?.message ?? errors.payments.message}
            </p>
          ) : null}
          {payments.length === 0 ? (
            <p className="text-sm text-emerald-600 dark:text-emerald-400">
              本单已全部抵扣，无需额外支付。
            </p>
          ) : null}
        </div>

        {cashRowExists ? (
          <div className="grid grid-cols-2 gap-3">
            <Field label="现金投入" error={errors.cashReceived?.message}>
              <Input
                {...register('cashReceived')}
                invalid={Boolean(errors.cashReceived)}
                inputMode="decimal"
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === '' || DECIMAL_RE.test(v)) {
                    setValue('cashReceived', v, { shouldValidate: true });
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
        {submitError ? (
          <p role="alert" className="text-sm text-rose-500">
            {submitError}
          </p>
        ) : null}
      </div>
    </Modal>
  );
}
