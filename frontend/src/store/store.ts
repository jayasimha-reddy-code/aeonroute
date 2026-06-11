import { useUIStore } from './uiStore';
import { useSettingsStore } from './settingsStore';
import { useDomainStore } from './domainStore';
import { useTrainingStore } from './trainingStore';

// Export types from the separate stores
export * from './uiStore';
export * from './settingsStore';
export * from './domainStore';
export * from './trainingStore';

// Polyfill for legacy component usages to prevent massive refactoring of imports
export const useSystemStore = Object.assign(
  (selector?: (state: any) => any) => {
    const ui = useUIStore();
    const settings = useSettingsStore();
    const domain = useDomainStore();
    const training = useTrainingStore();

    const combined = { ...ui, ...settings, ...domain, ...training };
    return selector ? selector(combined) : combined;
  },
  {
    getState: () => ({
      ...useUIStore.getState(),
      ...useSettingsStore.getState(),
      ...useDomainStore.getState(),
      ...useTrainingStore.getState(),
    }),
    setState: (partial: any) => {
      useUIStore.setState(partial);
      useSettingsStore.setState(partial);
      useDomainStore.setState(partial);
      useTrainingStore.setState(partial);
    }
  }
);

// ─── Legacy Selector Hooks ───────────────────────────────────────
export const useRoadNetwork = () => useDomainStore((s) => s.roadNetwork);
export const useSetRoadNetwork = () => useDomainStore((s) => s.setRoadNetwork);

export const useStations = () => useDomainStore((s) => s.stations);
export const useSetStations = () => useDomainStore((s) => s.setStations);

export const useActiveTab = () => useUIStore((s) => s.activeTab);
export const useSetActiveTab = () => useUIStore((s) => s.setActiveTab);

export const useSidebarCollapsed = () => useUIStore((s) => s.sidebarCollapsed);
export const useToggleSidebar = () => useUIStore((s) => s.toggleSidebar);

export const useToasts = () => useUIStore((s) => ({ toasts: s.toasts, addToast: s.addToast, removeToast: s.removeToast }));
export const useAddToast = () => useUIStore((s) => s.addToast);

export const useSettings = () => useSettingsStore((s) => s.settings);
export const useSetUnits = () => useSettingsStore((s) => s.setUnits);
export const useSetAvoidTolls = () => useSettingsStore((s) => s.setAvoidTolls);
export const useSetOptimizeBattery = () => useSettingsStore((s) => s.setOptimizeBattery);
export const useSetNotifications = () => useSettingsStore((s) => s.setNotifications);
export const useViewMode = () => useSettingsStore((s) => s.settings.viewMode);
export const useSetViewMode = () => useSettingsStore((s) => s.setViewMode);
export const useEnergyWeight = () => useSettingsStore((s) => s.settings.energyWeight);
export const useSimulationScale = () => useSettingsStore((s) => s.settings.simulationScale);
export const useVehicleProfile = () => useSettingsStore((s) => s.settings.vehicleProfile);
export const useBatteryCapacity = () => useSettingsStore((s) => s.settings.batteryCapacity);
export const useSetEnergyWeight = () => useSettingsStore((s) => s.setEnergyWeight);
export const useSetSimulationScale = () => useSettingsStore((s) => s.setSimulationScale);
export const useSetVehicleProfile = () => useSettingsStore((s) => s.setVehicleProfile);
export const useSetBatteryCapacity = () => useSettingsStore((s) => s.setBatteryCapacity);

export const useRoutes = () => useDomainStore((s) => ({
  generatedRoutes: s.generatedRoutes,
  setGeneratedRoutes: s.setGeneratedRoutes,
  selectedRoute: s.selectedRoute,
  setSelectedRoute: s.setSelectedRoute,
}));

export const useEVState = () => useDomainStore((s) => ({
  currentEVState: s.currentEVState,
  setEVState: s.setEVState,
}));

export const useLoading = () => useUIStore((s) => ({
  isLoading: s.isLoading,
  setIsLoading: s.setIsLoading,
}));

export const useTrainingProgress = () => useTrainingStore((s) => s.trainingProgress);
export const useLossHistory = () => useTrainingStore((s) => s.lossHistory);
export const useRewardHistory = () => useTrainingStore((s) => s.rewardHistory);
export const useTrainingLogs = () => useTrainingStore((s) => s.trainingLogs);
export const useSSEConnected = () => useTrainingStore((s) => s.sseConnected);
export const useUpdateTrainingFromSSE = () => useTrainingStore((s) => s.updateTrainingFromSSE);
export const useSetSSEConnected = () => useTrainingStore((s) => s.setSSEConnected);
export const useResetTrainingData = () => useTrainingStore((s) => s.resetTrainingData);

export const useActivityLog = () => useUIStore((s) => s.activityLog);
export const useAddActivity = () => useUIStore((s) => s.addActivity);
