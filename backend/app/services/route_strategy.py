"""Route Strategy Framework — RoutingMode enum and RouteStrategyManager.

Replaces the ad-hoc if/elif chain in routing_service.py with a clean
strategy pattern, enabling extensible algorithm dispatch.

Routing Modes:
  Classic:
    fast      → Q-Learning → Dijkstra fallback
    eco       → Energy-weighted Dijkstra
    scenic    → Scenic-weighted Dijkstra (prefer residential roads)
    dijkstra  → Pure Dijkstra (shortest path by length)
    astar     → A* with haversine heuristic
    q_learning → Force Q-learning only (no Dijkstra fallback)
  Advanced:
    dqn       → Deep Q-Network routing
    gnn       → GNN-scored candidate routing
    hybrid    → Multi-algorithm candidate generation + GNN ranking
"""

from __future__ import annotations

import logging
import math
from enum import Enum
from typing import Any, Dict, List, Optional

import networkx as nx

logger = logging.getLogger("ev_routing")


# ─────────────────────────────────────────────────────────────────────────────
# Routing Mode Enum
# ─────────────────────────────────────────────────────────────────────────────


class RoutingMode(str, Enum):
    """All supported routing modes, usable as string values in API requests."""

    # Classic algorithms (always available)
    FAST = "fast"           # Q-Learning → Dijkstra fallback
    ECO = "eco"             # Energy-weighted Dijkstra
    SCENIC = "scenic"       # Scenic-weighted Dijkstra
    DIJKSTRA = "dijkstra"   # Pure Dijkstra
    ASTAR = "astar"         # A* with haversine heuristic
    Q_LEARNING = "q_learning"  # Force Q-learning (no fallback)

    # Optimized modes
    DQN = "dqn"             # Deep Q-Network
    GNN = "gnn"             # GNN-scored routing
    HYBRID = "hybrid"       # Multi-algorithm + GNN ranking


# ─────────────────────────────────────────────────────────────────────────────
# Mode Metadata
# ─────────────────────────────────────────────────────────────────────────────

ROUTING_MODE_INFO: Dict[RoutingMode, Dict[str, Any]] = {
    RoutingMode.FAST: {
        "label": "Fastest",
        "description": "Q-Learning optimized routing with Dijkstra fallback",
        "category": "classic",
        "requires_model": False,
        "color": "#3b82f6",
    },
    RoutingMode.ECO: {
        "label": "Eco",
        "description": "Energy-efficient routing — minimizes battery consumption",
        "category": "classic",
        "requires_model": False,
        "color": "#10b981",
    },
    RoutingMode.SCENIC: {
        "label": "Scenic",
        "description": "Prefers residential and secondary roads over motorways",
        "category": "classic",
        "requires_model": False,
        "color": "#a855f7",
    },
    RoutingMode.DIJKSTRA: {
        "label": "Dijkstra",
        "description": "Classic shortest-path by road length",
        "category": "classic",
        "requires_model": False,
        "color": "#6366f1",
    },
    RoutingMode.ASTAR: {
        "label": "A*",
        "description": "A* algorithm with haversine distance heuristic",
        "category": "classic",
        "requires_model": False,
        "color": "#8b5cf6",
    },
    RoutingMode.Q_LEARNING: {
        "label": "Q-Learning",
        "description": "Tabular Q-Learning — requires trained Q-table",
        "category": "classic",
        "requires_model": True,
        "color": "#f59e0b",
    },
    RoutingMode.DQN: {
        "label": "DQN",
        "description": "Deep Q-Network — neural network approximates Q-function for large state spaces",
        "category": "ai",
        "requires_model": True,
        "color": "#ef4444",
    },
    RoutingMode.GNN: {
        "label": "GNN",
        "description": "Graph Neural Network scoring — spatially-aware traffic prediction",
        "category": "ai",
        "requires_model": False,  # Falls back to heuristic if not trained
        "color": "#ec4899",
    },
    RoutingMode.HYBRID: {
        "label": "Hybrid AI",
        "description": "Multi-algorithm candidate generation + GNN ranking — best of all worlds",
        "category": "ai",
        "requires_model": False,  # Graceful degradation
        "color": "#14b8a6",
    },
}


def get_available_modes(state: Any) -> List[Dict[str, Any]]:
    """Return all routing modes with availability flags based on current AppState.

    A mode is 'available' if:
      - requires_model=False, OR
      - the required model is loaded in AppState
    """
    modes = []
    has_q_table = state.q_table is not None
    has_gnn = state.gnn_service is not None

    for mode, info in ROUTING_MODE_INFO.items():
        available = True
        if mode == RoutingMode.Q_LEARNING and not has_q_table:
            available = False
        elif mode == RoutingMode.DQN and state.dqn_model is None:
            available = False  # DQN needs a trained model
        # GNN and Hybrid work with heuristic fallback, so always "available"

        modes.append({
            "mode": mode.value,
            "label": info["label"],
            "description": info["description"],
            "category": info["category"],
            "available": available,
            "color": info["color"],
        })
    return modes


# ─────────────────────────────────────────────────────────────────────────────
# A* heuristic
# ─────────────────────────────────────────────────────────────────────────────

def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Haversine great-circle distance in km."""
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    return R * 2 * math.asin(math.sqrt(a))


def _astar_route(hg: Any, source: int, dest: int) -> Optional[List[int]]:
    """A* route using haversine heuristic on lat/lon positions."""
    src_osm = hg.idx_to_osm(source)
    dst_osm = hg.idx_to_osm(dest)
    if src_osm == -1 or dst_osm == -1:
        return None

    dst_pos = hg.get_node_pos(dest)
    dst_lat = dst_pos["y"]
    dst_lon = dst_pos["x"]

    def heuristic(u_osm: int, _v_osm: int) -> float:
        # u_osm is the OSM node ID — convert to idx to get position
        u_idx = hg.osm_to_idx(u_osm)
        if u_idx == -1:
            return 0.0
        pos = hg.get_node_pos(u_idx)
        return _haversine_km(pos["y"], pos["x"], dst_lat, dst_lon) * 1000  # metres

    try:
        osm_path = nx.astar_path(hg.graph, src_osm, dst_osm, heuristic=heuristic, weight="length")
        return [hg.osm_to_idx(n) for n in osm_path]
    except (nx.NetworkXNoPath, nx.NodeNotFound):
        return None
