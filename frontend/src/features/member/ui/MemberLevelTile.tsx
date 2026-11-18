import { Pencil, Trash2 } from 'lucide-react';
import type { MemberLevelPageVO } from '../model/memberTypes';
import { MemberLevelCard } from './MemberLevelCard';
import { Badge } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { formatCurrency } from '@/shared/lib/format';
import { getDictText } from '@/shared/lib/dict';

/** 常规、活动等级共用的权益卡片，保持桌面四列、手机单列的内容尺度。 */
interface MemberLevelTileProps {
  level: MemberLevelPageVO;
  pointsEnabled: boolean;
  editable: boolean;
  deletable: boolean;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}
function discount(value?: number): string {
  if (value == null) return '暂无';
  return value >= 1 ? '无折扣' : Number((value * 10).toFixed(1)) + ' 折';
}
export function MemberLevelTile({ level, pointsEnabled, editable, deletable, onEdit, onDelete }: MemberLevelTileProps) {
  const benefits = [
    { label: '服务折扣', value: discount(level.serviceDiscount) },
    { label: '商品折扣', value: discount(level.goodsDiscount) },
    ...(pointsEnabled ? [{ label: '积分倍率', value: level.pointRate == null ? '暂无' : level.pointRate + ' 倍' }] : []),
    { label: '充值赠送', value: level.rechargeGiftRate == null ? '暂无' : (level.rechargeGiftRate * 100).toLocaleString('zh-CN', { maximumFractionDigits: 2 }) + '%' },
  ];
  return (
    <Card hover={false} className="flex h-full min-w-0 flex-col p-3">
      <MemberLevelCard compact name={level.name} levelNo={level.levelNo} cardImage={level.cardImage}
        cardTemplate={level.cardTemplate} levelType={level.levelType} />
      <dl className="my-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs leading-5">
        {benefits.map((benefit) => (
          <div key={benefit.label} className="flex items-center justify-between gap-1">
            <dt className="text-zinc-500 dark:text-zinc-400">{benefit.label}</dt>
            <dd className="font-medium text-salon-ink dark:text-zinc-100">{benefit.value}</dd>
          </div>
        ))}
      </dl>
      <div className="mb-3 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
        {level.levelType === 'ACTIVITY' ? '手动选择 · 不参与自动升级' :
          level.upgradeThreshold == null ? '未设置自动升级门槛' : '升级门槛：' + formatCurrency(level.upgradeThreshold)}
      </div>
      <div className="mt-auto flex items-center justify-between gap-2 border-t border-salon-line pt-3 dark:border-zinc-800">
        <Badge tone={level.status === 1 ? 'success' : 'danger'}>{getDictText(level.status_text)}</Badge>
        <div className="flex items-center gap-1">
          {editable ? <Button icon={<Pencil className="size-3.5" />} size="sm" variant="secondary" onClick={() => onEdit(String(level.id))}>编辑</Button> : null}
          {deletable ? <Button icon={<Trash2 className="size-3.5" />} size="sm" variant="secondary" onClick={() => onDelete(String(level.id))}>删除</Button> : null}
        </div>
      </div>
    </Card>
  );
}
