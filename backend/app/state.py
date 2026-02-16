from dataclasses import dataclass, field
from typing import Optional, Any, Dict
from cachetools import TTLCache
from typing import TYPE_CHECKING
if TYPE_CHECKING:
    from src.main import EVRoutingSystem

@dataclass
class AppState:
    system: Optional[Any] = None  # EVRoutingSystem instance
    training_status: Dict[str, Any] = field(default_factory=lambda: {
        "is_training": False,
        "progress": 0,
        "current_step": "",
        "metrics": {},
    })
    road_network_cache: TTLCache = field(default_factory=lambda: TTLCache(maxsize=16, ttl=300))
    system_stats_cache: TTLCache = field(default_factory=lambda: TTLCache(maxsize=1, ttl=10))

_state = AppState()

def get_state() -> AppState:
    return _state

def reset_state() -> None:
    global _state
    _state = AppState()
