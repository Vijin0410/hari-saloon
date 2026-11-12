import { Suspense, useState } from 'react';
import { Link, Outlet } from 'react-router-dom';
import { ArrowUpRight, Moon, Pause, Play, Scissors, Sun } from 'lucide-react';
import { PageLoading } from '@/shared/ui/PageLoading';
import { SalonArtwork } from '@/shared/ui/SalonArtwork';
import { useAppStore } from '@/store/useAppStore';

/** 品牌认证入口：原创镜面发丝 SVG、可暂停轻动效与始终可见的登录入口切换。 */
export interface AuthLayoutProps {
  variant: 'admin' | 'store';
}

export function AuthLayout({ variant }: AuthLayoutProps) {
  const theme = useAppStore((state) => state.theme);
  const toggleTheme = useAppStore((state) => state.toggleTheme);
  const [animated, setAnimated] = useState(true);
  const isAdmin = variant === 'admin';
  return (
    <main className="grid min-h-dvh bg-[#faf9f7] text-salon-ink lg:grid-cols-[minmax(0,1.08fr)_minmax(0,1fr)] dark:bg-zinc-950 dark:text-zinc-100">
      <section className="relative hidden min-h-screen flex-col overflow-hidden bg-salon-plum px-10 py-9 text-[#f5eee6] lg:flex xl:px-14">
        <div className="pointer-events-none absolute -left-36 top-32 size-[540px] rounded-full bg-[#a4778e]/15 blur-[100px]" />
        <div className="relative z-10 flex items-center justify-between">
          <Link
            to={isAdmin ? '/admin/login' : '/login'}
            className="flex items-center gap-3"
            aria-label="Hair Salon 首页"
          >
            <span className="grid size-10 place-items-center rounded-xl border border-[#e0c8bc]/25">
              <Scissors className="size-5 text-[#dec6ae]" />
            </span>
            <span>
              <span className="block text-lg font-semibold tracking-tight">
                Hair Salon<span className="text-[#c6a3b3]">.</span>
              </span>
              <span className="text-[10px] tracking-[.23em] text-[#c8bac9]">
                THE ART OF EVERYDAY
              </span>
            </span>
          </Link>
          <span className="text-[10px] tracking-[.22em] text-[#c8bac9]">SALON WORKSPACE</span>
        </div>
        <div className="relative z-10 mt-12 xl:mt-16">
          <div className="mb-4 flex items-center gap-3 text-[10px] tracking-[.3em] text-[#c6a3b3]">
            <span className="h-px w-7 bg-[#c6a3b3]/60" /> BEAUTY IN EVERY DETAIL
          </div>
          <h1 className="text-[clamp(30px,3.2vw,48px)] font-medium leading-[1.45] tracking-[.04em]">
            让手艺被看见，
            <br />
            <span className="text-[#d9b9a5]">让经营更从容。</span>
          </h1>
          <p className="mt-4 text-sm leading-7 text-[#c8bac9]">
            从一次相遇，到每一次再来。
            <br />
            用心照顾顾客，也用心经营你的沙龙。
          </p>
        </div>
        <div className="relative -mt-8 flex min-h-0 flex-1 items-center justify-center">
          <SalonArtwork
            animated={animated}
            className="max-h-[53vh] max-w-[520px] xl:max-h-[56vh]"
          />
          <div className="absolute bottom-12 left-0 rounded-xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm xl:left-2">
            <p className="text-[10px] tracking-widest text-[#c8bac9]">CRAFTED WITH CARE</p>
            <p className="mt-1 text-sm text-[#f5eee6]">专注每一份手艺与信任</p>
          </div>
        </div>
        <div className="relative z-10 flex items-center justify-between border-t border-white/10 pt-5 text-xs text-[#bcadbe]">
          <span>为美而生 · 为经营而设计</span>
          <button
            type="button"
            onClick={() => setAnimated((value) => !value)}
            aria-label={animated ? '暂停背景动效' : '播放背景动效'}
            aria-pressed={!animated}
            className="flex items-center gap-2 rounded-md px-2 py-1.5 transition hover:bg-white/10"
          >
            {animated ? <Pause className="size-3" /> : <Play className="size-3" />}
            <span>{animated ? '暂停动效' : '播放动效'}</span>
          </button>
        </div>
      </section>
      <section className="relative flex min-h-dvh flex-col px-6 sm:px-12 xl:px-20">
        <header className="flex min-h-24 items-center justify-between gap-4">
          <Link to="/login" className="flex items-center gap-2.5 lg:invisible">
            <span className="grid size-9 place-items-center rounded-xl bg-salon-plum text-[#ead5be]">
              <Scissors className="size-4" />
            </span>
            <span className="font-semibold">Hair Salon.</span>
          </Link>
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="切换主题"
            className="grid size-10 place-items-center rounded-full border border-salon-line bg-white/60 text-zinc-500 transition hover:bg-white dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
          >
            {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </button>
        </header>
        <div className="flex flex-1 items-center justify-center py-10 motion-safe:animate-[salon-rise_.6s_ease-out_both]">
          <Suspense fallback={<PageLoading />}>
            <Outlet />
          </Suspense>
        </div>
        <footer className="mx-auto flex w-full max-w-[380px] flex-wrap items-center justify-between gap-3 border-t border-salon-line py-7 text-xs text-zinc-500 dark:border-zinc-800">
          <span>Hair Salon · 美业经营工作台</span>
          <Link
            className="inline-flex items-center gap-1.5 font-medium text-salon-accent hover:underline dark:text-violet-300"
            to={isAdmin ? '/login' : '/admin/login'}
          >
            {isAdmin ? '门店工作台' : '平台管理入口'}
            <ArrowUpRight className="size-3.5" />
          </Link>
        </footer>
      </section>
    </main>
  );
}
