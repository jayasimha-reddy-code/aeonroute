import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';

// ─── Types ────────────────────────────────────────────────

export interface EdgeData {
  source: number;
  target: number;
  distance_km?: number;
  base_energy_kwh_per_km?: number;
  base_time_minutes?: number;
  road_type?: string;
}

export interface RoadNetworkBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface RoadNetworkData {
  nodes: number;
  edges: number;
  charging_stations: number[];
  nodes_pos: Record<string, { x: number; y: number }>;
  edges_list: EdgeData[];
  /** Present when data is real-world GeoJSON (Hyderabad) */
  bounds?: RoadNetworkBounds;
  /** GeoJSON FeatureCollection type indicator */
  type?: string;
  features?: GeoJSON.Feature[];
}

export interface StationData {
  id: number;
  name: string;
  lat: number;
  lon: number;
  graph_node_id: number;
  power_kw: number;
  num_ports: number;
  operator: string;
}

export interface EVState {
  battery_soc: number;
  current_node: number;
  battery_capacity_kwh?: number;
  time_minutes?: number;
}

export interface RouteRequest {
  source?: number;
  destination?: number;
  source_lat?: number;
  source_lon?: number;
  dest_lat?: number;
  dest_lon?: number;
  waypoints?: { lat?: number; lon?: number; node_id?: number }[];
  battery_soc?: number;
  battery_capacity_kwh?: number;
  ev_state?: EVState;
  num_candidates?: number;
  route_mode?: 'fast' | 'eco' | 'scenic';
  energy_weight?: number;
  vehicle_profile?: string;
}

export interface GeoJSONRouteProperties {
  distance_km: number;
  energy_kwh: number;
  time_minutes: number;
  battery_remaining_pct?: number;
  charging_stops?: { node_id: number; name: string; lat: number; lon: number }[];
  charging_stop_details?: Array<{ node_id: number; lat: number; lon: number; name: string; soc_at_arrival: number; charge_to_soc: number; charging_time_minutes: number; injected: boolean }>;
  charging_time_penalty_minutes?: number;
  battery_warning?: boolean;
  path_node_ids: number[];
  route_type: 'q_learning' | 'dijkstra' | 'multi_stop';
  segments?: { from_node: number; to_node: number; distance_km: number; cumulative_distance_km?: number; energy_kwh: number; mode_energy_kwh?: number; cumulative_energy_kwh?: number; road_type: string }[];
  legs?: { from: number; to: number; distance_km: number; energy_kwh: number; time_minutes: number; route_type: string }[];
  elevation_profile?: { distance_km: number; elevation_m: number }[];
  segment_boundaries_km?: number[];
  energy_weight?: number;
  mode_multiplier?: number;
  route_mode?: string;
}

export interface GeoJSONRoute {
  type: 'Feature';
  geometry: { type: 'LineString'; coordinates: [number, number][] };
  properties: GeoJSONRouteProperties;
}

export interface RouteResponse {
  route: GeoJSONRoute;
  alternatives: GeoJSONRoute[];
}

/** Legacy Route type for backward compat */
export interface Route {
  path: number[];
  distance_km: number;
  energy_kwh: number;
  time_minutes: number;
  feasibility_score: number;
  charging_stops: number[];
  /** Extended fields from GeoJSON backend */
  battery_remaining_pct?: number;
  route_type?: 'q_learning' | 'dijkstra' | 'multi_stop';
  charging_stop_details?: Array<{ node_id: number; lat: number; lon: number; name: string; soc_at_arrival: number; charge_to_soc: number; charging_time_minutes: number; injected: boolean }>;
  charging_time_penalty_minutes?: number;
  battery_warning?: boolean;
  geojson?: GeoJSONRoute;
  elevation_profile?: { distance_km: number; elevation_m: number }[];
}

export interface TrainingConfig {
  episodes?: number;
  learning_rate?: number;
  discount_factor?: number;
  max_steps?: number;
  /** Legacy fields (accepted but ignored by backend) */
  grid_size?: number;
  gan_epochs?: number;
  rl_episodes?: number;
  traffic_samples?: number;
  gan_batch_size?: number;
  rl_max_steps?: number;
}

export interface SystemConfig {
  osmnx_radius_meters: number;
  osmnx_radius_km: number;
  osmnx_center_lat: number;
  osmnx_center_lon: number;
  max_training_episodes: number;
}

export interface TrainingStatus {
  is_training: boolean;
  progress: number;
  current_step: string;
  metrics: Record<string, any>;
}

export interface SystemStats {
  road_network: { nodes: number; edges: number };
  models: {
    gan_trained: boolean;
    agent_trained: boolean;
    gnn_gan_trained: boolean;
    /** ISO-8601 UTC string — derived from training completion or Q-table file mtime */
    last_trained_at?: string | null;
    /** 0–1 success-rate or reward-normalised accuracy for Q-Learning agent */
    q_learning_accuracy?: number | null;
  };
  training_status: TrainingStatus;
}

export interface SystemHealth {
  cpu_percent: number | null;
  memory_percent: number | null;
  memory_used_gb: number | null;
  memory_total_gb: number | null;
  python_version: string | null;
  uptime_seconds: number | null;
}

export interface RouteMetrics {
  avg_distance_km: number;
  avg_energy_kwh: number;
  avg_time_minutes: number;
  avg_feasibility?: number;
  samples: number;
}

export interface HealthCheck {
  status: string;
  system_initialized: boolean;
  timestamp: string;
}

export interface ApiError {
  message: string;
  status: number;
  detail?: string;
}

