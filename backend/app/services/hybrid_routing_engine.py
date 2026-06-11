"""Hybrid AI Routing Engine — multi-algorithm candidate generation + GNN ranking.

4-step workflow:
  1. Generate Candidates: Dijkstra (standard + eco-weighted), A*, Q-learning → 3-5 routes
  2. GNN Evaluation:      For each candidate, score via GNNRoutingService
  3. Composite Scoring:   Weighted combination of distance, energy, time, GNN, feasibility
  4. Ranking:             Return routes sorted best-first, with full AI metrics

Graceful Degradation:
  If the GNN model is not trained, scoring falls back to heuristic evaluation
  (energy efficiency ratio, path directness, charging feasibility).

Academic Justification:
  No single algorithm dominates across all objectives. Classical algorithms provide
  reliable shortest/eco paths; the GNN adds spatially-aware traffic intelligence.
  Combining them produces routes that are simultaneously reliable and smart.
"""

from __future__ import annotations

import logging
import os
import pickle
from typing import Any, Dict, List, Optional, Tuple

import networkx as nx

from backend.app.state import AppState

logger = logging.getLogger("ev_routing")

_Q_TABLE_PATH = "models/q_learning/q_table_hyderabad.pkl"

# Composite scoring weights (sum to 1.0)
_WEIGHT_DISTANCE = 0.20
_WEIGHT_ENERGY = 0.30
_WEIGHT_TIME = 0.15
_WEIGHT_GNN = 0.25
_WEIGHT_FEASIBILITY = 0.10


# ─────────────────────────────────────────────────────────────────────────────
# Candidate Generation Helpers
# ─────────────────────────────────────────────────────────────────────────────


def _dijkstra_route(hg: Any, source: int, dest: int) -> Optional[List[int]]:
    src_osm = hg.idx_to_osm(source)
    dst_osm = hg.idx_to_osm(dest)
    if src_osm == -1 or dst_osm == -1:
        return None
    try:
        path = nx.shortest_path(hg.graph, src_osm, dst_osm, weight="length")
        return [hg.osm_to_idx(n) for n in path]
    except (nx.NetworkXNoPath, nx.NodeNotFound):
        return None


def _eco_weight(u: int, v: int, d: Dict) -> float:
    return max(d.get("length", 100.0) * 0.18 / 1000.0, 1e-6)


def _dijkstra_eco_route(hg: Any, source: int, dest: int) -> Optional[List[int]]:
    src_osm = hg.idx_to_osm(source)
    dst_osm = hg.idx_to_osm(dest)
    if src_osm == -1 or dst_osm == -1:
        return None
    try:
        path = nx.shortest_path(hg.graph, src_osm, dst_osm, weight=_eco_weight)
        return [hg.osm_to_idx(n) for n in path]
    except (nx.NetworkXNoPath, nx.NodeNotFound):
        return None


def _q_learning_route(hg: Any, source: int, dest: int, q_table: Dict) -> Optional[List[int]]:
    """Greedy Q-table exploitation."""
    import numpy as np
    path = [source]
    current = source
    visited = {source}
    for _ in range(min(hg.num_nodes, 500)):
        if current == dest:
            return path
        neighbors = hg.get_neighbors(current)
        if not neighbors:
            break
        key = (current,)
        if key not in q_table:
            break
        q_vals = q_table[key]
        sorted_actions = np.argsort(q_vals)[::-1]
        moved = False
        for action in sorted_actions:
            if action < len(neighbors):
                nxt = neighbors[action]
                if nxt not in visited or nxt == dest:
                    current = nxt
                    path.append(current)
                    visited.add(current)
                    moved = True
                    break
        if not moved:
            break
    return path if current == dest else None


def _astar_route(hg: Any, source: int, dest: int) -> Optional[List[int]]:
    """A* with haversine heuristic."""
    import math
    src_osm = hg.idx_to_osm(source)
    dst_osm = hg.idx_to_osm(dest)
    if src_osm == -1 or dst_osm == -1:
        return None
    dst_pos = hg.get_node_pos(dest)
    dst_lat, dst_lon = dst_pos["y"], dst_pos["x"]

    def heuristic(u_osm: int, _: int) -> float:
        u_idx = hg.osm_to_idx(u_osm)
        if u_idx == -1:
            return 0.0
        pos = hg.get_node_pos(u_idx)
        dlat = math.radians(pos["y"] - dst_lat)
        dlon = math.radians(pos["x"] - dst_lon)
        a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(pos["y"])) * math.cos(math.radians(dst_lat)) * math.sin(dlon / 2) ** 2
        return 6371_000 * 2 * math.asin(math.sqrt(a))

    try:
        path = nx.astar_path(hg.graph, src_osm, dst_osm, heuristic=heuristic, weight="length")
        return [hg.osm_to_idx(n) for n in path]
    except (nx.NetworkXNoPath, nx.NodeNotFound):
        return None


