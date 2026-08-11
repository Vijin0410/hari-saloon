import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { clearAccessToken, setAccessToken } from '@/shared/lib/authToken';
import type { CurrentUser } from '@/features/auth/model/authTypes';

interface AuthState {
  token: string | null;
  user: CurrentUser | null;
  setSession: (token: string, user: CurrentUser) => void;
  setUser: (user: CurrentUser) => void;
  clearSession: () => void;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
}

function hasValue(list: readonly string[] | undefined, value: string): boolean {
  return Array.isArray(list) && list.includes(value);
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      setSession: (token, user) => {
        setAccessToken(token);
        set({ token, user });
      },
      setUser: (user) => {
        set({ user });
      },
      clearSession: () => {
        clearAccessToken();
        set({ token: null, user: null });
      },
      hasPermission: (permission) => {
        const user = get().user;
        if (!user) {
          return false;
        }
        if (hasValue(user.roles, 'ROOT')) {
          return true;
        }
        return hasValue(user.perms, permission);
      },
      hasRole: (role) => {
        const user = get().user;
        return user ? hasValue(user.roles, role) : false;
      },
    }),
    {
      name: 'hair-salon-auth',
      partialize: (state) => ({
        token: state.token,
        user: state.user,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.token) {
          setAccessToken(state.token);
        } else {
          clearAccessToken();
        }
      },
    },
  ),
);
