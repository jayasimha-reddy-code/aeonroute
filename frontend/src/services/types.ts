/**
 * Recharts-compatible analytics type interfaces.
 *
 * These MUST mirror the Pydantic models in backend/app/models/responses.py
 * to prevent schema drift (Architectural Override #5).
 */

// ── Recharts RadarChart ─────────────────────────────────
export interface RadarMetric {
  subject: string;
  A: number;
  fullMark: number;
}

// ── Recharts stacked BarChart ───────────────────────────
export interface EnergyBreakdown {
  time: string;
  solar: number;
  grid: number;
}

// ── Recharts AreaChart (training) ───────────────────────
export interface TrainingMetric {
  episode: number;
  loss: number;
  reward?: number;
}

// ── Recharts AreaChart (elevation) ──────────────────────
export interface ElevationPoint {
  distance_km: number;
  elevation_m: number;
}

// ── Training history response ───────────────────────────
export interface TrainingHistoryResponse {
  loss_history: Array<{ episode: number; loss: number }>;
  reward_history: Array<{ episode: number; reward: number }>;
  metrics: Record<string, unknown>;
}

// ── GAN evaluation response ─────────────────────────────
export interface GANEvaluation {
  status: 'not_trained' | 'model_exists' | 'evaluated';
  message?: string;
  hourly_correlation?: number;
  morning_peak_ratio?: number;
  evening_peak_ratio?: number;
  night_ratio?: number;
  quality_score?: number;
  generator_size_kb?: number;
  discriminator_size_kb?: number;
  metrics?: Array<Record<string, unknown>>;
}

// ── Agent performance response ──────────────────────────
export interface AgentPerformance {
  status: 'not_trained' | 'no_graph' | 'evaluated';
  message?: string;
  success_rate: number;
  avg_reward: number;
  avg_steps: number;
  episodes_evaluated: number;
  q_table_states?: number;
}

// ── Route evaluation response ───────────────────────────
export interface RouteEvaluation {
  status: 'no_graph' | 'no_routes' | 'evaluated';
  message?: string;
  avg_feasibility_rate: number;
  avg_distance_km: number;
  avg_energy_kwh: number;
  energy_improvement: number;
  routes_evaluated: number;
}

// ── Multiplexed SSE event types (Override #3) ───────────

export interface SSEMetricEvent {
  type: 'metric';
  episode: number;
  reward: number;
  loss: number;
  epsilon?: number;
}

export interface SSELogEvent {
  type: 'log';
  timestamp: string;
  message: string;
}

export interface SSEStatusEvent {
  type: 'status';
  phase: string;
  progress: number;
}

export type SSETrainingEvent = SSEMetricEvent | SSELogEvent | SSEStatusEvent;
