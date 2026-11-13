import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  settlementSchema,
  businessDate,
  type SettlementValues,
} from '@/features/finance/model/financeSchemas';
import type { FinanceReport } from '@/features/finance/model/financeTypes';
import type { StoreOption } from '@/features/system/model/systemTypes';
import { financeApi } from '@/shared/api/modules/financeApi';
import { Modal } from '@/shared/ui/Modal';
import { Field } from '@/shared/ui/Field';
import { Input } from '@/shared/ui/Input';
import { Select } from '@/shared/ui/Select';
import { Textarea } from '@/shared/ui/Textarea';
import { Button } from '@/shared/ui/Button';

import { ReportPanels } from './ReportPanels';

interface SettlementDialogProps {
  stores: StoreOption[];
  initialStore?: string;
  onClose: () => void;
  onSaved: () => void;
}

/** 日结营业日独立于报表筛选；提交前按所选门店与营业日加载预览，快照由服务端重新计算。 */
export function SettlementDialog({
  stores,
  initialStore,
  onClose,
  onSaved,
}: SettlementDialogProps) {
  const {
    register,
    watch,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SettlementValues>({
    resolver: zodResolver(settlementSchema),
    defaultValues: { storeId: initialStore || '', businessDate: businessDate(-1), remark: '' },
  });
  const storeId = watch('storeId');
  const date = watch('businessDate');
  const [preview, setPreview] = useState<{ key: string; report: FinanceReport } | null>(null);
  const [error, setError] = useState('');
  const key = storeId + '|' + date;
  useEffect(() => {
    let active = true;
    if (!storeId || !date || date >= businessDate()) return;
    financeApi
      .report({ storeId, startDate: date, endDate: date })
      .then((report) => {
        if (active) {
          setPreview({ key: storeId + '|' + date, report });
          setError('');
        }
      })
      .catch((e: unknown) => {
        if (active) setError(e instanceof Error ? e.message : '预览失败');
      });
    return () => {
      active = false;
    };
  }, [storeId, date]);
  async function submit(v: SettlementValues) {
    try {
      await financeApi.settle(v);
      onSaved();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '日结失败');
    }
  }
  return (
    <Modal
      open
      title="确认门店日结"
      onClose={onClose}
      maxWidthClassName="max-w-5xl"
    >
      <form onSubmit={handleSubmit(submit)} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="日结门店" required error={errors.storeId?.message}>
            <Select {...register('storeId')} invalid={!!errors.storeId}>
              <option value="">请选择门店</option>
              {stores.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="日结营业日" required error={errors.businessDate?.message}>
            <Input
              type="date"
              max={businessDate(-1)}
              {...register('businessDate')}
              invalid={!!errors.businessDate}
            />
          </Field>
        </div>
        {error ? (
          <p role="alert" className="text-sm text-rose-600">
            {error}
          </p>
        ) : null}
        {preview?.key === key ? (
          <ReportPanels report={preview.report} />
        ) : (
          <p className="py-4 text-sm text-zinc-500">请选择门店与日期，等待报表预览。</p>
        )}
        <Field label="日结备注" error={errors.remark?.message}>
          <Textarea {...register('remark')} invalid={!!errors.remark} />
        </Field>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            取消
          </Button>
          <Button type="submit" loading={isSubmitting} disabled={preview?.key !== key}>
            确认日结并保存快照
          </Button>
        </div>
      </form>
    </Modal>
  );
}
