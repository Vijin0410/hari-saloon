import { Suspense, useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Building2,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  MenuSquare,
  Moon,
  Scissors,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Store,
  Sun,
  UserRound,
  Users,
} from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { PageLoading } from '@/shared/ui/PageLoading';
import { cn } from '@/shared/lib/cn';
import { useAppStore } from '@/store/useAppStore';
import { useAuthStore } from '@/store/useAuthStore';

/**
 * 登录后主布局：侧边栏按「系统管理 / 业务管理」分组可折叠，顶栏承载品牌、主题与退出。
 */
type IconType = typeof LayoutDashboard;

interface NavLeaf {
  kind: 'leaf';
  label: string;
  path: string;
  permission?: string;
  icon: IconType;
}

interface NavGroup {
  kind: 'group';
  label: string;
  icon: IconType;
  children: NavLeaf[];
}

type NavEntry = NavLeaf | NavGroup;

const navEntries: NavEntry[] = [
  { kind: 'leaf', label: '工作台', path: '/', icon: LayoutDashboard },
  {
    kind: 'group',
    label: '系统管理',
    icon: Settings,
    children: [
      { kind: 'leaf', label: '用户管理', path: '/system/users', icon: Users, permission: 'system:user:list' },
      { kind: 'leaf', label: '角色管理', path: '/system/roles', icon: ShieldCheck, permission: 'system:role:list' },
      { kind: 'leaf', label: '菜单管理', path: '/system/menus', icon: MenuSquare, permission: 'system:menu:list' },
      { kind: 'leaf', label: '字典管理', path: '/system/dicts', icon: BookOpen, permission: 'system:dict:list' },
      { kind: 'leaf', label: '租户管理', path: '/system/tenants', icon: Building2, permission: 'system:tenant:list' },
    ],
  },
  {
    kind: 'group',
    label: '业务管理',
    icon: ShoppingBag,
    children: [
      { kind: 'leaf', label: '门店管理', path: '/biz/stores', icon: Store, permission: 'biz:store:list' },
      { kind: 'leaf', label: '会员管理', path: '/biz/members', icon: UserRound, permission: 'biz:member:list' },
    ],
  },
];

function isPathActive(path: string, pathname: string): boolean {
  if (path === '/') {
    return pathname === '/';
  }
  return pathname === path || pathname.startsWith(`${path}/`);
}

function LeafLink({ leaf }: { leaf: NavLeaf }) {
  const Icon = leaf.icon;
  return (
    <NavLink
      className={({ isActive }) =>
        cn(
          'inline-flex h-9 w-full items-center gap-2 rounded-md px-3 text-sm transition',
          isActive
            ? 'bg-salon-accent/10 font-medium text-salon-accent dark:bg-emerald-500/10'
            : 'text-zinc-600 hover:bg-zinc-100 hover:text-salon-ink dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white',
        )
      }
      end={leaf.path === '/'}
      to={leaf.path}
    >
      <Icon className="size-4" />
      {leaf.label}
    </NavLink>
  );
}

function GroupItem({ group }: { group: NavGroup }) {
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const { pathname } = useLocation();
  const visibleChildren = group.children.filter((child) => !child.permission || hasPermission(child.permission));
  const childActive = visibleChildren.some((child) => isPathActive(child.path, pathname));
  const [open, setOpen] = useState(childActive);

  useEffect(() => {
    if (childActive) {
      setOpen(true);
    }
  }, [childActive]);

  if (visibleChildren.length === 0) {
    return null;
  }

  const Icon = group.icon;

  return (
    <div>
      <button
        className={cn(
          'inline-flex h-10 w-full items-center gap-2 rounded-md px-3 text-sm font-medium transition',
          childActive
            ? 'text-salon-accent dark:text-emerald-400'
            : 'text-zinc-600 hover:bg-zinc-100 hover:text-salon-ink dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white',
        )}
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <Icon className="size-4" />
        <span className="flex-1 text-left">{group.label}</span>
        <ChevronDown className={cn('size-4 text-zinc-400 transition', open && 'rotate-180')} />
      </button>
      {open ? (
        <div className="mt-1 ml-[18px] space-y-1 border-l border-salon-line pl-3 dark:border-zinc-800">
          {visibleChildren.map((child) => (
            <LeafLink key={child.path} leaf={child} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function SidebarNav() {
  const hasPermission = useAuthStore((state) => state.hasPermission);
  return (
    <nav className="flex flex-col gap-1 px-3">
      {navEntries.map((entry) => {
        if (entry.kind === 'leaf') {
          if (entry.permission && !hasPermission(entry.permission)) {
            return null;
          }
          return <LeafLink key={entry.path} leaf={entry} />;
        }
        return <GroupItem group={entry} key={entry.label} />;
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
          <div className="flex size-10 items-center justify-center rounded-xl bg-salon-accent text-white shadow-sm">
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
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-lg bg-salon-accent text-white lg:hidden">
                <Scissors className="size-4" />
              </div>
              <div>
                <p className="text-sm font-semibold">理发店管理系统</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {user?.nickname || user?.username || '当前用户'}
                </p>
              </div>
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
          <div className="max-h-[60vh] overflow-y-auto border-t border-salon-line py-2 dark:border-zinc-800 lg:hidden">
            <SidebarNav />
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
