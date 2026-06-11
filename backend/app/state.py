from dataclasses import dataclass, field
from typing import Optional, Any, Dict, List
from cachetools import TTLCache
from typing import TYPE_CHECKING
if TYPE_CHECKING:
    from src.main import EVRoutingSystem
    from backend.app.services.graph_service import HyderabadGraph

@dataclass
class AppState:
    system: Optional[Any] = None  # EVRoutingSystem instance (legacy)
    hyderabad_graph: Optional[Any] = None  # HyderabadGraph instance
    charging_stations: List[Dict[str, Any]] = field(default_factory=list)
    q_table: Optional[Dict] = None  # Trained Q-table
    gnn_service: Optional[Any] = None  # GNNRoutingService singleton
    dqn_model: Optional[Any] = None  # Loaded DQN model (keras.Model or None)
    gnn_graph_data: Optional[Dict] = None  # Pre-computed GNN graph tensors
    spatial_index: Optional[Any] = None  # StationSpatialIndex for O(log n) nearest-station lookup
    training_status: Dict[str, Any] = field(default_factory=lambda: {
        "is_training": False,
        "progress": 0,
        "current_step": "",
        "metrics": {},
        "loss_history": [],
        "reward_history": [],
        "rl_episode": 0,
        "rl_total_episodes": 0,
    })
    benchmark_status: Dict[str, Any] = field(default_factory=lambda: {
        "running": False,
        "task_id": None,
        "results": None,
        "csv_path": None,
        "error": None,
        "started_at": None,
        "completed_at": None,
    })
    road_network_cache: TTLCache = field(default_factory=lambda: TTLCache(maxsize=16, ttl=300))
    system_stats_cache: TTLCache = field(default_factory=lambda: TTLCache(maxsize=1, ttl=10))

_state = AppState()

def get_state() -> AppState:
    return _state

def reset_state() -> None:
    global _state
    _state = AppState()
