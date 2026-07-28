import type { InputHTMLAttributes } from 'react';
import { cn } from '@/shared/lib/cn';

/**
 * 通用输入框，业务表单通过 Field 组合标签和错误信息。
 */
export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export function Input({ className, invalid, ...props }: InputProps) {
  return (
    <input
      className={cn(
        'h-10 w-full rounded-md border border-salon-line bg-white px-3 text-sm text-salon-ink outline-none transition placeholder:text-zinc-400 focus:border-salon-accent focus:ring-2 focus:ring-emerald-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-emerald-400 dark:focus:ring-emerald-900/40',
        invalid && 'border-rose-300 focus:border-rose-500 focus:ring-rose-100 dark:border-rose-700',
        className,
      )}
      {...props}
    />
  );
}
