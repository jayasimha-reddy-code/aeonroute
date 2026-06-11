from pydantic import BaseModel, Field, field_validator
from typing import Optional, List

# Valid routing modes (mirrors backend/app/services/route_strategy.py RoutingMode)
_VALID_ROUTE_MODES = {
    "fast", "eco", "scenic", "dijkstra", "astar", "q_learning",
    "dqn", "gnn", "hybrid",
}


class Coordinate(BaseModel):
    lat: Optional[float] = None
    lon: Optional[float] = None
    node_id: Optional[int] = None


class EVStateRequest(BaseModel):
    battery_soc: float = Field(..., ge=0, le=100, description="State of charge (0-100%)")
    current_node: int = Field(..., ge=0, le=999999, description="Current node ID")
    battery_capacity_kwh: float = Field(60, gt=0, le=500, description="Battery capacity in kWh")
    time_minutes: int = Field(480, ge=0, le=1440, description="Current time of day in minutes")

class RouteRequest(BaseModel):
    source: Optional[int] = Field(None, ge=0, description="Source node ID")
    destination: Optional[int] = Field(None, ge=0, description="Destination node ID")
    source_lat: Optional[float] = Field(None, description="Source latitude")
    source_lon: Optional[float] = Field(None, description="Source longitude")
    dest_lat: Optional[float] = Field(None, description="Destination latitude")
    dest_lon: Optional[float] = Field(None, description="Destination longitude")
    waypoints: Optional[List[Coordinate]] = Field(None, description="Ordered list of waypoints for multi-stop routes")
    battery_soc: float = Field(80.0, ge=0, le=100, description="Battery SOC %")
    battery_capacity_kwh: float = Field(60.0, gt=0, le=500, description="Battery capacity kWh")
    ev_state: Optional[EVStateRequest] = None
    num_candidates: int = Field(3, ge=1, le=10, description="Number of candidate routes")
    route_mode: Optional[str] = Field(
        "fast",
        description=(
            "Routing mode: fast (Q-Learning/Dijkstra), eco (energy-efficient), scenic (residential roads), "
            "dijkstra (pure Dijkstra), astar (A* heuristic), q_learning (force Q-learning), "
            "dqn (Deep Q-Network), gnn (Graph Neural Network), hybrid (multi-algo + GNN ranking)"
        )
    )
    energy_weight: Optional[float] = Field(None, ge=0.01, le=5.0, description="Energy consumption kWh/km (default 0.18)")

    @field_validator("route_mode")
    @classmethod
    def validate_route_mode(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in _VALID_ROUTE_MODES:
            raise ValueError(f"route_mode must be one of {sorted(_VALID_ROUTE_MODES)}, got {v!r}")
        return v

class TrainingConfig(BaseModel):
    episodes: int = Field(200, ge=10, le=5000, description="Q-Learning episodes")
    learning_rate: float = Field(0.1, ge=0.001, le=1.0, description="Learning rate")
    discount_factor: float = Field(0.95, ge=0.5, le=0.99, description="Discount factor")
    max_steps: int = Field(300, ge=50, le=1000, description="Max steps per episode")
    training_mode: str = Field("q_learning", description="Training mode: q_learning or dqn")
    # Legacy fields (ignored but accepted for backward compat)
    grid_size: int = Field(10, ge=3, le=50)
    gan_epochs: int = Field(100, ge=1, le=1000)
    rl_episodes: int = Field(500, ge=1, le=5000)
    traffic_samples: int = Field(500, ge=10, le=5000)
    gan_batch_size: int = Field(32, ge=1, le=256)
    rl_max_steps: int = Field(200, ge=10, le=1000)
    demo_mode: bool = Field(False, description="Fast training (fewer episodes)")


class EvaluationRequest(BaseModel):
    algorithms: Optional[List[str]] = Field(
        None,
        description="Algorithms to evaluate. If None, evaluates all available.",
    )
    num_samples: int = Field(20, ge=1, le=500, description="Number of random route samples for evaluation")
    source_node: Optional[int] = Field(None, description="Fixed source node (random if None)")
    dest_node: Optional[int] = Field(None, description="Fixed destination node (random if None)")


class BenchmarkRequest(BaseModel):
    num_routes: int = Field(100, ge=10, le=1000, description="Number of random routes to benchmark")
    algorithms: Optional[List[str]] = Field(None, description="Algorithms to include. None = all.")
    output_csv: bool = Field(True, description="Save results to CSV")
