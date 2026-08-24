import { useEffect, useMemo, useState } from 'react';
import { rechargeApi, rechargeActivityApi } from '@/shared/api/modules/rechargeApi';
import type { RechargeActivityOption, RechargePreviewVO } from '@/features/recharge/model/rechargeTypes';
import { GIFT_SOURCE_LABEL, RECHARGE_PAY_METHODS } from '@/features/recharge/model/rechargeTypes';
import { Button } from '@/shared/ui/Button';
import { Field } from '@/shared/ui/Field';
import { Input } from '@/shared/ui/Input';
import { Modal } from '@/shared/ui/Modal';
import { Select } from '@/shared/ui/Select';
import { formatCurrency } from '@/shared/lib/format';
import { useDebounce } from '@/shared/hooks/useDebounce';

/** 金额输入中间态正则 */
const DECIMAL_RE = /^\d{1,9}(\.\d{0,2})?$/;

/**
 * 会员充值弹窗：金额输入 + 活动档位快捷选择 + 赠送实时预览（服务端口径）+ 支付方式。
 * 一期为收银员手动确认收款模式。
 */
export function RechargeDialog({
  open,
  memberId,
  memberName,
  onClose,
  onRecharged,
}: {
  open: boolean;
  memberId: string | null;
  memberName?: string;
  onClose: () => void;
  onRecharged: () => void;
}) {
  const [amount, setAmount] = useState('');
  const [payMethod, setPayMethod] = useState('1');
  const [remark, setRemark] = useState('');
  const [activities, setActivities] = useState<RechargeActivityOption[]>([]);
  const [preview, setPreview] = useState<RechargePreviewVO | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const debouncedAmount = useDebounce(amount, 300);
  const amountNum = Number(amount) || 0;

  useEffect(() => {
    if (open) {
      setAmount('');
      setPayMethod('1');
      setRemark('');
      setPreview(null);
      setError('');
      rechargeActivityApi
        .options()
        .then(setActivities)
        .catch(() => setActivities([]));
    }
  }, [open]);

  // 金额变化实时预览赠送（服务端计算口径）
  useEffect(() => {
    if (!open || !memberId || amountNum <= 0) {
      setPreview(null);
      return;
    }
    let active = true;
    rechargeApi
      .preview(memberId, amountNum)
      .then((p) => {
        if (active) {
          setPreview(p);
        }
      })
      .catch(() => {
        if (active) {
          setPreview(null);
        }
      });
    return () => {
      active = false;
    };
  }, [open, memberId, debouncedAmount, amountNum]);

  const giftText = useMemo(() => {
    if (!preview || preview.giftAmount <= 0) {
      return null;
    }
    const source = GIFT_SOURCE_LABEL[preview.giftSource] ?? '赠送';
    const frozen = preview.giftFrozen === 1 ? '（冻结至次月）' : '';
    return `${source} ${formatCurrency(preview.giftAmount)}${frozen}`;
  }, [preview]);

  async function handleConfirm(): Promise<void> {
    if (!memberId || amountNum <= 0 || submitting) {
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      await rechargeApi.create({
        memberId,
        amount: amountNum,
        payMethod: Number(payMethod),
        remark: remark.trim() || undefined,
      });
      onRecharged();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : '充值失败，请重试');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      description={`为${memberName ?? '会员'}充值：本金计预收款，赠送单独记录。`}
      footer={
        <>
          <Button onClick={onClose} variant="secondary">
            取消
          </Button>
          <Button
            disabled={amountNum <= 0}
            loading={submitting}
            onClick={() => void handleConfirm()}
          >
            确认充值
          </Button>
        </>
      }
      onClose={onClose}
      open={open}
      title="会员充值"
      maxWidthClassName="max-w-lg"
    >
      <div className="space-y-4">
        {activities.length > 0 ? (
          <div>
            <div className="mb-2 text-sm font-medium">充值活动（点击快捷填充）</div>
            <div className="grid grid-cols-2 gap-2">
              {activities.map((a) => (
                <button
                  className={`rounded-md border p-2 text-left text-sm transition ${
                    amountNum === a.thresholdAmount
                      ? 'border-salon-accent bg-salon-accent/5'
                      : 'border-salon-line hover:border-salon-accent dark:border-zinc-800'
                  }`}
                  key={String(a.id)}
                  onClick={() => setAmount(String(a.thresholdAmount))}
                  type="button"
                >
                  <div className="font-medium">充 {formatCurrency(a.thresholdAmount)}</div>
                  <div className="text-xs text-salon-accent">送 {formatCurrency(a.giftAmount)}</div>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <Field error={error} hint={giftText ?? undefined} label="充值金额（本金）" required>
          <Input
            inputMode="decimal"
            onChange={(e) => {
              const v = e.target.value;
              if (v === '' || DECIMAL_RE.test(v)) {
                setAmount(v);
              }
            }}
            placeholder="如：500"
            value={amount}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="支付方式" required>
            <Select onChange={(e) => setPayMethod(e.target.value)} value={payMethod}>
              {RECHARGE_PAY_METHODS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="备注">
            <Input onChange={(e) => setRemark(e.target.value)} placeholder="充值备注（可选）" value={remark} />
          </Field>
        </div>

        {amountNum > 0 ? (
          <div className="rounded-md bg-stone-50 p-3 text-sm dark:bg-zinc-900">
            <div className="flex justify-between">
              <span className="text-zinc-500">本金入账</span>
              <span className="font-semibold">{formatCurrency(amountNum)}</span>
            </div>
            <div className="mt-1 flex justify-between">
              <span className="text-zinc-500">赠送金额</span>
              <span className="font-semibold">
                {preview && preview.giftAmount > 0 ? formatCurrency(preview.giftAmount) : '暂无'}
              </span>
            </div>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
