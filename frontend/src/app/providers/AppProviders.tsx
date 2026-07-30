import { useEffect, type ReactNode } from 'react';
import { authApi } from '@/shared/api/modules/authApi';
import { registerLoadingHandler, registerUnauthorizedHandler } from '@/shared/api/client';
import { useAppStore } from '@/store/useAppStore';
import { useAuthStore } from '@/store/useAuthStore';

/**
 * 应用级 Provider 入口，集中注册请求 loading、401 处理和启动时用户同步。
 */
export interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  const loadingCount = useAppStore((state) => state.loadingCount);

  useEffect(() => {
    registerLoadingHandler({
      start: () => useAppStore.getState().startLoading(),
      stop: () => useAppStore.getState().stopLoading(),
    });

    registerUnauthorizedHandler(() => {
      useAuthStore.getState().clearSession();
      if (window.location.pathname !== '/login') {
        window.location.assign('/login');
      }
    });

    return () => {
      registerLoadingHandler(null);
      registerUnauthorizedHandler(null);
    };
  }, []);

  useEffect(() => {
    const token = useAuthStore.getState().token;
    if (!token) {
      return undefined;
    }

    let mounted = true;
    authApi
      .me()
      .then((user) => {
        if (mounted) {
          useAuthStore.getState().setUser(user);
        }
      })
      .catch(() => {
        if (mounted) {
          useAuthStore.getState().clearSession();
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <>
      {loadingCount > 0 ? (
        <div className="fixed inset-x-0 top-0 z-50 h-1 bg-salon-accent shadow-[0_0_18px_rgba(124,106,239,0.45)]" />
      ) : null}
      {children}
    </>
  );
}
