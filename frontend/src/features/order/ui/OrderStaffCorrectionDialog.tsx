import { useEffect, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { OrderDetailVO, OrderStaffOption } from '@/features/order/model/orderTypes';
import { orderApi } from '@/shared/api/modules/orderApi';
import { orderStaffCorrectionSchema, type OrderStaffCorrectionValues } from '@/features/order/model/orderSchemas';
import { assignStaff, commonStaffAssignment, createStaffCorrectionValues } from '@/features/order/model/orderStaff';
import { Button } from '@/shared/ui/Button';
import { Field } from '@/shared/ui/Field';
import { Drawer } from '@/shared/ui/Drawer';
import { Select } from '@/shared/ui/Select';
import { Textarea } from '@/shared/ui/Textarea';
import { OrderStaffBatchDialog } from './OrderStaffBatchDialog';

/** 已结算订单仅更正人员；完整提交前后分配，必填原因并记录审计。 */
export function OrderStaffCorrectionDialog({ open, detail, onClose, onSaved }: {
  open: boolean;
  detail: OrderDetailVO | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [options, setOptions] = useState<OrderStaffOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [optionsError, setOptionsError] = useState('');
  const [error, setError] = useState('');
  const [batchOpen, setBatchOpen] = useState(false);
  const { control, register, reset, setValue, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<OrderStaffCorrectionValues>({
      resolver: zodResolver(orderStaffCorrectionSchema),
      defaultValues: { reason: '', items: [] },
    });
  const items = useWatch({ control, name: 'items' });

  useEffect(() => {
    if (!open || !detail) return;
    let active = true;
    reset(createStaffCorrectionValues(detail.items ?? []));
    setError('');
    setBatchOpen(false);
    setOptionsError('');
    setOptions([]);
    setLoading(true);
    orderApi.staffOptions(detail.storeId ?? '')
      .then((data) => { if (active) setOptions(data); })
      .catch((cause: unknown) => { if (active) setOptionsError(cause instanceof Error ? cause.message : '人员选项加载失败，请重新打开'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [open, detail, reset]);

  async function submit(values: OrderStaffCorrectionValues): Promise<void> {
    if (!detail || loading || optionsError) return;
    setError('');
    try {
      await orderApi.correctStaff(String(detail.id), {
        reason: values.reason,
        items: values.items.map((item) => ({
          orderItemId: item.orderItemId,
          staffId: item.staffId,
          assistantId: item.assistantId || null,
          expectedStaffId: item.expectedStaffId || null,
          expectedAssistantId: item.expectedAssistantId || null,
        })),
      });
      onSaved();
      onClose();
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : '人员更正失败，请重试');
    }
  }

  return (
    <Drawer open={open} onClose={() => { if (!isSubmitting) onClose(); }} title="更正订单人员" width="640px"
      footer={<>
        <Button variant="secondary" disabled={loading || Boolean(optionsError) || isSubmitting} onClick={() => setBatchOpen(true)}>统一服务人员</Button>
        <Button onClick={onClose} variant="secondary" disabled={isSubmitting}>取消</Button>
        <Button disabled={loading || Boolean(optionsError)} loading={isSubmitting} onClick={() => void handleSubmit(submit)()}>保存更正</Button></>}>
      <div className="space-y-4">
        <p className="text-sm text-zinc-500">更正服务人员与助理后，将保存原分配、新分配、操作人和原因，供提成核算追溯。</p>
        {loading ? <p className="text-sm text-zinc-500">加载人员中…</p> : null}
        {optionsError ? <p role="alert" className="text-sm text-rose-600">{optionsError}</p> : null}
        {(detail?.items ?? []).map((item, index) => (
          <div key={String(item.id)} className="space-y-3 rounded-lg border border-salon-line p-3 dark:border-zinc-800">
            <p className="text-sm font-medium">{item.itemName}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="服务人员" required error={errors.items?.[index]?.staffId?.message}>
                <Controller name={`items.${index}.staffId`} control={control} render={({ field }) => (
                  <Select {...field} value={field.value ?? ''} disabled={loading || isSubmitting} invalid={Boolean(errors.items?.[index]?.staffId)}>
                    <option value="">请选择服务人员</option>
                    {item.staffId != null && !options.some((option) => String(option.id) === String(item.staffId)) ? (
                      <option value={String(item.staffId)}>{item.staffName || `人员 ${item.staffId}`}（原分配，可保留）</option>
                    ) : null}
                    {options.map((option) => <option key={String(option.id)} value={String(option.id)}>{option.name}</option>)}
                  </Select>
                )} />
              </Field>
              <Field label="助理" error={errors.items?.[index]?.assistantId?.message}>
                <Controller name={`items.${index}.assistantId`} control={control} render={({ field }) => (
                  <Select {...field} value={field.value ?? ''} disabled={loading || isSubmitting} invalid={Boolean(errors.items?.[index]?.assistantId)}>
                    <option value="">不配置助理</option>
                    {item.assistantId != null && !options.some((option) => String(option.id) === String(item.assistantId)) ? (
                      <option value={String(item.assistantId)}>{item.assistantName || `人员 ${item.assistantId}`}（原分配，可保留）</option>
                    ) : null}
                    {options.map((option) => <option key={String(option.id)} value={String(option.id)}>{option.name}</option>)}
                  </Select>
                )} />
              </Field>
            </div>
          </div>
        ))}
        <Field label="更正原因" required error={errors.reason?.message}>
          <Textarea {...register('reason')} rows={3} maxLength={255} invalid={Boolean(errors.reason)} placeholder="请说明补录或调整人员的原因" />
        </Field>
        {error ? <p role="alert" className="text-sm text-rose-600">{error}</p> : null}
      </div>
      {batchOpen ? <OrderStaffBatchDialog options={options}
        initialValues={commonStaffAssignment(items)}
        onClose={() => setBatchOpen(false)}
        onConfirm={(values) => {
          setValue('items', assignStaff(items, values.staffId, values.assistantId), { shouldValidate: true });
          setBatchOpen(false);
        }} /> : null}
    </Drawer>
  );
}
