import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { Scissors } from 'lucide-react';
import { PageLoading } from '@/shared/ui/PageLoading';

/**
 * 认证页布局，提供品牌识别和居中登录工作区。
 */
export function AuthLayout() {
  return (
    <main className="min-h-screen bg-salon-paper text-salon-ink dark:bg-zinc-950 dark:text-zinc-100">
      <div className="mx-auto grid min-h-screen w-full max-w-6xl grid-cols-1 lg:grid-cols-[1fr_480px]">
        <section className="hidden border-r border-salon-line px-10 py-12 dark:border-zinc-800 lg:flex lg:flex-col lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-lg bg-salon-accent text-white">
              <Scissors className="size-5" />
            </div>
            <div>
              <p className="text-sm font-semibold">Hari Salon</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">门店系统管理端</p>
            </div>
          </div>

          <div className="max-w-xl">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">System Console</p>
            <h1 className="mt-3 text-4xl font-semibold leading-tight">人员、角色、菜单权限集中管理</h1>
            <div className="mt-8 grid grid-cols-3 gap-3">
              {['JWT 认证', '菜单树', '按钮权限'].map((item) => (
                <div
                  className="rounded-lg border border-salon-line bg-white p-4 text-sm font-medium dark:border-zinc-800 dark:bg-zinc-900"
                  key={item}
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>
        <section className="flex items-center justify-center px-5 py-8">
          <Suspense fallback={<PageLoading />}>
            <Outlet />
          </Suspense>
        </section>
      </div>
    </main>
  );
}
