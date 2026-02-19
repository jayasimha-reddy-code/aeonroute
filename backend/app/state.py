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
    road_network_cache: TTLCache = field(default_factory=lambda: TTLCache(maxsize=16, ttl=300))
    system_stats_cache: TTLCache = field(default_factory=lambda: TTLCache(maxsize=1, ttl=10))

_state = AppState()

def get_state() -> AppState:
    return _state

def reset_state() -> None:
    global _state
    _state = AppState()
