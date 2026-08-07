import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';

/**
 * 通用卡片容器，详情页分区展示，统一圆角边框与 hover 阴影。
 */
export interface CardProps {
  children: ReactNode;
  className?: string;
  title?: ReactNode;
  extra?: ReactNode;
  hover?: boolean;
}

export function Card({ children, className, title, extra, hover = true }: CardProps) {
  return (
    <section
      className={cn(
        'rounded-lg border border-salon-line bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950',
        hover && 'transition hover:shadow-sm',
        className,
      )}
    >
      {title || extra ? (
        <div className="mb-3 flex items-center justify-between gap-2">
          {title ? <h3 className="text-sm font-semibold text-salon-ink dark:text-zinc-100">{title}</h3> : <span />}
          {extra}
        </div>
      ) : null}
      {children}
    </section>
  );
}
