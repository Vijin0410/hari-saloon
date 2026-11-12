import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { orderApi } from '@/shared/api/modules/orderApi';
import type { OrderPageVO, OrderRefundVO } from '@/features/order/model/orderTypes';
import { orderRefundSchema, type OrderRefundValues } from '@/features/order/model/orderSchemas';
import { Button } from '@/shared/ui/Button';
import { Field } from '@/shared/ui/Field';
import { Input } from '@/shared/ui/Input';
import { Modal } from '@/shared/ui/Modal';
import { Textarea } from '@/shared/ui/Textarea';
import { useDebounce } from '@/shared/hooks/useDebounce';
import { formatCurrency } from '@/shared/lib/format';

interface OrderRefundDialogProps {
  onClose: () => void;
  onRefunded: () => void;
  open: boolean;
  order: OrderPageVO | null;
}

/** 退款确认：资金、抵扣积分、消费奖励分别预览；支持纯积分全单退回。 */
export function OrderRefundDialog({ onClose, onRefunded, open, order }: OrderRefundDialogProps) {
  const [preview, setPreview] = useState<OrderRefundVO | null>(null);
  const [previewError, setPreviewError] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const { register, watch, reset, setError: setFieldError, setValue, handleSubmit, formState: { errors, isSubmitting } } = useForm<OrderRefundValues>({
    resolver: zodResolver(orderRefundSchema), defaultValues: { refundAmount: '', reason: '' },
  });
  const amount = watch('refundAmount');
  const debouncedAmount = useDebounce(amount, 300);
  const refundable = Math.max(0, (order?.receivedAmount ?? 0) - (order?.refundedAmount ?? 0));
  const pointsOnly = order?.receivedAmount === 0 && (order?.pointDeductAmount ?? 0) > 0;
  useEffect(() => {
    if (open) { reset({ refundAmount: String(refundable), reason: '' }); setError(''); setPending(false); setPreview(null); }
  }, [open, order?.id, refundable, reset]);
  useEffect(() => {
    if (!open || !order || !/^\d{1,9}(\.\d{1,2})?$/.test(debouncedAmount)) { setPreview(null); setPreviewLoading(false); return; }
    let active = true;
    setPreview(null); setPreviewError(''); setPreviewLoading(true);
    orderApi.refundPreview(order.id, Number(debouncedAmount))
      .then((data) => { if (active) setPreview(data); })
      .catch((e: unknown) => { if (active) setPreviewError(e instanceof Error ? e.message : '退款预览加载失败'); })
      .finally(() => { if (active) setPreviewLoading(false); });
    return () => { active = false; };
  }, [open, order, debouncedAmount]);
  async function submit(values: OrderRefundValues) {
    if (!order) return;
    const value = Number(values.refundAmount);
    if ((!pointsOnly && value <= 0) || value > refundable) { setFieldError('refundAmount', { message: pointsOnly ? '纯积分订单仅支持0元全单退回' : '退款金额须大于0且不超过 ' + refundable }); return; }
    setError('');
    try {
      const result = await orderApi.refund(order.id, { refundAmount: value, reason: values.reason });
      if (result.status === 0) { setPending(true); onRefunded(); }
      else { onRefunded(); onClose(); }
    } catch (e) { setError(e instanceof Error ? e.message : '退款失败，请重试'); }
  }
  if (!order) return null;
  return <Modal open={open} onClose={onClose} title={pointsOnly ? '全单退回积分' : '订单退款'} description={'订单 ' + order.orderNo + '，可退资金 ' + formatCurrency(refundable)} maxWidthClassName="max-w-md"
    footer={pending ? <Button onClick={onClose} variant="secondary">知道了</Button> : <><Button onClick={onClose} variant="secondary">取消</Button><Button loading={isSubmitting} disabled={previewLoading || !preview || amount !== debouncedAmount} onClick={() => void handleSubmit(submit)()} variant="danger">{pointsOnly ? '确认退回积分' : '确认退款'}</Button></>}>
    {pending ? <p role="status" className="text-sm text-amber-700">退款已发起，渠道处理中。积分在成功确认后处理，可在退款记录查看结果。</p> : <div className="space-y-4">
      <Field label="资金退款额" required error={errors.refundAmount?.message} hint="填写退回顾客的资金，不含积分抵扣折算。余额原桶退回；现金等由门店线下退给顾客。">
        <div className="flex gap-2"><Input type="text" inputMode="decimal" readOnly={pointsOnly} invalid={Boolean(errors.refundAmount)} {...register('refundAmount')} /><Button variant="secondary" onClick={() => setValue('refundAmount', String(refundable), { shouldValidate: true })}>全部退回</Button></div>
      </Field>
      {previewLoading ? <p className="text-sm text-zinc-500">计算退款权益中…</p> : previewError ? <p role="alert" className="text-sm text-rose-600">{previewError}</p> : preview ? <div className="space-y-2 rounded-lg bg-stone-50 p-4 text-sm dark:bg-zinc-900">
        <div className="flex justify-between"><span>资金退回</span><strong>{formatCurrency(preview.refundAmount)}</strong></div>
        {(preview.pointRefundPoints ?? 0) > 0 ? <div className="flex justify-between"><span>预计退回抵扣积分</span><strong>+{preview.pointRefundPoints} 分</strong></div> : null}
        {(preview.pointClawbackPoints ?? 0) > 0 ? <><div className="flex justify-between"><span>预计回收消费奖励</span><strong>{preview.pointClawbackPoints} 分</strong></div><p className="text-xs leading-5 text-zinc-500">优先回收原奖励批次；已过期部分免扣，已使用部分记为待追回。成功确认后显示实际结果。</p></> : null}
      </div> : null}
      <Field label="退款原因" required error={errors.reason?.message}><Textarea rows={3} maxLength={255} {...register('reason')} placeholder="请填写退款原因" /></Field>
      {error ? <p role="alert" className="text-sm text-rose-600">{error}</p> : null}
    </div>}
  </Modal>;
}
