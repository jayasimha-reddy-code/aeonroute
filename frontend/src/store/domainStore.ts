import { create } from 'zustand';
import { RoadNetworkData, Route, StationData } from '../services/api';

interface DomainState {
  roadNetwork: RoadNetworkData | null;
  setRoadNetwork: (network: RoadNetworkData) => void;

  stations: StationData[];
  setStations: (stations: StationData[]) => void;

  generatedRoutes: Route[];
  setGeneratedRoutes: (routes: Route[]) => void;
  selectedRoute: Route | null;
  setSelectedRoute: (route: Route | null) => void;

  currentEVState: {
    battery_soc: number;
    current_node: number;
    battery_capacity_kwh: number;
  };
  setEVState: (state: { battery_soc: number; current_node: number; battery_capacity_kwh: number }) => void;
}

export const useDomainStore = create<DomainState>((set) => ({
  roadNetwork: null,
  setRoadNetwork: (network) => set({ roadNetwork: network }),

  stations: [],
  setStations: (stations) => set({ stations }),

  generatedRoutes: [],
  setGeneratedRoutes: (routes) => set({ generatedRoutes: routes }),
  selectedRoute: null,
  setSelectedRoute: (route) => set({ selectedRoute: route }),

  currentEVState: {
    battery_soc: 80,
    current_node: 0,
    battery_capacity_kwh: 60,
  },
  setEVState: (state) => set({ currentEVState: state }),
}));
