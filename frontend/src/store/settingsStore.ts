import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type UnitSystem = 'metric' | 'imperial';
export type ViewMode = 'grid' | 'list';
export type SimulationScale = 'light' | 'standard' | 'full';

export interface UserSettings {
  units: UnitSystem;
  avoidTolls: boolean;
  optimizeBattery: boolean;
  notifications: boolean;
  viewMode: ViewMode;
  energyWeight: number;       // kWh/km — 0.10 to 0.30
  simulationScale: SimulationScale;
  vehicleProfile: string;
  batteryCapacity: number;    // kWh
}

interface SettingsState {
  settings: UserSettings;
  setUnits: (units: UnitSystem) => void;
  setAvoidTolls: (avoid: boolean) => void;
  setOptimizeBattery: (optimize: boolean) => void;
  setNotifications: (enabled: boolean) => void;
  setViewMode: (mode: ViewMode) => void;
  setEnergyWeight: (weight: number) => void;
  setSimulationScale: (scale: SimulationScale) => void;
  setVehicleProfile: (profile: string) => void;
  setBatteryCapacity: (capacity: number) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      settings: {
        units: 'metric',
        avoidTolls: false,
        optimizeBattery: true,
        notifications: true,
        viewMode: 'grid',
        energyWeight: 0.18,
        simulationScale: 'standard',
        vehicleProfile: 'tesla_model_3_lr',
        batteryCapacity: 82,
      },
      setUnits: (units) => set((s) => ({ settings: { ...s.settings, units } })),
      setAvoidTolls: (avoidTolls) => set((s) => ({ settings: { ...s.settings, avoidTolls } })),
      setOptimizeBattery: (optimizeBattery) => set((s) => ({ settings: { ...s.settings, optimizeBattery } })),
      setNotifications: (notifications) => set((s) => ({ settings: { ...s.settings, notifications } })),
      setViewMode: (viewMode) => set((s) => ({ settings: { ...s.settings, viewMode } })),
      setEnergyWeight: (energyWeight) => set((s) => ({ settings: { ...s.settings, energyWeight } })),
      setSimulationScale: (simulationScale) => set((s) => ({ settings: { ...s.settings, simulationScale } })),
      setVehicleProfile: (vehicleProfile) => set((s) => ({ settings: { ...s.settings, vehicleProfile } })),
      setBatteryCapacity: (batteryCapacity) => set((s) => ({ settings: { ...s.settings, batteryCapacity } })),
    }),
    {
      name: 'ev-routing-settings',
      merge: (persisted, current) => {
        const merged = { ...current, ...(persisted as any) };
        merged.settings = { ...current.settings, ...((persisted as any)?.settings ?? {}) };
        return merged;
      },
    }
  )
);
