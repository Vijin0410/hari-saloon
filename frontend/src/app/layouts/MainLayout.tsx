import { Suspense, useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Building2,
  ChevronDown,
  FolderTree,
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
  type LucideIcon,
} from 'lucide-react';
import { menuApi } from '@/shared/api/modules/systemApi';
import { Button } from '@/shared/ui/Button';
import { PageLoading } from '@/shared/ui/PageLoading';
import { cn } from '@/shared/lib/cn';
import { useAppStore } from '@/store/useAppStore';
import { useAuthStore } from '@/store/useAuthStore';
import type { MetaInfo, RouteVO } from '@/features/system/model/systemTypes';

/**
 * 登录后的主布局：侧边栏从后端菜单路由树读取，顶部栏承载品牌、主题和退出。
 */
type IconType = LucideIcon;
type PermissionChecker = (permission: string) => boolean;

interface NavLeaf {
  kind: 'leaf';
  label: string;
  path: string;
  permission?: string;
  icon: IconType;
  rank: number;
}

interface NavGroup {
  kind: 'group';
  label: string;
  icon: IconType;
  children: NavLeaf[];
  rank: number;
}

type NavEntry = NavLeaf | NavGroup;

const DEFAULT_RANK = 999;

const DASHBOARD_NAV: NavLeaf = {
  kind: 'leaf',
  label: '工作台',
  path: '/',
  icon: LayoutDashboard,
  rank: -1,
};

const frontendPathByPermission: Record<string, string> = {
  'system:user:list': '/system/users',
  'system:role:list': '/system/roles',
  'system:menu:list': '/system/menus',
  'system:dept:list': '/system/dept',
  'system:dict:list': '/system/dicts',
  'system:tenant:list': '/system/tenants',
  'biz:store:list': '/biz/stores',
  'biz:member:list': '/biz/members',
};

const knownFrontendPaths = new Set<string>(Object.values(frontendPathByPermission));

const iconByPermission: Record<string, IconType> = {
  'system:user:list': Users,
  'system:role:list': ShieldCheck,
  'system:menu:list': MenuSquare,
  'system:dept:list': FolderTree,
  'system:dict:list': BookOpen,
  'system:tenant:list': Building2,
  'biz:store:list': Store,
  'biz:member:list': UserRound,
};

const iconByMetaName: Record<string, IconType> = {
  setting: Settings,
  settings: Settings,
  user: Users,
  users: Users,
  peoples: Users,
  'tree-table': MenuSquare,
  tree: FolderTree,
  dict: BookOpen,
  'office-building': Building2,
  shop: ShoppingBag,
  store: Store,
  member: UserRound,
};

function isPathActive(path: string, pathname: string): boolean {
  if (path === '/') {
    return pathname === '/';
  }
  return pathname === path || pathname.startsWith(`${path}/`);
}

function getRouteRank(meta?: MetaInfo): number {
  return typeof meta?.rank === 'number' ? meta.rank : DEFAULT_RANK;
}

function getRouteTitle(route: RouteVO): string {
  return route.meta?.title || route.name || route.path || '未命名菜单';
}

function normalizeIconName(name: string | undefined): string {
  return name?.trim().toLowerCase() ?? '';
}

function resolveIcon(route: RouteVO): IconType {
  if (route.perm && iconByPermission[route.perm]) {
    return iconByPermission[route.perm];
  }

  const iconName = normalizeIconName(route.meta?.icon);
  return iconByMetaName[iconName] ?? MenuSquare;
}

function sortNavEntries<T extends { label: string; rank: number }>(entries: T[]): T[] {
  return [...entries].sort((left, right) => {
    const rankDiff = left.rank - right.rank;
    if (rankDiff !== 0) {
      return rankDiff;
    }
    return left.label.localeCompare(right.label, 'zh-CN');
  });
}

function trimTrailingSlash(value: string): string {
  if (value === '/') {
    return value;
  }
  return value.replace(/\/+$/, '');
}

function joinRoutePath(parentPath: string, routePath: string | undefined): string {
  if (!routePath) {
    return parentPath || '/';
  }
  if (/^https?:\/\//.test(routePath)) {
    return routePath;
  }
  if (routePath.startsWith('/')) {
    return trimTrailingSlash(routePath);
  }

  const base = parentPath && parentPath !== '/' ? trimTrailingSlash(parentPath) : '';
  return `${base}/${routePath}`.replace(/\/+/g, '/');
}

function resolveFrontendPath(route: RouteVO, parentPath: string): string | null {
  if (route.perm && frontendPathByPermission[route.perm]) {
    return frontendPathByPermission[route.perm];
  }

  const routePath = joinRoutePath(parentPath, route.path);
  return knownFrontendPaths.has(routePath) ? routePath : null;
}

function isHiddenRoute(route: RouteVO): boolean {
  return route.meta?.hidden === true || route.meta?.showLink === false;
}