export interface TemporalTrafficData {
  grid_size: number;
  time_steps: number;
  traffic: number[][];
}

// ─── API Client ───────────────────────────────────────────

// Empty string → uses Vite proxy in dev (/api/* → localhost:8000)
// Set VITE_API_URL to override (e.g. production backend)
const BASE_URL = import.meta.env.VITE_API_URL || '';

class APIClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: BASE_URL,
      timeout: 30000,
      headers: { 'Content-Type': 'application/json' },
    });

    // Request interceptor — attach request timestamp
    this.client.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        (config as any).__startTime = Date.now();
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor — unwrap envelope & normalize errors
    this.client.interceptors.response.use(
      (response) => {
        // Unwrap { ok, message, data } envelope from backend
        if (response.data && typeof response.data === 'object' && 'ok' in response.data) {
          response.data = response.data.data;
        }
        return response;
      },
      (error: AxiosError<{ detail?: any; error?: string; ok?: boolean; message?: string }>) => {
        const rd = error.response?.data;
        // Backend may nest structured error inside detail
        const msg =
          (typeof rd?.detail === 'object' ? rd.detail.message : rd?.detail) ??
          rd?.message ??
          rd?.error ??
          error.message ??
          'An unexpected error occurred';

        const apiError: ApiError = {
          message: msg,
          status: error.response?.status ?? 0,
          detail: typeof rd?.detail === 'string' ? rd.detail : undefined,
        };

        if (import.meta.env.DEV) {
          console.error(`[API Error] ${error.config?.method?.toUpperCase()} ${error.config?.url}`, apiError);
        }

        return Promise.reject(apiError);
      }
    );
  }

  // ─── Health ───────────────────────────────────────────

  async healthCheck(): Promise<HealthCheck> {
    return (await this.client.get('/health')).data;
  }

  // ─── Road Network ─────────────────────────────────────

  async getRoadNetwork(gridSize = 10): Promise<RoadNetworkData> {
    return (await this.client.get('/api/road-network', { params: { grid_size: gridSize } })).data;
  }

  // ─── Stations ─────────────────────────────────────────

  async getStations(): Promise<{ stations: StationData[]; count: number }> {
    return (await this.client.get('/api/stations')).data;
  }

  // ─── Routes ───────────────────────────────────────────

  async generateRoute(request: RouteRequest): Promise<RouteResponse> {
    return (await this.client.post('/api/generate-route', request)).data;
  }

  async saveRoute(request: RouteRequest): Promise<{ status: string }> {
    return (await this.client.post('/api/save-route', request)).data;
  }

  // ─── Traffic ──────────────────────────────────────────

  async getTrafficPatterns(timeStep = 12) {
    return (await this.client.get('/api/traffic-patterns', { params: { time_step: timeStep } })).data;
  }

  async getTemporalTraffic(): Promise<TemporalTrafficData> {
    return (await this.client.get('/api/traffic-patterns/temporal')).data;
  }

  // ─── Training ─────────────────────────────────────────

  async getTrainingStatus(): Promise<TrainingStatus> {
    return (await this.client.get('/api/training-status')).data;
  }

  async startTraining(config: TrainingConfig): Promise<{ status: string }> {
    return (await this.client.post('/api/start-training', config)).data;
  }

  async stopTraining(): Promise<{ status: string }> {
    return (await this.client.post('/api/stop-training')).data;
  }

  // ─── Metrics / Stats ─────────────────────────────────

  async getRouteMetrics(numSamples = 10): Promise<RouteMetrics> {
    return (await this.client.get('/api/route-metrics', { params: { num_samples: numSamples } })).data;
  }

  async getSystemStats(): Promise<SystemStats> {
    return (await this.client.get('/api/system-stats')).data;
  }

  async getSystemHealth(): Promise<SystemHealth> {
    return (await this.client.get('/api/system-health')).data;
  }

  // ─── Analytics Evaluation ─────────────────────────────

  async getGanEvaluation() {
    return (await this.client.get('/api/analytics/gan-evaluation')).data;
  }

  async getAgentPerformance() {
    return (await this.client.get('/api/analytics/agent-performance')).data;
  }

  async getRouteEvaluation() {
    return (await this.client.get('/api/analytics/route-evaluation')).data;
  }

  async getTrainingHistory() {
    return (await this.client.get('/api/analytics/training-history')).data;
  }

  // ─── System Config ────────────────────────────────────

  async getSystemConfig(): Promise<SystemConfig> {
    return (await this.client.get('/api/system/config')).data;
  }
}

const api = new APIClient();
export default api;

/**
 * Convert a GeoJSON route from the backend to the legacy Route interface
 * used by RouteCard, RouteLayer, useEVSimulation, etc.
 */
export function geoJSONRouteToLegacy(geojson: GeoJSONRoute): Route {
  const props = geojson.properties;
  return {
    path: props.path_node_ids,
    distance_km: props.distance_km,
    energy_kwh: props.energy_kwh,
    time_minutes: props.time_minutes,
    feasibility_score: props.battery_remaining_pct != null ? props.battery_remaining_pct / 100 : 0.8,
    charging_stops: (props.charging_stops ?? []).map(s => s.node_id),
    battery_remaining_pct: props.battery_remaining_pct,
    route_type: props.route_type,
    charging_stop_details: props.charging_stop_details && props.charging_stop_details.length > 0
      ? props.charging_stop_details
      : undefined,
    charging_time_penalty_minutes: props.charging_time_penalty_minutes,
    battery_warning: props.battery_warning,
    geojson,
    elevation_profile: props.elevation_profile,
  };
}

