import { Suspense, type ReactNode } from 'react';
import { Link, Outlet } from 'react-router-dom';
import { Moon, Scissors, Sun } from 'lucide-react';
import { PageLoading } from '@/shared/ui/PageLoading';
import { useAppStore } from '@/store/useAppStore';

/**
 * 认证页布局：左侧品牌图形区（按入口变体切换文案），右侧居中登录工作区。
 * admin=平台管理入口（默认租户），store=门店工作台入口（选择租户）。
 */
export interface AuthLayoutProps {
  variant: 'admin' | 'store';
}

interface BrandConfig {
  badge: string;
  title: string;
  headline: string;
  subtitle: string;
  features: string[];
  switchLabel: string;
  switchTo: string;
  switchHint: string;
}

const BRAND: Record<AuthLayoutProps['variant'], BrandConfig> = {
  admin: {
    badge: 'Platform Console',
    title: 'Hari Salon · 平台管理',
    headline: '平台运营中枢',
    subtitle: '租户开通、角色权限、全局字典与菜单，一站掌控整个 SaaS。',
    features: ['多租户开通', '菜单与按钮权限', '全局字典维护'],
    switchLabel: '门店入口',
    switchTo: '/login',
    switchHint: '我是门店员工，去门店工作台',
  },
  store: {
    badge: 'Store Workspace',
    title: 'Hari Salon · 门店工作台',
    headline: '门店高效协作',
    subtitle: '选择所属租户登录，管理会员、门店与日常营业。',
    features: ['会员管理', '门店运营', '营业数据'],
    switchLabel: '管理员入口',
    switchTo: '/admin/login',
    switchHint: '我是平台管理员，去平台管理控制台',
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
      <div className="relative flex size-12 items-center justify-center rounded-2xl bg-white/15 shadow-lg ring-1 ring-white/30 backdrop-blur">
        <Scissors className="size-6 text-white" />
        <span className="absolute -right-1 -top-1 flex size-3">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-salon-warm opacity-70" />
          <span className="relative inline-flex size-3 rounded-full bg-salon-warm" />
        </span>
      </div>
      <div className="leading-tight">
        <p className="text-base font-semibold text-white">Hari Salon</p>
        <p className="text-xs text-white/70">{variant === 'admin' ? '平台管理控制台' : '门店工作台'}</p>
      </div>
    </div>
  );
}

export function AuthLayout({ variant }: AuthLayoutProps) {
  const brand = BRAND[variant];

  return (
    <main className="relative min-h-screen bg-salon-paper text-salon-ink dark:bg-zinc-950 dark:text-zinc-100">
      <div className="mx-auto grid min-h-screen w-full max-w-6xl grid-cols-1 lg:grid-cols-[1.1fr_460px]">
        {/* 左侧品牌图形区 */}
        <section className="relative hidden overflow-hidden bg-gradient-to-br from-salon-accent via-emerald-800 to-emerald-950 px-10 py-12 text-white lg:flex lg:flex-col lg:justify-between dark:from-emerald-700 dark:via-emerald-900 dark:to-zinc-950">
          {/* 装饰光斑 */}
          <div className="pointer-events-none absolute -left-16 top-10 size-72 rounded-full bg-emerald-400/20 blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 right-0 size-80 rounded-full bg-salon-warm/20 blur-3xl" />
          <div className="pointer-events-none absolute right-10 top-1/3 size-40 rounded-full border border-white/10" />

          <div className="relative">
            <BrandMark variant={variant} />
          </div>

          <div className="relative max-w-xl">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-white/60">{brand.badge}</p>
            <h1 className="mt-4 text-4xl font-bold leading-tight">{brand.headline}</h1>
            <p className="mt-4 text-base leading-relaxed text-white/80">{brand.subtitle}</p>
            <div className="mt-8 grid grid-cols-3 gap-3">
              {brand.features.map((item) => (
                <div
                  className="rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-medium backdrop-blur transition hover:bg-white/20"
                  key={item}
                >
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <Link
              className="group inline-flex items-center gap-2 text-sm text-white/80 transition hover:text-white"
              to={brand.switchTo}
            >
              <span className="inline-flex h-7 items-center rounded-full border border-white/25 bg-white/10 px-3 text-xs font-medium backdrop-blur transition group-hover:bg-white/20">
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
            <div className="flex size-10 items-center justify-center rounded-xl bg-salon-accent text-white">
              <Scissors className="size-5" />
            </div>
            <div className="leading-tight">
              <p className="text-sm font-semibold">{variant === 'admin' ? '平台管理' : '门店工作台'}</p>
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
