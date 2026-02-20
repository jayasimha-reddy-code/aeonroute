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


# ── Envelope helpers ──────────────────────────────────────

def ok(data: Any = None, message: str = "success") -> Dict[str, Any]:
    return {"ok": True, "message": message, "data": data}

def fail(message: str, code: int = 400, detail: Any = None):
    content: Dict[str, Any] = {"ok": False, "message": message}
    if detail is not None:
        content["detail"] = detail
    raise HTTPException(status_code=code, detail=content)
