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
  battery_soc?: number;
  battery_capacity_kwh?: number;
  ev_state?: EVState;
  num_candidates?: number;
}

export interface GeoJSONRouteProperties {
  distance_km: number;
  energy_kwh: number;
  time_minutes: number;
  battery_remaining_pct?: number;
  charging_stops?: { node_id: number; name: string; lat: number; lon: number }[];
  path_node_ids: number[];
  route_type: 'q_learning' | 'dijkstra';
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
  route_type?: 'q_learning' | 'dijkstra';
  charging_stop_details?: { node_id: number; name: string; lat: number; lon: number }[];
  geojson?: GeoJSONRoute;
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
  };
  training_status: TrainingStatus;
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

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

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

