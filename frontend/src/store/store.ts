import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { RoadNetworkData, Route, StationData } from '../services/api';

// ─── Training Stream Types ────────────────────────────────

export interface LossPoint {
  epoch: number;
  g_loss: number;
  d_loss_real: number;
  d_loss_fake: number;
}

export interface RewardPoint {
  episode: number;
  reward: number;
  length: number;
}

export interface TrainingProgress {
  is_training: boolean;
  progress: number;
  current_step: string;
  metrics: Record<string, any>;
  gan_epoch: number;
  gan_total_epochs: number;
  rl_episode: number;
  rl_total_episodes: number;
}

// ─── Toast Types ──────────────────────────────────────────

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
}

// ─── Tab Type ─────────────────────────────────────────────

export type AppTab = 'dashboard' | 'routing' | 'training' | 'analytics' | 'stations' | 'settings' | 'ai-models' | 'routing-config' | 'monitoring';

// ─── Settings Types ───────────────────────────────────────

export type UnitSystem = 'metric' | 'imperial';
export type ViewMode = 'grid' | 'list';

export interface UserSettings {
  units: UnitSystem;
  avoidTolls: boolean;
  optimizeBattery: boolean;
  notifications: boolean;
  viewMode: ViewMode;
}

// ─── Store Interface ──────────────────────────────────────

interface SystemState {
  // ── Road Network ──
  roadNetwork: RoadNetworkData | null;
  setRoadNetwork: (network: RoadNetworkData) => void;

  // ── Stations ──
  stations: StationData[];
  setStations: (stations: StationData[]) => void;

  // ── Routes ──
  generatedRoutes: Route[];
  setGeneratedRoutes: (routes: Route[]) => void;
  selectedRoute: Route | null;
  setSelectedRoute: (route: Route | null) => void;

  // ── Navigation ──
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;

  // ── Sidebar ──
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;

  // ── User Settings (global, persisted) ──
  settings: UserSettings;
  setUnits: (units: UnitSystem) => void;
  setAvoidTolls: (avoid: boolean) => void;
  setOptimizeBattery: (optimize: boolean) => void;
  setNotifications: (enabled: boolean) => void;
  setViewMode: (mode: ViewMode) => void;

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

  // ── Toast Notifications ──
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;

  // ── Training Stream (SSE) ──
  sseConnected: boolean;
  setSSEConnected: (connected: boolean) => void;
  trainingProgress: TrainingProgress;
  lossHistory: LossPoint[];
  rewardHistory: RewardPoint[];
  trainingLogs: Array<{ timestamp: string; message: string }>;
  updateTrainingFromSSE: (data: any) => void;
  resetTrainingData: () => void;
}

// ─── Store Implementation ─────────────────────────────────

let toastCounter = 0;

