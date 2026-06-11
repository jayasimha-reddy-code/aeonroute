import { SystemStats, RouteMetrics, SystemHealth, RouteResponse } from './api';

export const mockSystemHealth: SystemHealth = {
  cpu_percent: 45.2,
  memory_percent: 62.4,
  memory_used_gb: 12.4,
  memory_total_gb: 16.0,
  python_version: '3.10.12',
  uptime_seconds: 3600 * 24 * 7 + 12400, // 7 days, 3.4 hours
};

export const mockSystemStats: SystemStats = {
  road_network: { nodes: 15420, edges: 38910 },
  models: {
    gan_trained: true,
    agent_trained: true,
    gnn_gan_trained: false,
    last_trained_at: new Date(Date.now() - 3600000 * 24).toISOString(), 
    q_learning_accuracy: 0.94,
  },
  training_status: {
    is_training: false,
    progress: 100,
    current_step: 'Completed',
    metrics: { 'final_reward': 45.2, 'episodes': 1000 }
  }
};

export const mockRouteMetrics: RouteMetrics = {
  avg_distance_km: 12.4,
  avg_energy_kwh: 2.1,
  avg_time_minutes: 24.5,
  avg_feasibility: 0.98,
  samples: 1420
};

export const mockRouteResponse: RouteResponse = {
  route: {
    type: 'Feature',
    geometry: { type: 'LineString', coordinates: [[78.38, 17.44], [78.39, 17.43], [78.40, 17.44]] },
    properties: {
      distance_km: 14.5,
      energy_kwh: 2.3,
      time_minutes: 32,
      battery_remaining_pct: 68,
      charging_stops: [],
      charging_stop_details: [],
      charging_time_penalty_minutes: 0,
      battery_warning: false,
      path_node_ids: [1, 2, 3],
      route_type: 'q_learning',
      elevation_profile: [{ distance_km: 0, elevation_m: 540 }, { distance_km: 7, elevation_m: 560 }, { distance_km: 14.5, elevation_m: 530 }],
      segment_boundaries_km: [0, 7, 14.5],
      energy_weight: 0.18,
      mode_multiplier: 1.0,
      route_mode: 'fast'
    }
  },
  alternatives: []
};

export const mockGanEvaluation = {
  status: 'trained',
  metrics: { mse: 0.02, mae: 0.15, r2_score: 0.89 },
  sample_comparison: [
    { target: 0.5, predicted: 0.48 },
    { target: 0.8, predicted: 0.81 },
    { target: 0.2, predicted: 0.22 },
  ]
};

export const mockAgentPerformance = {
  status: 'trained',
  success_rate: 0.96,
  avg_reward: 42.5,
  avg_steps: 120,
};

export const mockRouteEvaluation = {
  status: 'trained',
  avg_time_saved_pct: 12.4,
  avg_energy_saved_pct: 8.2,
};

export const mockTrainingHistory = {
  loss_history: Array.from({ length: 50 }, (_, i) => ({
    epoch: i,
    g_loss: Math.max(0.1, 2.0 * Math.exp(-i / 10) + Math.random() * 0.1),
    d_loss_real: Math.max(0.2, 0.8 * Math.exp(-i / 20) + Math.random() * 0.05),
  })),
  reward_history: Array.from({ length: 100 }, (_, i) => ({
    episode: i * 10,
    reward: -100 + (200 * (1 - Math.exp(-i / 20))) + Math.random() * 10
  })),
  metrics: { final_reward: 98.4, total_time_minutes: 45 }
};

export const mockStations = {
  stations: [
    { id: 1, name: 'Hitec City Supercharger', lat: 17.4435, lon: 78.3800, graph_node_id: 101, power_kw: 150, num_ports: 4, operator: 'Tesla' },
    { id: 2, name: 'Kondapur Fast Charge', lat: 17.4610, lon: 78.3580, graph_node_id: 102, power_kw: 50, num_ports: 2, operator: 'ChargePoint' },
    { id: 3, name: 'Gachibowli Electrify', lat: 17.4400, lon: 78.3489, graph_node_id: 103, power_kw: 250, num_ports: 6, operator: 'Electrify America' },
  ],
  count: 3
};

export const mockSystemConfig = {
  osmnx_radius_meters: 10000,
  osmnx_radius_km: 10,
  osmnx_center_lat: 17.44,
  osmnx_center_lon: 78.38,
  max_training_episodes: 1000
};
