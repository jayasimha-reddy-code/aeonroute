from typing import Any, Dict, List
from pydantic import BaseModel
from fastapi import HTTPException

class APIResponse(BaseModel):
    ok: bool = True
    message: str = "success"
    data: Any = None

class HealthData(BaseModel):
    status: str
    system_initialized: bool
    timestamp: str

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

class MetricsData(BaseModel):
    avg_distance_km: float
    avg_energy_kwh: float
    avg_time_minutes: float
    avg_feasibility: float
    samples: int

def ok(data: Any = None, message: str = "success") -> Dict[str, Any]:
    return {"ok": True, "message": message, "data": data}

def fail(message: str, code: int = 400, detail: Any = None):
    content: Dict[str, Any] = {"ok": False, "message": message}
    if detail is not None:
        content["detail"] = detail
    raise HTTPException(status_code=code, detail=content)
