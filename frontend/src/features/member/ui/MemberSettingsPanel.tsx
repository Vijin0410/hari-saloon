import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { memberSettingsSchema, type MemberSettingsValues } from '@/features/member/model/memberSettingsSchemas';
import { memberSettingsApi, type MemberSettingsVO } from '@/shared/api/modules/memberSettingsApi';
import { Card } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';
import { Field } from '@/shared/ui/Field';
import { PageLoading } from '@/shared/ui/PageLoading';
import { useAuthStore } from '@/store/useAuthStore';
import { useMemberSettingsStore } from '@/store/useMemberSettingsStore';

/** 当前独立店铺会员积分设置，保存前展示存量资产和停用过渡说明。 */
export function MemberSettingsPanel() {
  const [settings, setSettings] = useState<MemberSettingsVO | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const { register, reset, handleSubmit, formState: { errors, isSubmitting, isDirty } } = useForm<MemberSettingsValues>({
    resolver: zodResolver(memberSettingsSchema), defaultValues: { pointsEnabled: false },
  });
  const load = useCallback(async () => {
    setError('');
    try {
      const data = await memberSettingsApi.detail();
      setSettings(data); reset({ pointsEnabled: data.pointsEnabled });
    } catch (e) { setError(e instanceof Error ? e.message : '会员设置加载失败'); }
  }, [reset]);
  useEffect(() => { void load(); }, [load]);
  async function save(values: MemberSettingsValues) {
    setError(''); setMessage('');
    try {
      await memberSettingsApi.update(values);
      await useMemberSettingsStore.getState().refresh();
      await load(); setMessage('会员设置已保存');
    } catch (e) { setError(e instanceof Error ? e.message : '保存失败'); }
  }
  if (!settings && !error) return <PageLoading />;
  return <div className="max-w-3xl space-y-4">
    <div><h1 className="text-xl font-semibold">会员设置</h1><p className="mt-1 text-sm text-zinc-500">积分策略在当前租户的所有门店共用。</p></div>
    {error ? <div role="alert" className="text-sm text-rose-600">{error}<Button onClick={() => void load()} variant="secondary">重试</Button></div> : null}
    {settings ? <form onSubmit={handleSubmit(save)} className="space-y-4">
      <Card title="会员积分">
        <Field label="启用会员积分" error={errors.pointsEnabled?.message}>
          <label className="flex items-center gap-3 text-sm"><input type="checkbox" {...register('pointsEnabled')} disabled={!hasPermission('biz:memberSettings:edit')} />允许新消费赠送、积分抵扣与手工调整</label>
        </Field>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-stone-50 p-4 dark:bg-zinc-900"><p className="text-xs text-zinc-500">现存可用积分</p><p className="mt-2 text-2xl font-semibold tabular-nums">{settings.outstandingPoints ?? 0}</p></div>
          <div className="rounded-lg bg-stone-50 p-4 dark:bg-zinc-900"><p className="text-xs text-zinc-500">待追回积分</p><p className="mt-2 text-2xl font-semibold tabular-nums">{settings.outstandingDebt ?? 0}</p></div>
        </div>
      </Card>
      <Card title="停用与售后说明"><div className="space-y-2 text-sm leading-6 text-zinc-500">
        <p>关闭后停止新积分业务并隐藏日常积分界面。已有积分和流水继续保留，原有效期继续执行，重新开启后恢复使用。余额、折扣和会员等级继续有效。</p>
        <p>关闭前请向有存量积分的会员安排过渡。历史订单继续退回原抵扣积分、回收消费奖励。已开始的扫码支付按原快照结算和赠送。</p>
        <p>退款按累计成功资金比例分摊积分，纯积分订单可全单退回。抵扣积分保留原有效期；已到期批次给予退款后 {settings.refundGraceDays} 天宽限期。</p>
        <p>奖励已过期的部分免扣；已使用的部分记为待追回，后续新消费奖励优先抵扣。待追回期间限制新的积分抵扣，售后退回积分单独入账。</p>
      </div></Card>
      {message ? <p role="status" className="text-sm text-emerald-600">{message}</p> : null}
      {hasPermission('biz:memberSettings:edit') ? <Button type="submit" loading={isSubmitting} disabled={!isDirty}>保存设置</Button> : null}
    </form> : null}
  </div>;
}
