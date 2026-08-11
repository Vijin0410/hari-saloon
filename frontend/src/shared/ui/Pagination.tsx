import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/shared/lib/cn';

/**
 * 列表分页器：页码导航 + 总数 + 总页数。
 * 替代各列表页手写的「上一页/下一页」，支持页码跳转与省略号收敛。
 */
export interface PaginationProps {
  /** 当前页码，从 1 开始 */
  pageNum: number;
  /** 每页条数 */
  pageSize: number;
  /** 总记录数 */
  total: number;
  /** 页码变更回调 */
  onChange: (pageNum: number) => void;
  className?: string;
}

type PageItem = number | 'ellipsis';

/** 生成页码序列，总页数超过 7 时用省略号收敛，始终保留首末页。 */
function buildPageList(current: number, totalPages: number): PageItem[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  if (current <= 4) {
    return [1, 2, 3, 4, 5, 'ellipsis', totalPages];
  }
  if (current >= totalPages - 3) {
    return [1, 'ellipsis', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }
  return [1, 'ellipsis', current - 1, current, current + 1, 'ellipsis', totalPages];
}

export function Pagination({ pageNum, pageSize, total, onChange, className }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const canPrev = pageNum > 1;
  const canNext = pageNum < totalPages;
  const pages = buildPageList(pageNum, totalPages);

  if (total === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-3 text-sm text-zinc-500 dark:text-zinc-400',
        className,
      )}
    >
      <span>
        共 {total} 条 · 第 {pageNum}/{totalPages} 页
      </span>
      <div className="flex items-center gap-1">
        <button
          aria-label="上一页"
          className="inline-flex size-8 items-center justify-center rounded-md border border-salon-line bg-white text-zinc-600 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
          disabled={!canPrev}
          onClick={() => onChange(pageNum - 1)}
          type="button"
        >
          <ChevronLeft className="size-4" />
        </button>
        {pages.map((p, idx) =>
          p === 'ellipsis' ? (
            <span key={`ellipsis-${idx}`} className="px-1.5 text-zinc-400">
              …
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onChange(p)}
              type="button"
              className={cn(
                'inline-flex h-8 min-w-8 items-center justify-center rounded-md border px-2 text-xs font-medium transition',
                p === pageNum
                  ? 'border-salon-accent bg-salon-accent text-white'
                  : 'border-salon-line bg-white text-zinc-600 hover:bg-stone-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800',
              )}
            >
              {p}
            </button>
          ),
        )}
        <button
          aria-label="下一页"
          className="inline-flex size-8 items-center justify-center rounded-md border border-salon-line bg-white text-zinc-600 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
          disabled={!canNext}
          onClick={() => onChange(pageNum + 1)}
          type="button"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  );
}
