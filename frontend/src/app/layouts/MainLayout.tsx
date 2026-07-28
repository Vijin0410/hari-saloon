import { Suspense } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  LogOut,
  MenuSquare,
  Moon,
  Scissors,
  ShieldCheck,
  Sun,
  Users,
} from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { PageLoading } from '@/shared/ui/PageLoading';
import { cn } from '@/shared/lib/cn';
import { useAppStore } from '@/store/useAppStore';
import { useAuthStore } from '@/store/useAuthStore';

/**
 * 登录后主布局，承载侧边栏、顶栏、移动端导航和业务路由出口。
 */
type NavItem = {
  label: string;
  path: string;
  permission?: string;
  icon: typeof LayoutDashboard;
};

const navItems: NavItem[] = [
  { label: '工作台', path: '/', icon: LayoutDashboard },
  { label: '用户管理', path: '/system/users', icon: Users, permission: 'system:user:list' },
  { label: '角色管理', path: '/system/roles', icon: ShieldCheck, permission: 'system:role:list' },
  { label: '菜单管理', path: '/system/menus', icon: MenuSquare, permission: 'system:menu:list' },
];

function SidebarNav({ compact = false }: { compact?: boolean }) {
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const visibleItems = navItems.filter((item) => !item.permission || hasPermission(item.permission));

  return (
    <nav className={cn('flex gap-1', compact ? 'overflow-x-auto px-4 pb-3' : 'flex-col px-3')}>
      {visibleItems.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            className={({ isActive }) =>
              cn(
                'inline-flex h-10 items-center gap-2 rounded-md px-3 text-sm font-medium transition',
                compact && 'shrink-0',
                isActive
                  ? 'bg-salon-accent text-white shadow-sm'
                  : 'text-zinc-600 hover:bg-zinc-100 hover:text-salon-ink dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white',
              )
            }
            end={item.path === '/'}
            key={item.path}
            to={item.path}
          >
            <Icon className="size-4" />
            {item.label}
          </NavLink>
        );
      })}
    </nav>
  );
}

export function MainLayout() {
  const navigate = useNavigate();
  const theme = useAppStore((state) => state.theme);
  const toggleTheme = useAppStore((state) => state.toggleTheme);
  const user = useAuthStore((state) => state.user);
  const clearSession = useAuthStore((state) => state.clearSession);

  function handleLogout(): void {
    clearSession();
    navigate('/login', { replace: true });
  }

  return (
    <div className="flex min-h-screen bg-salon-paper text-salon-ink dark:bg-zinc-950 dark:text-zinc-100">
      <aside className="hidden w-64 shrink-0 border-r border-salon-line bg-white dark:border-zinc-800 dark:bg-zinc-950 lg:flex lg:flex-col">
        <div className="flex h-16 items-center gap-3 border-b border-salon-line px-5 dark:border-zinc-800">
          <div className="flex size-10 items-center justify-center rounded-lg bg-salon-accent text-white">
            <Scissors className="size-5" />
          </div>
          <div>
            <p className="text-sm font-semibold">Hari Salon</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">管理控制台</p>
          </div>
        </div>
        <div className="py-4">
          <SidebarNav />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 border-b border-salon-line bg-white/90 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/90">
          <div className="flex h-16 items-center justify-between gap-3 px-4 lg:px-6">
            <div>
              <p className="text-sm font-semibold">理发店管理系统</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {user?.nickname || user?.username || '当前用户'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                aria-label="切换主题"
                className="size-10 px-0"
                icon={theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
                onClick={toggleTheme}
                variant="secondary"
              />
              <Button
                icon={<LogOut className="size-4" />}
                onClick={handleLogout}
                variant="secondary"
              >
                退出
              </Button>
            </div>
          </div>
          <div className="lg:hidden">
            <SidebarNav compact />
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6">
          <Suspense fallback={<PageLoading />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
