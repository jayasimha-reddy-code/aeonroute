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

export interface RoadNetworkData {
  nodes: number;
  edges: number;
  charging_stations: number[];
  nodes_pos: Record<string, { x: number; y: number }>;
  edges_list: EdgeData[];
}

export interface EVState {
  battery_soc: number;
  current_node: number;
  battery_capacity_kwh?: number;
  time_minutes?: number;
}

export interface RouteRequest {
  source: number;
  destination: number;
  ev_state: EVState;
  num_candidates: number;
}

export interface Route {
  path: number[];
  distance_km: number;
  energy_kwh: number;
  time_minutes: number;
  feasibility_score: number;
  charging_stops: number[];
}

export interface TrainingConfig {
  grid_size: number;
  gan_epochs: number;
  rl_episodes: number;
  traffic_samples: number;
  gan_batch_size: number;
  rl_max_steps: number;
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

  // ─── Routes ───────────────────────────────────────────

  async generateRoute(request: RouteRequest): Promise<{ routes: Route[]; count: number }> {
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
}

const api = new APIClient();
export default api;

