import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { RoadNetworkData, Route } from '../services/api';

// ─── Toast Types ──────────────────────────────────────────

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
}

// ─── Tab Type ─────────────────────────────────────────────

export type AppTab = 'dashboard' | 'route-planner' | 'training' | 'analytics';

// ─── Theme Type ───────────────────────────────────────────

export type ThemeMode = 'light' | 'dark' | 'system';

// ─── Store Interface ──────────────────────────────────────

interface SystemState {
  // ── Road Network ──
  roadNetwork: RoadNetworkData | null;
  setRoadNetwork: (network: RoadNetworkData) => void;

  // ── Routes ──
  generatedRoutes: Route[];
  setGeneratedRoutes: (routes: Route[]) => void;
  selectedRoute: Route | null;
  setSelectedRoute: (route: Route | null) => void;

  // ── Navigation ──
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;

  // ── Theme ──
  themeMode: ThemeMode;
  isDarkMode: boolean;
  cycleTheme: () => void;
  setThemeMode: (mode: ThemeMode) => void;

  // ── Sidebar ──
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  mobileSidebarOpen: boolean;
  setMobileSidebarOpen: (open: boolean) => void;

  // ── Loading / Error ──
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  globalError: string | null;
  setGlobalError: (error: string | null) => void;

  // ── EV State ──
  currentEVState: {
    battery_soc: number;
    current_node: number;
    battery_capacity_kwh: number;
  };
  setEVState: (state: { battery_soc: number; current_node: number; battery_capacity_kwh: number }) => void;

  // ── Presentation Mode ──
  presentationMode: boolean;
  togglePresentationMode: () => void;

  // ── Toast Notifications ──
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

// ─── Store Implementation ─────────────────────────────────

let toastCounter = 0;

export const useSystemStore = create<SystemState>()(
  persist(
    (set) => ({
      // Road Network
      roadNetwork: null,
      setRoadNetwork: (network) => set({ roadNetwork: network }),

      // Routes
      generatedRoutes: [],
      setGeneratedRoutes: (routes) => set({ generatedRoutes: routes }),
      selectedRoute: null,
      setSelectedRoute: (route) => set({ selectedRoute: route }),

      // Navigation
      activeTab: 'dashboard',
      setActiveTab: (tab) => set({ activeTab: tab, mobileSidebarOpen: false }),

      // Theme — default system
      themeMode: 'system' as ThemeMode,
      isDarkMode: window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false,
      cycleTheme: () =>
        set((s) => {
          const nextMode: ThemeMode =
            s.themeMode === 'light' ? 'dark' : s.themeMode === 'dark' ? 'system' : 'light';
          const systemDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
          const computedDark = nextMode === 'system' ? systemDark : nextMode === 'dark';
          return { themeMode: nextMode, isDarkMode: computedDark };
        }),
      setThemeMode: (mode) =>
        set(() => {
          const systemDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
          const computedDark = mode === 'system' ? systemDark : mode === 'dark';
          return { themeMode: mode, isDarkMode: computedDark };
        }),

      // Sidebar
      sidebarCollapsed: false,
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      mobileSidebarOpen: false,
      setMobileSidebarOpen: (open) => set({ mobileSidebarOpen: open }),

      // Loading / Error
      isLoading: false,
      setIsLoading: (loading) => set({ isLoading: loading }),
      globalError: null,
      setGlobalError: (error) => set({ globalError: error }),

      // EV State
      currentEVState: {
        battery_soc: 80,
        current_node: 0,
        battery_capacity_kwh: 60,
      },
      setEVState: (state) => set({ currentEVState: state }),

      // Presentation Mode
      presentationMode: false,
      togglePresentationMode: () => set((s) => ({ presentationMode: !s.presentationMode })),

      // Toasts
      toasts: [],
      addToast: (toast) => {
        const id = `toast-${++toastCounter}`;
        set((s) => ({ toasts: [...s.toasts, { ...toast, id }] }));

        // Auto-remove after duration
        const duration = toast.duration ?? 4000;
        setTimeout(() => {
          set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
        }, duration);
      },
      removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
    }),
    {
      name: 'ev-routing-preferences',
      // Only persist user preferences — not runtime data
      partialize: (state) => ({
        themeMode: state.themeMode,
        sidebarCollapsed: state.sidebarCollapsed,
        presentationMode: state.presentationMode,
      }),
    }
  )
);

// ─── Selector Hooks ───────────────────────────────────────
// Granular selectors prevent unnecessary re-renders.
// Components subscribe to ONLY the slice of state they need.

export const useRoadNetwork = () => useSystemStore((s) => s.roadNetwork);
export const useSetRoadNetwork = () => useSystemStore((s) => s.setRoadNetwork);

export const useActiveTab = () => useSystemStore((s) => s.activeTab);
export const useSetActiveTab = () => useSystemStore((s) => s.setActiveTab);

export const useTheme = () =>
  useSystemStore((s) => ({
    themeMode: s.themeMode,
    isDarkMode: s.isDarkMode,
    cycleTheme: s.cycleTheme,
    setThemeMode: s.setThemeMode,
  }));

export const useToasts = () => useSystemStore((s) => ({ toasts: s.toasts, addToast: s.addToast, removeToast: s.removeToast }));
export const useAddToast = () => useSystemStore((s) => s.addToast);

export const useSidebar = () => useSystemStore((s) => ({
  sidebarCollapsed: s.sidebarCollapsed,
  toggleSidebar: s.toggleSidebar,
  mobileSidebarOpen: s.mobileSidebarOpen,
  setMobileSidebarOpen: s.setMobileSidebarOpen,
}));

export const useRoutes = () => useSystemStore((s) => ({
  generatedRoutes: s.generatedRoutes,
  setGeneratedRoutes: s.setGeneratedRoutes,
  selectedRoute: s.selectedRoute,
  setSelectedRoute: s.setSelectedRoute,
}));

export const useEVState = () => useSystemStore((s) => ({
  currentEVState: s.currentEVState,
  setEVState: s.setEVState,
}));

export const useLoading = () => useSystemStore((s) => ({
  isLoading: s.isLoading,
  setIsLoading: s.setIsLoading,
}));

export const usePresentationMode = () =>
  useSystemStore((s) => ({
    presentationMode: s.presentationMode,
    togglePresentationMode: s.togglePresentationMode,
  }));

