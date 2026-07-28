import { LoaderCircle } from 'lucide-react';
import { cn } from '@/shared/lib/cn';

/**
 * 通用加载指示器，用于按钮、页面等待态和轻量异步区域。
 */
export interface SpinnerProps {
  className?: string;
  label?: string;
}

export function Spinner({ className, label = '加载中' }: SpinnerProps) {
  return (
    <LoaderCircle
      className={cn('size-4 animate-spin text-current', className)}
      aria-label={label}
    />
  );
}
