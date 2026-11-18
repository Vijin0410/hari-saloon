import { MEMBER_CARD_BACKGROUNDS, type MemberCardTemplate } from '../model/memberCardTemplates';
import { MemberLevelCard } from './MemberLevelCard';
import { cn } from '@/shared/lib/cn';

/** 选择内置卡面；完整图案与列表共用组件，选中后立即更新表单预览。 */
interface MemberCardTemplatePickerProps {
  value: MemberCardTemplate;
  onChange: (value: MemberCardTemplate) => void;
  disabled?: boolean;
}
export function MemberCardTemplatePicker({ value, onChange, disabled }: MemberCardTemplatePickerProps) {
  return (
    <div role="radiogroup" aria-label="选择系统卡面" className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
      {MEMBER_CARD_BACKGROUNDS.map((item) => (
        <button
          key={item.key} type="button" role="radio" aria-checked={value === item.key}
          aria-label={'使用' + item.name + '卡面'} disabled={disabled}
          onClick={() => onChange(item.key)}
          className={cn('min-w-0 rounded-lg border p-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-salon-accent disabled:opacity-50',
            value === item.key ? 'border-salon-accent bg-salon-accent/5 ring-1 ring-salon-accent' : 'border-salon-line hover:border-salon-accent/60 dark:border-zinc-700')}
        >
          <MemberLevelCard name={item.name} cardTemplate={item.key} artworkOnly className="rounded-md shadow-none" />
          <span className="mt-1.5 block text-xs text-salon-ink dark:text-zinc-200">{item.name}</span>
        </button>
      ))}
      <button type="button" role="radio" aria-checked={value === 'auto'} disabled={disabled}
        onClick={() => onChange('auto')}
        className={cn('rounded-lg border p-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-salon-accent disabled:opacity-50',
          value === 'auto' ? 'border-salon-accent bg-salon-accent/5 text-salon-accent ring-1 ring-salon-accent' : 'border-salon-line text-zinc-500 dark:border-zinc-700 dark:text-zinc-400')}>
        自动匹配等级
      </button>
    </div>
  );
}
