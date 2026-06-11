from typing import Any, Dict, List, Optional
from pydantic import BaseModel
from fastapi import HTTPException


# ── Envelope ──────────────────────────────────────────────

class APIResponse(BaseModel):
    ok: bool = True
    message: str = "success"
    data: Any = None


# ── Health ────────────────────────────────────────────────

class HealthData(BaseModel):
    status: str
    system_initialized: bool
    timestamp: str


# ── Routes ────────────────────────────────────────────────

class RouteData(BaseModel):
    path: List[int]
    distance_km: float
    energy_kwh: float
    time_minutes: float
    feasibility_score: float
    charging_stops: List[Any] = []
    # AI metrics — present when using GNN/Hybrid/DQN modes
    ai_confidence: Optional[float] = None      # 0-100%
    gnn_score: Optional[float] = None          # 0-1 GNN route quality score
    scoring_breakdown: Optional[Dict] = None   # per-factor breakdown
    used_gnn: Optional[bool] = None
    ai_algorithm: Optional[str] = None         # algorithm that produced route

class RoutesResponse(BaseModel):
    routes: List[RouteData]
    count: int


# ── Route Metrics ─────────────────────────────────────────

class MetricsData(BaseModel):
    avg_distance_km: float
    avg_energy_kwh: float
    avg_time_minutes: float
    avg_feasibility: float
    samples: int


# ── Recharts-compatible analytics models (Override #5) ────

class RadarMetric(BaseModel):
    """Consumed directly by Recharts <RadarChart>."""
    subject: str
    A: float
    fullMark: float

class EnergyBreakdown(BaseModel):
    """Consumed by stacked Recharts <BarChart>."""
    time: str
    solar: float
    grid: float

class TrainingMetric(BaseModel):
    """Consumed by Recharts <AreaChart> for training history."""
    episode: int
    loss: float
    reward: Optional[float] = None

class ElevationPoint(BaseModel):
    """Consumed by Recharts <AreaChart> for route elevation."""
    distance_km: float
    elevation_m: float

class TrainingHistoryResponse(BaseModel):
    """Training history with Recharts-compatible arrays."""
    loss_history: List[Dict[str, Any]]
    reward_history: List[Dict[str, Any]]
    metrics: Dict[str, Any] = {}


# ── Model Status ──────────────────────────────────────────

class ModelStatusResponse(BaseModel):
    """Status of all AI models in the system."""
    q_table_trained: bool
    q_table_states: Optional[int] = None
    dqn_trained: bool
    gnn_loaded: bool
    sg_gan_loaded: bool
    gnn_model_dir: Optional[str] = None
    has_tensorflow: bool
    gnn_is_ready: bool


# ── Routing Modes ─────────────────────────────────────────

class RoutingModeInfo(BaseModel):
    """Info about a single routing mode."""
    mode: str
    label: str
    description: str
    category: str  # "classic" | "ai"
    available: bool
    color: str

class RoutingModesResponse(BaseModel):
    modes: List[RoutingModeInfo]
    count: int


# ── Evaluation / Benchmark ────────────────────────────────

class AlgorithmResult(BaseModel):
    algorithm: str
    success_rate: float
    avg_distance_km: float
    avg_energy_kwh: float
    avg_time_minutes: float
    avg_computation_ms: float
    num_samples: int

class EvaluationResponse(BaseModel):
    results: List[AlgorithmResult]
    comparison_table: List[Dict[str, Any]]
    evaluated_at: str

class BenchmarkResponse(BaseModel):
    status: str  # "started" | "running" | "complete" | "error"
    task_id: Optional[str] = None
    message: Optional[str] = None
    results: Optional[List[AlgorithmResult]] = None
    csv_path: Optional[str] = None


# ── Envelope helpers ──────────────────────────────────────

def ok(data: Any = None, message: str = "success") -> Dict[str, Any]:
    return {"ok": True, "message": message, "data": data}

def fail(message: str, code: int = 400, detail: Any = None):
    content: Dict[str, Any] = {"ok": False, "message": message}
    if detail is not None:
        content["detail"] = detail
    raise HTTPException(status_code=code, detail=content)

