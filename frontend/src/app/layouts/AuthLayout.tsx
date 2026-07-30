import { Suspense, type ReactNode } from 'react';
import { Link, Outlet } from 'react-router-dom';
import { Moon, Scissors, Sun } from 'lucide-react';
import heroImage from '@/assets/hari-salon-login-hero.png';
import { PageLoading } from '@/shared/ui/PageLoading';
import { useAppStore } from '@/store/useAppStore';

/**
 * 认证页布局：左侧品牌 hero 图（蓝紫粉插画），右侧居中登录工作区。
 * admin=平台管理入口（默认租户），store=门店工作台入口（选择租户）。
 */
export interface AuthLayoutProps {
  variant: 'admin' | 'store';
}

interface BrandConfig {
  badge: string;
  switchLabel: string;
  switchTo: string;
  switchHint: string;
}

const BRAND: Record<AuthLayoutProps['variant'], BrandConfig> = {
  admin: {
    badge: 'Platform Console',
    switchLabel: '门店入口',
    switchTo: '/login',
    switchHint: '门店工作台',
  },
  store: {
    badge: 'Store Workspace',
    switchLabel: '管理员入口',
    switchTo: '/admin/login',
    switchHint: '平台管理控制台',
  },
};

function ThemeToggle(): ReactNode {
  const theme = useAppStore((state) => state.theme);
  const toggleTheme = useAppStore((state) => state.toggleTheme);
  return (
    <button
      aria-label="切换主题"
      className="inline-flex size-10 items-center justify-center rounded-full border border-salon-line bg-white/70 text-zinc-600 transition hover:bg-white hover:text-salon-ink dark:border-zinc-700 dark:bg-zinc-900/70 dark:text-zinc-300 dark:hover:bg-zinc-800"
      onClick={toggleTheme}
      type="button"
    >
      {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  );
}

function BrandMark({ variant }: { variant: AuthLayoutProps['variant'] }): ReactNode {
  return (
    <div className="flex items-center gap-3">
      <div className="relative flex size-12 items-center justify-center rounded-2xl bg-white/70 shadow-lg ring-1 ring-white/60 backdrop-blur">
        <Scissors className="size-6 text-salon-accent" />
        <span className="absolute -right-1 -top-1 flex size-3">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-salon-warm opacity-70" />
          <span className="relative inline-flex size-3 rounded-full bg-salon-warm" />
        </span>
      </div>
      <div className="leading-tight">
        <p className="text-base font-semibold text-salon-ink">Hari Salon</p>
        <p className="text-xs text-zinc-500">
          {variant === 'admin' ? '平台管理控制台' : '门店工作台'}
        </p>
      </div>
    </div>
  );
}

export function AuthLayout({ variant }: AuthLayoutProps) {
  const brand = BRAND[variant];

  return (
    <main className="relative min-h-screen bg-salon-paper text-salon-ink dark:bg-zinc-950 dark:text-zinc-100">
      <div className="grid min-h-screen w-full grid-cols-1 lg:grid-cols-[55%_45%]">
        {/* 左侧品牌 hero：插画替代原文字卖点区 */}
        <section className="relative hidden overflow-hidden bg-gradient-to-br from-[#dce8ff] via-[#ebe4ff] to-[#f9d9ea] px-10 py-12 lg:flex lg:flex-col lg:justify-between dark:from-[#2a2440] dark:via-[#322848] dark:to-[#3a2438]">
          <div className="pointer-events-none absolute -left-16 top-10 size-72 rounded-full bg-sky-300/30 blur-3xl dark:bg-violet-500/20" />
          <div className="pointer-events-none absolute bottom-0 right-0 size-80 rounded-full bg-salon-warm/30 blur-3xl" />
          <div className="pointer-events-none absolute right-16 top-1/4 size-48 rounded-full border border-white/40 dark:border-white/10" />

          <div className="relative">
            <BrandMark variant={variant} />
            <p className="mt-4 text-xs font-medium uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-400">
              {brand.badge}
            </p>
          </div>

          <div className="relative flex flex-1 items-center justify-center py-6">
            <div className="relative w-full max-w-[28rem]">
              <div className="absolute inset-6 rounded-full bg-white/50 blur-2xl dark:bg-violet-400/10" />
              <img
                alt="Hari Salon"
                className="relative mx-auto w-full max-w-md drop-shadow-xl select-none"
                draggable={false}
                src={heroImage}
              />
            </div>
          </div>

          <div className="relative">
            <Link
              className="group inline-flex items-center gap-2 text-sm text-zinc-600 transition hover:text-salon-accent dark:text-zinc-300 dark:hover:text-violet-300"
              to={brand.switchTo}
            >
              <span className="inline-flex h-7 items-center rounded-full border border-white/70 bg-white/60 px-3 text-xs font-medium text-salon-accent backdrop-blur transition group-hover:bg-white dark:border-white/10 dark:bg-white/10 dark:text-violet-300">
                {brand.switchLabel}
              </span>
              <span>{brand.switchHint}</span>
            </Link>
          </div>
        </section>

        {/* 右侧登录工作区 */}
        <section className="relative flex items-center justify-center px-5 py-8">
          <div className="absolute right-4 top-4">
            <ThemeToggle />
          </div>
          {/* 移动端品牌头 */}
          <div className="absolute left-5 top-6 flex items-center gap-3 lg:hidden">
            <div className="flex size-10 items-center justify-center overflow-hidden rounded-full ring-2 ring-salon-accent/20">
              <img alt="Hari Salon" className="size-10 object-cover" src={heroImage} />
            </div>
            <div className="leading-tight">
              <p className="text-sm font-semibold">
                {variant === 'admin' ? '平台管理' : '门店工作台'}
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Hari Salon</p>
            </div>
          </div>
          <Suspense fallback={<PageLoading />}>
            <Outlet />
          </Suspense>
        </section>
      </div>
    </main>
  );
}