# ─────────────────────────────────────────────────────────────────────────────
# Route Distance Helper
# ─────────────────────────────────────────────────────────────────────────────


def _route_total_distance(hg: Any, path: List[int]) -> float:
    total = 0.0
    for i in range(len(path) - 1):
        edge = hg.get_edge_data(path[i], path[i + 1])
        total += edge.get("distance_km", 0.0) if edge else 0.0
    return total


# ─────────────────────────────────────────────────────────────────────────────
# Hybrid Engine
# ─────────────────────────────────────────────────────────────────────────────


class HybridRoutingEngine:
    """Generates and ranks candidate routes using GNN scoring."""

    def __init__(self, state: AppState) -> None:
        self._state = state

    def generate_candidates(
        self,
        hg: Any,
        source: int,
        dest: int,
        battery_soc: float = 80.0,
        battery_capacity_kwh: float = 60.0,
    ) -> List[Tuple[List[int], str]]:
        """Generate 3-5 candidate routes from different algorithms.

        Returns list of (path_node_ids, algorithm_name) tuples.
        """
        candidates: List[Tuple[List[int], str]] = []
        seen_paths = set()

        def add_candidate(path: Optional[List[int]], name: str) -> None:
            if path and len(path) >= 2:
                key = tuple(path)
                if key not in seen_paths:
                    seen_paths.add(key)
                    candidates.append((path, name))

        # 1. Standard Dijkstra
        add_candidate(_dijkstra_route(hg, source, dest), "dijkstra")

        # 2. Eco-weighted Dijkstra
        add_candidate(_dijkstra_eco_route(hg, source, dest), "eco")

        # 3. A*
        add_candidate(_astar_route(hg, source, dest), "astar")

        # 4. Q-Learning (if trained)
        q_table = self._state.q_table
        if q_table is None and os.path.exists(_Q_TABLE_PATH):
            try:
                with open(_Q_TABLE_PATH, "rb") as f:
                    data = pickle.load(f)
                q_table = data.get("q_table", data) if isinstance(data, dict) else data
            except Exception:
                pass
        if q_table:
            add_candidate(_q_learning_route(hg, source, dest, q_table), "q_learning")

        logger.debug("[HybridEngine] Generated %d unique candidates", len(candidates))
        return candidates

    def score_and_rank(
        self,
        hg: Any,
        candidates: List[Tuple[List[int], str]],
        battery_soc: float = 80.0,
        battery_capacity_kwh: float = 60.0,
    ) -> List[Dict[str, Any]]:
        """Score candidates and return sorted list with full AI metrics.

        Each result dict contains:
          - path: List[int]
          - algorithm: str
          - gnn_score: float
          - composite_score: float
          - scoring_breakdown: Dict
          - ai_confidence: float (0–100%)
          - distance_km: float
          - energy_kwh: float
          - used_gnn: bool
        """
        if not candidates:
            return []

        gnn_svc = self._state.gnn_service
        results = []

        # Compute distances for normalization
        distances = [_route_total_distance(hg, path) for path, _ in candidates]
        max_dist = max(distances) if distances else 1.0
        min_dist = min(distances) if distances else 0.0
        dist_range = max(max_dist - min_dist, 0.01)

        for (path, algorithm), dist_km in zip(candidates, distances):
            energy_kwh = dist_km * 0.18  # base energy estimate
            time_min = dist_km / 40.0 * 60.0  # assume 40 km/h avg

            # GNN scoring (or heuristic fallback)
            if gnn_svc is not None:
                gnn_result = gnn_svc.score_route(path, hg, battery_soc, battery_capacity_kwh)
                gnn_score = gnn_result.gnn_score
                traffic_level = gnn_result.traffic_level
                energy_estimate = gnn_result.energy_estimate_kwh
                used_gnn = gnn_result.used_gnn
            else:
                # Pure heuristic fallback (no GNN service)
                gnn_score = 0.5
                traffic_level = 0.5
                energy_estimate = energy_kwh
                used_gnn = False

            # Normalize distance score (shorter = better)
            dist_score = 1.0 - (dist_km - min_dist) / dist_range

            # Energy score (available energy / required energy)
            available_energy_kwh = (battery_soc / 100.0) * battery_capacity_kwh
            energy_score = min(available_energy_kwh / max(energy_estimate, 0.1), 1.0)

            # Time score (penalize high traffic)
            time_score = 1.0 - traffic_level

            # Charging feasibility
            battery_remaining_pct = ((available_energy_kwh - energy_estimate) / battery_capacity_kwh) * 100.0
            feasibility_score = min(max(battery_remaining_pct / 100.0, 0.0), 1.0)

            # Composite score
            composite = (
                _WEIGHT_DISTANCE * dist_score
                + _WEIGHT_ENERGY * energy_score
                + _WEIGHT_TIME * time_score
                + _WEIGHT_GNN * gnn_score
                + _WEIGHT_FEASIBILITY * feasibility_score
            )

            results.append({
                "path": path,
                "algorithm": algorithm,
                "gnn_score": round(gnn_score, 4),
                "composite_score": round(composite, 4),
                "ai_confidence": round(composite * 100.0, 1),
                "distance_km": round(dist_km, 3),
                "energy_kwh": round(energy_estimate, 3),
                "traffic_level": round(traffic_level, 4),
                "used_gnn": used_gnn,
                "scoring_breakdown": {
                    "distance": round(dist_score, 4),
                    "energy": round(energy_score, 4),
                    "time": round(time_score, 4),
                    "gnn": round(gnn_score, 4),
                    "feasibility": round(feasibility_score, 4),
                    "weights": {
                        "distance": _WEIGHT_DISTANCE,
                        "energy": _WEIGHT_ENERGY,
                        "time": _WEIGHT_TIME,
                        "gnn": _WEIGHT_GNN,
                        "feasibility": _WEIGHT_FEASIBILITY,
                    },
                },
            })

        # Sort by composite score (best first)
        results.sort(key=lambda r: r["composite_score"], reverse=True)
        logger.debug("[HybridEngine] Ranked %d candidates; best: %s (%.4f)",
                     len(results),
                     results[0]["algorithm"] if results else "N/A",
                     results[0]["composite_score"] if results else 0)
        return results

    def run(
        self,
        hg: Any,
        source: int,
        dest: int,
        battery_soc: float = 80.0,
        battery_capacity_kwh: float = 60.0,
    ) -> List[Dict[str, Any]]:
        """Full pipeline: generate candidates → score → rank.

        Returns ranked list of route results.
        """
        candidates = self.generate_candidates(hg, source, dest, battery_soc, battery_capacity_kwh)
        if not candidates:
            return []
        return self.score_and_rank(hg, candidates, battery_soc, battery_capacity_kwh)


