import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';
import { EmptyState } from '@/shared/ui/EmptyState';
import { PageLoading } from '@/shared/ui/PageLoading';

/**
 * 通用列表表格：统一边框、表头、分割线、空态与加载态。
 * 新模块强制使用，禁止手写 <table> 结构（见 hair-salon-ui skill 第 9 节）。
 * 声明式 columns：title + render + align + width，内置 loading/empty。
 */
export interface TableColumn<T> {
  /** 列标题 */
  title: ReactNode;
  /** 单元格渲染 */
  render: (row: T, index: number) => ReactNode;
  /** 对齐方式，默认 left；操作列用 right */
  align?: 'left' | 'right' | 'center';
  /** 列宽（CSS 宽度，如 "120px" / "20%"） */
  width?: string;
  /** 单元格额外 className（表头同列同步） */
  className?: string;
}

export interface TableProps<T> {
  columns: TableColumn<T>[];
  data: T[];
  /** 行 key 提取 */
  rowKey: (row: T, index: number) => string | number;
  /** 加载中，显示 PageLoading 替代表格 */
  loading?: boolean;
  /** 空数据占位，默认 EmptyState「暂无数据」 */
  empty?: ReactNode;
  /** 行点击 */
  onRowClick?: (row: T) => void;
  className?: string;
}

const ALIGN_CLASS: Record<NonNullable<TableColumn<unknown>['align']>, string> = {
  left: 'text-left',
  right: 'text-right',
  center: 'text-center',
};

export function Table<T>({
  columns,
  data,
  rowKey,
  loading,
  empty,
  onRowClick,
  className,
}: TableProps<T>) {
  if (loading) {
    return <PageLoading />;
  }

  if (data.length === 0) {
    return empty ?? <EmptyState title="暂无数据" description="当前条件下没有匹配记录。" />;
  }

  return (
    <div
      className={cn(
        'overflow-hidden rounded-lg border border-salon-line dark:border-zinc-800',
        className,
      )}
    >
      <table className="min-w-full divide-y divide-salon-line text-sm dark:divide-zinc-800">
        <thead className="bg-slate-50 dark:bg-zinc-900/60">
          <tr>
            {columns.map((col, idx) => (
              <th
                key={idx}
                style={col.width ? { width: col.width } : undefined}
                className={cn(
                  'px-4 py-3 font-medium',
                  ALIGN_CLASS[col.align ?? 'left'],
                  col.className,
                )}
              >
                {col.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-salon-line dark:divide-zinc-800">
          {data.map((row, index) => (
            <tr
              key={rowKey(row, index)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={onRowClick ? 'cursor-pointer hover:bg-stone-50 dark:hover:bg-zinc-900/50' : undefined}
            >
              {columns.map((col, colIdx) => (
                <td
                  key={colIdx}
                  className={cn('px-4 py-3', ALIGN_CLASS[col.align ?? 'left'], col.className)}
                >
                  {col.render(row, index)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
