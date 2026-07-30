import type { SelectHTMLAttributes } from 'react';
import { cn } from '@/shared/lib/cn';

/**
 * 通用下拉框，适合状态、类型和数据范围等枚举输入。
 */
export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
}

export function Select({ className, invalid, ...props }: SelectProps) {
  return (
    <select
      className={cn(
        'h-10 w-full rounded-md border border-salon-line bg-white px-3 text-sm text-salon-ink outline-none transition focus:border-salon-accent focus:ring-2 focus:ring-violet-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-violet-400 dark:focus:ring-violet-900/40',
        invalid && 'border-rose-300 focus:border-rose-500 focus:ring-rose-100 dark:border-rose-700',
        className,
      )}
      {...props}
    />
  );
}
