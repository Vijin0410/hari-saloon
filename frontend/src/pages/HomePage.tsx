import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { MenuSquare, ShieldCheck, Users, Workflow } from 'lucide-react';
import { menuApi, roleApi, userApi } from '@/shared/api/modules/systemApi';
import { Badge } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { PageLoading } from '@/shared/ui/PageLoading';
import { formatDateTime } from '@/shared/lib/format';
import { useAuthStore } from '@/store/useAuthStore';
import { flattenMenuTree } from '@/features/system/model/systemTypes';

/**
 * 工作台首页，展示当前登录用户、核心统计和系统管理入口。
 */
interface DashboardStats {
  userCount: number;
  roleCount: number;
  menuCount: number;
  permCount: number;
}

export function HomePage() {
  const user = useAuthStore((state) => state.user);
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const [stats, setStats] = useState<DashboardStats>({
    userCount: 0,
    roleCount: 0,
    menuCount: 0,
    permCount: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([
      userApi.list({ pageNum: 1, pageSize: 1 }),
      roleApi.list({ pageNum: 1, pageSize: 1 }),
      menuApi.list(),
    ])
      .then(([userPage, rolePage, menuTree]) => {
        if (active) {
          const menuCount = flattenMenuTree(menuTree).length;
          setStats({
            userCount: userPage.total,
            roleCount: rolePage.total,
            menuCount,
            permCount: user?.perms?.length ?? 0,
          });
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [user?.perms?.length]);

  const quickLinks = useMemo(
    () =>
      [
      { label: '用户管理', to: '/system/users', icon: Users },
      { label: '角色管理', to: '/system/roles', icon: ShieldCheck },
      { label: '菜单管理', to: '/system/menus', icon: MenuSquare },
      ].filter((item) => {
        if (item.to.endsWith('users')) {
          return hasPermission('system:user:list');
        }
        if (item.to.endsWith('roles')) {
          return hasPermission('system:role:list');
        }
        return hasPermission('system:menu:list');
      }),
    [hasPermission],
  );

  if (loading) {
    return <PageLoading />;
  }

  return (
    <section className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-lg border border-salon-line bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">当前登录</p>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <h1 className="text-2xl font-semibold">{user?.nickname || user?.username || '未命名用户'}</h1>
            <Badge tone="success">已登录</Badge>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-lg border border-salon-line bg-slate-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/60">
              <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">用户名</p>
              <p className="mt-2 text-sm font-medium">{user?.username || '-'}</p>
            </div>
            <div className="rounded-lg border border-salon-line bg-slate-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/60">
              <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">部门ID</p>
              <p className="mt-2 text-sm font-medium">{user?.deptId || '-'}</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {(user?.roles || []).map((role) => (
              <Badge key={role}>{role}</Badge>
            ))}
          </div>
          <p className="mt-4 text-xs text-zinc-500 dark:text-zinc-400">
            当前时间 {formatDateTime(new Date().toISOString())}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {[
            { label: '用户数量', value: stats.userCount, icon: Users },
            { label: '角色数量', value: stats.roleCount, icon: ShieldCheck },
            { label: '菜单节点', value: stats.menuCount, icon: MenuSquare },
            { label: '权限点', value: stats.permCount, icon: Workflow },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div
                className="rounded-lg border border-salon-line bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
                key={item.label}
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">{item.label}</p>
                  <Icon className="size-4 text-salon-accent" />
                </div>
                <p className="mt-4 text-3xl font-semibold">{item.value}</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-lg border border-salon-line bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold">快捷入口</h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">直接进入常用系统管理页面。</p>
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {quickLinks.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.to} to={item.to}>
                <Button className="w-full justify-between" icon={<Icon className="size-4" />} variant="secondary">
                  {item.label}
                </Button>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
