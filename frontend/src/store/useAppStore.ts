import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeMode = 'light' | 'dark';

interface AppState {
  theme: ThemeMode;
  loadingCount: number;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  startLoading: () => void;
  stopLoading: () => void;
}

function applyTheme(theme: ThemeMode): void {
  if (typeof document === 'undefined') {
    return;
  }
  document.documentElement.classList.toggle('dark', theme === 'dark');
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      theme: 'light',
      loadingCount: 0,
      setTheme: (theme) => {
        applyTheme(theme);
        set({ theme });
      },
      toggleTheme: () => {
        const nextTheme = get().theme === 'dark' ? 'light' : 'dark';
        applyTheme(nextTheme);
        set({ theme: nextTheme });
      },
      startLoading: () => {
        set((state) => ({ loadingCount: state.loadingCount + 1 }));
      },
      stopLoading: () => {
        set((state) => ({ loadingCount: Math.max(0, state.loadingCount - 1) }));
      },
    }),
    {
      name: 'hari-salon-app',
      partialize: (state) => ({ theme: state.theme }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          applyTheme(state.theme);
        }
      },
    },
  ),
);