function hasRoutePermission(route: RouteVO, hasPermission: PermissionChecker): boolean {
  return !route.perm || hasPermission(route.perm);
}

function flattenLeaves(entries: NavEntry[]): NavLeaf[] {
  return entries.flatMap((entry) => (entry.kind === 'leaf' ? [entry] : entry.children));
}

function buildNavEntries(routes: RouteVO[], hasPermission: PermissionChecker, parentPath = ''): NavEntry[] {
  const entries = routes.flatMap<NavEntry>((route) => {
    const currentPath = joinRoutePath(parentPath, route.path);
    const children = buildNavEntries(route.children ?? [], hasPermission, currentPath);

    if (isHiddenRoute(route)) {
      return children;
    }

    const label = getRouteTitle(route);
    const icon = resolveIcon(route);
    const rank = getRouteRank(route.meta);

    if (children.length > 0) {
      return [
        {
          kind: 'group',
          label,
          icon,
          rank,
          children: sortNavEntries(flattenLeaves(children)),
        },
      ];
    }

    const path = resolveFrontendPath(route, parentPath);
    if (!path || !hasRoutePermission(route, hasPermission)) {
      return [];
    }

    return [
      {
        kind: 'leaf',
        label,
        path,
        icon,
        rank,
        permission: route.perm,
      },
    ];
  });

  return sortNavEntries(entries);
}

function LeafLink({ leaf }: { leaf: NavLeaf }) {
  const Icon = leaf.icon;
  return (
    <NavLink
      className={({ isActive }) =>
        cn(
          'inline-flex h-9 w-full items-center gap-2 rounded-md px-3 text-sm transition',
          isActive
            ? 'bg-salon-accent/10 font-medium text-salon-accent dark:bg-violet-500/10'
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
            ? 'text-salon-accent dark:text-violet-300'
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

interface SidebarNavProps {
  routes: RouteVO[];
  loadingRoutes: boolean;
  routeError: boolean;
}

function SidebarNav({ loadingRoutes, routeError, routes }: SidebarNavProps) {
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const navEntries = useMemo(
    () => [DASHBOARD_NAV, ...buildNavEntries(routes, hasPermission)],
    [hasPermission, routes],
  );

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
      {loadingRoutes ? <div className="px-3 py-2 text-xs text-zinc-400">菜单加载中...</div> : null}
      {routeError ? <div className="px-3 py-2 text-xs text-rose-500">菜单加载失败</div> : null}
    </nav>
  );
}

export function MainLayout() {
  const navigate = useNavigate();
  const theme = useAppStore((state) => state.theme);
  const toggleTheme = useAppStore((state) => state.toggleTheme);
  const user = useAuthStore((state) => state.user);
  const clearSession = useAuthStore((state) => state.clearSession);
  const [routes, setRoutes] = useState<RouteVO[]>([]);
  const [loadingRoutes, setLoadingRoutes] = useState(false);
  const [routeError, setRouteError] = useState(false);
  const roleKey = user?.roles.join('|') ?? '';
  const permissionKey = user?.perms.join('|') ?? '';

  useEffect(() => {
    if (!user) {
      setRoutes([]);
      setLoadingRoutes(false);
      setRouteError(false);
      return;
    }

    let active = true;
    setLoadingRoutes(true);
    setRouteError(false);
    menuApi
      .routes()
      .then((items) => {
        if (active) {
          setRoutes(items ?? []);
        }
      })
      .catch(() => {
        if (active) {
          setRoutes([]);
          setRouteError(true);
        }
      })
      .finally(() => {
        if (active) {
          setLoadingRoutes(false);
        }
      });

    return () => {
      active = false;
    };
  }, [permissionKey, roleKey, user]);

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
          <SidebarNav loadingRoutes={loadingRoutes} routeError={routeError} routes={routes} />
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
              {user?.avatar ? (
                <img
                  alt={user.nickname || user.username || '头像'}
                  className="size-9 rounded-full border border-salon-line object-cover"
                  src={user.avatar}
                />
              ) : (
                <div
                  className="flex size-9 items-center justify-center rounded-full bg-salon-accent/10 text-sm font-medium text-salon-accent"
                  title={user?.nickname || user?.username || ''}
                >
                  {(user?.nickname || user?.username || 'U').charAt(0).toUpperCase()}
                </div>
              )}
              <Button
                aria-label="切换主题"
                className="size-10 px-0"
                icon={theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
                onClick={toggleTheme}
                variant="secondary"
              />
              <Button icon={<LogOut className="size-4" />} onClick={handleLogout} variant="secondary">
                退出
              </Button>
            </div>
          </div>
          <div className="max-h-[60vh] overflow-y-auto border-t border-salon-line py-2 dark:border-zinc-800 lg:hidden">
            <SidebarNav loadingRoutes={loadingRoutes} routeError={routeError} routes={routes} />
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
