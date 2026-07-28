import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';

/**
 * 登录态路由守卫，无 token 时统一跳转登录页。
 */
export function ProtectedRoute() {
  const token = useAuthStore((state) => state.token);
  const location = useLocation();

  if (!token) {
    return <Navigate replace state={{ from: location.pathname + location.search }} to="/login" />;
  }

  return <Outlet />;
}
