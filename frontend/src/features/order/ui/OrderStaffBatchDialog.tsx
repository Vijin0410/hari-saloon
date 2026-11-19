import { useId } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { orderStaffBatchSchema, type OrderStaffBatchValues } from '@/features/order/model/orderSchemas';
import type { OrderStaffOption } from '@/features/order/model/orderTypes';
import { Button } from '@/shared/ui/Button';
import { Field } from '@/shared/ui/Field';
import { Modal } from '@/shared/ui/Modal';
import { Select } from '@/shared/ui/Select';

/** 仅确认后回填本单全部明细，关闭弹窗不改变各行分配。 */
export function OrderStaffBatchDialog({ options, initialValues, onClose, onConfirm }: {
  options: OrderStaffOption[];
  initialValues: OrderStaffBatchValues;
  onClose: () => void;
  onConfirm: (values: OrderStaffBatchValues) => void;
}) {
  const formId = useId();
  const { register, handleSubmit, formState: { errors } } = useForm<OrderStaffBatchValues>({
    resolver: zodResolver(orderStaffBatchSchema),
    defaultValues: {
      staffId: options.some((option) => String(option.id) === initialValues.staffId) ? initialValues.staffId : '',
      assistantId: options.some((option) => String(option.id) === initialValues.assistantId) ? initialValues.assistantId : '',
    },
  });

  return (
    <Modal open title="统一服务人员" onClose={onClose} maxWidthClassName="max-w-md"
      description="确认后，将回填本单全部消费明细的服务人员和助理。"
      footer={<>
        <Button onClick={onClose} variant="secondary">取消</Button>
        <Button type="submit" form={formId}>确认回填</Button>
      </>}>
      <form id={formId} className="space-y-4" onSubmit={handleSubmit(onConfirm)}>
        <Field label="服务人员" error={errors.staffId?.message}>
          <Select {...register('staffId')} invalid={Boolean(errors.staffId)}>
            <option value="">请选择服务人员</option>
            {options.map((option) => <option key={String(option.id)} value={String(option.id)}>{option.name}</option>)}
          </Select>
        </Field>
        <Field label="助理（选填）" error={errors.assistantId?.message}>
          <Select {...register('assistantId')} invalid={Boolean(errors.assistantId)}>
            <option value="">不配置助理</option>
            {options.map((option) => <option key={String(option.id)} value={String(option.id)}>{option.name}</option>)}
          </Select>
        </Field>
      </form>
    </Modal>
  );
}
