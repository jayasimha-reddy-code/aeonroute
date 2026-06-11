import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ActivityType = 'route' | 'training' | 'system';

export interface ActivityEntry {
  id: number;
  type: ActivityType;
  text: string;
  timestamp: number;
}

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
}

export type AppTab = 'dashboard' | 'routing' | 'training' | 'analytics' | 'stations' | 'settings';

interface UIState {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;

  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;

  activityLog: ActivityEntry[];
  addActivity: (type: ActivityType, text: string) => void;

  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  globalError: string | null;
  setGlobalError: (error: string | null) => void;

  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

let toastCounter = 0;

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      activeTab: 'dashboard',
      setActiveTab: (tab) => set({ activeTab: tab }),

      sidebarCollapsed: false,
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

      activityLog: [],
      addActivity: (type, text) =>
        set((s) => {
          const entry: ActivityEntry = { id: Date.now(), type, text, timestamp: Date.now() };
          const updated = [entry, ...s.activityLog];
          return { activityLog: updated.slice(0, 20) };
        }),

      isLoading: false,
      setIsLoading: (loading) => set({ isLoading: loading }),
      globalError: null,
      setGlobalError: (error) => set({ globalError: error }),

      toasts: [],
      addToast: (toast) => {
        const id = `toast-${++toastCounter}`;
        set((s) => ({ toasts: [...s.toasts, { ...toast, id }] }));
        const duration = toast.duration ?? 4000;
        setTimeout(() => {
          set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
        }, duration);
      },
      removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
    }),
    {
      name: 'ev-routing-ui',
      partialize: (state) => ({
        activeTab: state.activeTab,
        sidebarCollapsed: state.sidebarCollapsed,
        activityLog: state.activityLog,
      }),
    }
  )
);