export const useSystemStore = create<SystemState>()(
  persist(
    (set) => ({
      // Road Network
      roadNetwork: null,
      setRoadNetwork: (network) => set({ roadNetwork: network }),

      // Stations
      stations: [],
      setStations: (stations) => set({ stations }),

      // Routes
      generatedRoutes: [],
      setGeneratedRoutes: (routes) => set({ generatedRoutes: routes }),
      selectedRoute: null,
      setSelectedRoute: (route) => set({ selectedRoute: route }),

      // Navigation
      activeTab: 'dashboard',
      setActiveTab: (tab) => set({ activeTab: tab }),

      // Sidebar
      sidebarCollapsed: false,
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

      // User Settings (global)
      settings: {
        units: 'metric',
        avoidTolls: false,
        optimizeBattery: true,
        notifications: true,
        viewMode: 'grid',
      },
      setUnits: (units) => set((s) => ({ settings: { ...s.settings, units } })),
      setAvoidTolls: (avoidTolls) => set((s) => ({ settings: { ...s.settings, avoidTolls } })),
      setOptimizeBattery: (optimizeBattery) => set((s) => ({ settings: { ...s.settings, optimizeBattery } })),
      setNotifications: (notifications) => set((s) => ({ settings: { ...s.settings, notifications } })),
      setViewMode: (viewMode) => set((s) => ({ settings: { ...s.settings, viewMode } })),

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

      // Training Stream (SSE)
      sseConnected: false,
      setSSEConnected: (connected) => set({ sseConnected: connected }),

      trainingProgress: {
        is_training: false,
        progress: 0,
        current_step: '',
        metrics: {},
        gan_epoch: 0,
        gan_total_epochs: 0,
        rl_episode: 0,
        rl_total_episodes: 0,
      },

      lossHistory: [],
      rewardHistory: [],
      trainingLogs: [],

      updateTrainingFromSSE: (data: any) =>
        set((s) => {
          const newProgress: TrainingProgress = {
            ...s.trainingProgress,
            is_training: data.is_training ?? s.trainingProgress.is_training,
            progress: data.progress ?? s.trainingProgress.progress,
            current_step: data.current_step ?? s.trainingProgress.current_step,
            metrics: data.metrics ?? s.trainingProgress.metrics,
            gan_epoch: data.gan_epoch ?? s.trainingProgress.gan_epoch,
            gan_total_epochs: data.gan_total_epochs ?? s.trainingProgress.gan_total_epochs,
            rl_episode: data.rl_episode ?? s.trainingProgress.rl_episode,
            rl_total_episodes: data.rl_total_episodes ?? s.trainingProgress.rl_total_episodes,
          };

          let newLoss = s.lossHistory;
          if (Array.isArray(data.new_loss_points) && data.new_loss_points.length > 0) {
            newLoss = [...s.lossHistory, ...data.new_loss_points];
            if (newLoss.length > 1000) newLoss = newLoss.slice(newLoss.length - 1000);
          }

          let newReward = s.rewardHistory;
          if (Array.isArray(data.new_reward_points) && data.new_reward_points.length > 0) {
            newReward = [...s.rewardHistory, ...data.new_reward_points];
            if (newReward.length > 2000) newReward = newReward.slice(newReward.length - 2000);
          }

          // Handle multiplexed log events (Override #3)
          let newLogs = s.trainingLogs;
          if (data._log_event) {
            newLogs = [...s.trainingLogs, data._log_event];
            if (newLogs.length > 500) newLogs = newLogs.slice(newLogs.length - 500);
          }

          return {
            trainingProgress: newProgress,
            lossHistory: newLoss,
            rewardHistory: newReward,
            trainingLogs: newLogs,
          };
        }),

      resetTrainingData: () =>
        set({
          lossHistory: [],
          rewardHistory: [],
          trainingLogs: [],
          trainingProgress: {
            is_training: false,
            progress: 0,
            current_step: '',
            metrics: {},
            gan_epoch: 0,
            gan_total_epochs: 0,
            rl_episode: 0,
            rl_total_episodes: 0,
          },
        }),
    }),
    {
      name: 'ev-routing-preferences',
      // Only persist user preferences — not runtime data
      partialize: (state) => ({
        activeTab: state.activeTab,
        sidebarCollapsed: state.sidebarCollapsed,
        settings: state.settings,
      }),
    }
  )
);

// ─── Selector Hooks ───────────────────────────────────────
// Granular selectors prevent unnecessary re-renders.
// Components subscribe to ONLY the slice of state they need.

export const useRoadNetwork = () => useSystemStore((s) => s.roadNetwork);
export const useSetRoadNetwork = () => useSystemStore((s) => s.setRoadNetwork);

export const useStations = () => useSystemStore((s) => s.stations);
export const useSetStations = () => useSystemStore((s) => s.setStations);

export const useActiveTab = () => useSystemStore((s) => s.activeTab);
export const useSetActiveTab = () => useSystemStore((s) => s.setActiveTab);

export const useSidebarCollapsed = () => useSystemStore((s) => s.sidebarCollapsed);
export const useToggleSidebar = () => useSystemStore((s) => s.toggleSidebar);

export const useToasts = () => useSystemStore((s) => ({ toasts: s.toasts, addToast: s.addToast, removeToast: s.removeToast }));
export const useAddToast = () => useSystemStore((s) => s.addToast);

export const useSettings = () => useSystemStore((s) => s.settings);
export const useSetUnits = () => useSystemStore((s) => s.setUnits);
export const useSetAvoidTolls = () => useSystemStore((s) => s.setAvoidTolls);
export const useSetOptimizeBattery = () => useSystemStore((s) => s.setOptimizeBattery);
export const useSetNotifications = () => useSystemStore((s) => s.setNotifications);
export const useViewMode = () => useSystemStore((s) => s.settings.viewMode);
export const useSetViewMode = () => useSystemStore((s) => s.setViewMode);

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



// ─── Training Stream Selectors ────────────────────────────

export const useTrainingProgress = () => useSystemStore((s) => s.trainingProgress);
export const useLossHistory = () => useSystemStore((s) => s.lossHistory);
export const useRewardHistory = () => useSystemStore((s) => s.rewardHistory);
export const useTrainingLogs = () => useSystemStore((s) => s.trainingLogs);
export const useSSEConnected = () => useSystemStore((s) => s.sseConnected);
export const useUpdateTrainingFromSSE = () => useSystemStore((s) => s.updateTrainingFromSSE);
export const useSetSSEConnected = () => useSystemStore((s) => s.setSSEConnected);
export const useResetTrainingData = () => useSystemStore((s) => s.resetTrainingData);

