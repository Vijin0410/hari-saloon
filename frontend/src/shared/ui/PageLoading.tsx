import { Spinner } from '@/shared/ui/Spinner';

/**
 * 路由懒加载和整页请求等待时使用的居中加载态。
 */
export function PageLoading() {
  return (
    <div className="flex min-h-64 items-center justify-center text-sm text-zinc-500 dark:text-zinc-400">
      <div className="flex items-center gap-2">
        <Spinner />
        <span>加载中</span>
      </div>
    </div>
  );
}
