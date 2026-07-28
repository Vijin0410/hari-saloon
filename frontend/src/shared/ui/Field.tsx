import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';

/**
 * 表单字段容器，负责标签、必填提示、帮助文本和校验错误。
 */
export interface FieldProps {
  label: string;
  children: ReactNode;
  error?: string;
  hint?: string;
  required?: boolean;
  className?: string;
}

export function Field({ children, className, error, hint, label, required }: FieldProps) {
  return (
    <label className={cn('block space-y-1.5 text-sm', className)}>
      <span className="flex items-center gap-1 font-medium text-zinc-700 dark:text-zinc-200">
        {label}
        {required ? <span className="text-rose-500">*</span> : null}
      </span>
      {children}
      {error ? <span className="block text-xs text-rose-600 dark:text-rose-300">{error}</span> : null}
      {!error && hint ? <span className="block text-xs text-zinc-500 dark:text-zinc-400">{hint}</span> : null}
    </label>
  );
}