# ─────────────────────────────────────────────────────────────────────────────
# GNN-only routing (single route, GNN-generated or scored best Dijkstra)
# ─────────────────────────────────────────────────────────────────────────────


def gnn_route(
    state: AppState,
    hg: Any,
    source: int,
    dest: int,
    battery_soc: float = 80.0,
    battery_capacity_kwh: float = 60.0,
) -> Tuple[Optional[List[int]], Dict[str, Any]]:
    """Generate a GNN route: try GNN generator, fall back to scored Dijkstra.

    Returns (path, ai_metrics_dict).
    """
    gnn_svc = state.gnn_service
    ai_metrics: Dict[str, Any] = {}

    # Try direct GNN generation
    if gnn_svc is not None and gnn_svc.is_loaded:
        path = gnn_svc.generate_route(source, dest, hg, battery_soc, battery_capacity_kwh)
        if path:
            score = gnn_svc.score_route(path, hg, battery_soc, battery_capacity_kwh)
            ai_metrics = score.to_dict()
            ai_metrics["algorithm"] = "gnn_generated"
            return path, ai_metrics

    # Fall back: score Dijkstra with GNN
    path = _dijkstra_route(hg, source, dest)
    if path is None:
        return None, {}

    if gnn_svc is not None:
        score = gnn_svc.score_route(path, hg, battery_soc, battery_capacity_kwh)
        ai_metrics = score.to_dict()
    else:
        ai_metrics = {"gnn_score": 0.5, "used_gnn": False}

    ai_metrics["algorithm"] = "gnn_scored_dijkstra"
    return path, ai_metrics
