import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';

/**
 * 核心统计卡片：大号数字独占行 + 顶部标签 + 右上角操作 + 可选次级信息。
 * 复用会员详情「余额/积分资产卡」模式（见 hair-salon-ui skill 模式 B）。
 * 核心数字 text-[28px] font-bold 独占行，操作按钮放标题行右上角，
 * 禁止将长金额与按钮并排（会重叠）。
 */
export interface StatCardProps {
  /** 顶部标签（如「账户余额」「今日营业额」） */
  label: string;
  /** 核心数字，大号独占行 */
  value: ReactNode;
  /** 数字下方说明（如「可用余额」），可选 */
  hint?: string;
  /** 右上角操作区（按钮组） */
  extra?: ReactNode;
  /** 底部次级信息（四宫格/两列子卡片等），可选 */
  children?: ReactNode;
  /** 数字色调：default 深色，accent 主色紫 */
  tone?: 'default' | 'accent';
  className?: string;
}

export function StatCard({
  label,
  value,
  hint,
  extra,
  children,
  tone = 'default',
  className,
}: StatCardProps) {
  return (
    <section
      className={cn(
        'rounded-lg border border-salon-line bg-white p-4 transition hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-950',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs text-zinc-500 dark:text-zinc-400">{label}</div>
        {extra ? <div className="flex shrink-0 gap-2">{extra}</div> : null}
      </div>
      <div
        className={cn(
          'mt-2 text-[28px] font-bold leading-none',
          tone === 'accent' ? 'text-salon-accent' : 'text-salon-ink dark:text-zinc-100',
        )}
      >
        {value}
      </div>
      {hint ? <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{hint}</div> : null}
      {children ? (
        <div className="mt-3 border-t border-salon-line pt-3 dark:border-zinc-800">{children}</div>
      ) : null}
    </section>
  );
}
