import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { payConfigApi } from '@/shared/api/modules/payConfigApi';
import { rechargeApi, rechargeActivityApi } from '@/shared/api/modules/rechargeApi';
import type { RechargeActivityOption, RechargePreviewVO } from '@/features/recharge/model/rechargeTypes';
import { GIFT_SOURCE_LABEL, RECHARGE_PAY_METHODS } from '@/features/recharge/model/rechargeTypes';
import { Button } from '@/shared/ui/Button';
import { Field } from '@/shared/ui/Field';
import { Input } from '@/shared/ui/Input';
import { Modal } from '@/shared/ui/Modal';
import { QrCode } from '@/shared/ui/QrCode';
import { Select } from '@/shared/ui/Select';
import { formatCurrency } from '@/shared/lib/format';
import { useDebounce } from '@/shared/hooks/useDebounce';

/** 金额输入中间态正则 */
const DECIMAL_RE = /^\d{1,9}(\.\d{0,2})?$/;

/** 扫码（直连）支付方式标识（提交时按渠道转 payMethod=2/3 走预下单） */
const PAY_METHOD_SCAN = 'wxpay-scan' as const;
const PAY_METHOD_ALIPAY_SCAN = 'alipay-scan' as const;

/** 扫码渠道元信息：标识 -> 渠道参数 / payMethod / 展示文案 */
const SCAN_CHANNELS = {
  'wxpay-scan': { channel: 'wxpay' as const, payMethod: 2, name: '微信', app: '微信' },
  'alipay-scan': { channel: 'alipay' as const, payMethod: 3, name: '支付宝', app: '支付宝' },
} as const;

type ScanKey = keyof typeof SCAN_CHANNELS;

/** 扫码轮询间隔（毫秒） */
const POLL_INTERVAL = 3000;

/**
 * 会员充值弹窗：金额输入 + 活动档位快捷选择 + 赠送实时预览（服务端口径）+ 支付方式。
 * 手动确认模式即时入账；租户配置可用直连渠道时提供「微信/支付宝扫码」（预下单出码，回调自动入账）。
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
  const [scanChannels, setScanChannels] = useState<string[]>([]);
  // 扫码视图：预下单结果 + 支付轮询状态
  const [scan, setScan] = useState<{ rechargeId: string; codeUrl: string; amount: number; scanKey: ScanKey } | null>(null);

  const debouncedAmount = useDebounce(amount, 300);
  const amountNum = Number(amount) || 0;
  const activeScan = SCAN_CHANNELS[payMethod as ScanKey];

  useEffect(() => {
    if (open) {
      setAmount('');
      setPayMethod('1');
      setRemark('');
      setPreview(null);
      setError('');
      setScan(null);
      rechargeActivityApi
        .options()
        .then(setActivities)
        .catch(() => setActivities([]));
      payConfigApi
        .options()
        .then((channels) =>
          setScanChannels(channels.map((c) => c.channel).filter((c) => c === 'wxpay' || c === 'alipay')),
        )
        .catch(() => setScanChannels([]));
    }
  }, [open]);

  // 扫码支付轮询：已支付则刷新会员资产并关闭
  useEffect(() => {
    if (!open || !scan || scan.rechargeId == null) {
      return undefined;
    }
    let active = true;
    const timer = window.setInterval(() => {
      rechargeApi
        .payStatus(scan.rechargeId)
        .then((status) => {
          if (!active) {
            return;
          }
          if (status.status === 1) {
            window.clearInterval(timer);
            onRecharged();
            onClose();
          } else if (status.status === 2) {
            // 单据被取消（如查单兜底超时关闭），停止轮询关闭弹窗
            window.clearInterval(timer);
            onClose();
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
  }, [open, scan, onRecharged, onClose]);

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
      if (activeScan) {
        // 直连模式：预下单出码，入账由回调/查单补偿自动完成
        const payload = {
          memberId,
          amount: amountNum,
          payMethod: activeScan.payMethod,
          remark: remark.trim() || undefined,
        };
        const prepay = await rechargeApi.scanPrepay(activeScan.channel, payload);
        setScan({
          rechargeId: String(prepay.rechargeId),
          codeUrl: prepay.codeUrl,
          amount: prepay.amount,
          scanKey: payMethod as ScanKey,
        });
      } else {
        await rechargeApi.create({
          memberId,
          amount: amountNum,
          payMethod: Number(payMethod),
          remark: remark.trim() || undefined,
        });
        onRecharged();
        onClose();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '充值失败，请重试');
    } finally {
      setSubmitting(false);
    }
  }

  // 扫码视图：二维码 + 支付等待（按渠道区分文案）
  if (scan) {
    const meta = SCAN_CHANNELS[scan.scanKey];
    const handleCancel = async (): Promise<void> => {
      // 真取消：关单（后端条件更新 0->2 + 流水置 failed），再关弹窗
      try {
        await rechargeApi.cancel(scan.rechargeId);
      } catch {
        // 已支付/已取消时后端拒绝取消，忽略（可能是轮询即将确认的成功单）
      } finally {
        onClose();
      }
    };
    return (
      <Modal
        description={`顾客使用${meta.app}扫码完成支付后自动到账；网络波动导致未到账时，系统每 2 分钟查单自动补偿。`}
        footer={
          <>
            <Button onClick={() => void handleCancel()} variant="secondary">
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
            {activeScan ? '生成付款码' : '确认充值'}
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
              {scanChannels.includes('wxpay') ? (
                <option value={PAY_METHOD_SCAN}>微信扫码（自动到账）</option>
              ) : null}
              {scanChannels.includes('alipay') ? (
                <option value={PAY_METHOD_ALIPAY_SCAN}>支付宝扫码（自动到账）</option>
              ) : null}
              {RECHARGE_PAY_METHODS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                  {(m.value === 2 && scanChannels.includes('wxpay'))
                  || (m.value === 3 && scanChannels.includes('alipay'))
                    ? '（手动确认）'
                    : ''}
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
            {activeScan ? (
              <div className="mt-2 flex items-center gap-1 text-xs text-salon-accent">
                <CheckCircle2 className="size-3.5" />
                {activeScan.name}扫码支付，回调自动入账（无需手动确认）
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
