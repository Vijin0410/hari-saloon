import type { ReactNode } from 'react';
import { Inbox } from 'lucide-react';

/**
 * 列表、树和搜索结果为空时的统一占位。
 */
export interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ action, description, title }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-salon-line bg-white px-6 py-12 text-center dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex size-12 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
        <Inbox className="size-6" />
      </div>
      <div>
        <p className="text-sm font-semibold text-salon-ink dark:text-zinc-100">{title}</p>
        {description ? <p className="mt-1 text-sm text-zinc-500">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}
