import type { TextareaHTMLAttributes } from 'react';
import { cn } from '@/shared/lib/cn';

/**
 * 通用多行文本框，用于备注、接口路径说明等长文本输入。
 */
export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export function Textarea({ className, invalid, ...props }: TextareaProps) {
  return (
    <textarea
      className={cn(
        'min-h-24 w-full rounded-md border border-salon-line bg-white px-3 py-2 text-sm text-salon-ink outline-none transition placeholder:text-zinc-400 focus:border-salon-accent focus:ring-2 focus:ring-emerald-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-emerald-400 dark:focus:ring-emerald-900/40',
        invalid && 'border-rose-300 focus:border-rose-500 focus:ring-rose-100 dark:border-rose-700',
        className,
      )}
      {...props}
    />
  );
}
