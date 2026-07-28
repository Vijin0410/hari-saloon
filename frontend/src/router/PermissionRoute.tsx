import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { PageLoading } from '@/shared/ui/PageLoading';
import { useAuthStore } from '@/store/useAuthStore';

/**
 * 页面级权限守卫，配合后端 perms 字段保护系统管理路由。
 */
export interface PermissionRouteProps {
  permission: string;
  children: ReactNode;
}

export function PermissionRoute({ children, permission }: PermissionRouteProps) {
  const user = useAuthStore((state) => state.user);
  const hasPermission = useAuthStore((state) => state.hasPermission);

  if (!user) {
    return <PageLoading />;
  }

  if (!hasPermission(permission)) {
    return <Navigate replace to="/forbidden" />;
  }

  return <>{children}</>;
}
