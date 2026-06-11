"""Routing service — real Hyderabad road network and route generation."""

import logging
import math
import os
import pickle
import random
from typing import Dict, Any, List, Optional, Tuple

import networkx as nx

from backend.app.state import AppState
from backend.app.models.responses import fail

logger = logging.getLogger("ev_routing")

_Q_TABLE_PATH = "models/q_learning/q_table_hyderabad.pkl"
_DQN_MODEL_PATH = "models/dqn/dqn_agent"


def _extract_edge_geometry(graph: "nx.DiGraph", osm_u: int, osm_v: int, u_pos: Dict[str, float], v_pos: Dict[str, float]) -> List[List[float]]:
    """Extract full street geometry from an OSMnx edge.

    If the edge has a 'geometry' attribute (Shapely LineString with full street
    curvature), extract ALL intermediate coordinates.  Otherwise fall back to a
    straight segment between the two node endpoints.

    Returns a list of [lon, lat] pairs.
    """
    if graph.has_edge(osm_u, osm_v):
        data = graph.edges[osm_u, osm_v]
        geom = data.get("geometry")
        if geom is not None:
            try:
                # Shapely geometry — extract coords (already lon, lat)
                coords = list(geom.coords)
                if len(coords) >= 2:
                    return [[float(c[0]), float(c[1])] for c in coords]
            except Exception:
                pass
    # Fallback: straight line between endpoints
    return [[u_pos["x"], u_pos["y"]], [v_pos["x"], v_pos["y"]]]


def _generate_elevation_profile(total_distance_km: float, seed: Optional[int] = None) -> List[Dict[str, float]]:
    """Generate a realistic simulated elevation profile for a route.

    Hyderabad sits on a plateau at ~500 m.  We use a sine-wave + noise pattern
    to simulate gentle undulations.
    """
    rng = random.Random(seed)
    num_points = rng.randint(60, 80)
    base_elevation = 500.0
    amplitude = rng.uniform(20.0, 60.0)
    freq = rng.uniform(3.0, 7.0) * 2 * math.pi / max(total_distance_km, 0.1)

    profile: List[Dict[str, float]] = []
    for i in range(num_points):
        d = (i / max(num_points - 1, 1)) * total_distance_km
        noise = rng.uniform(-5.0, 5.0)
        elev = base_elevation + amplitude * math.sin(freq * d) + noise
        profile.append({
            "distance_km": round(d, 3),
            "elevation_m": round(elev, 1),
        })
    return profile


def require_graph(state: AppState):
    """Return the loaded HyderabadGraph or fail with 503."""
    if state.hyderabad_graph is None:
        fail("Hyderabad graph not loaded — server still initialising", 503)
    return state.hyderabad_graph


def fetch_road_network(state: AppState, grid_size: int = 10) -> Dict[str, Any]:
    """Return road network as GeoJSON FeatureCollection + legacy fields."""
    cached = state.road_network_cache.get("hyderabad")
    if cached is not None:
        return cached

    hg = require_graph(state)
    g = hg.graph

    # Build GeoJSON features
    features: List[Dict[str, Any]] = []

    # Node features (Points)
    for idx in range(hg.num_nodes):
        pos = hg.get_node_pos(idx)
        features.append({
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [pos["x"], pos["y"]]},
            "properties": {
                "node_id": idx,
                "is_charging_station": idx in hg.charging_stations,
            },
        })

    # Edge features (LineStrings) — with full street geometry
    edges_list = []
    for osm_u, osm_v, data in g.edges(data=True):
        u_idx = hg.osm_to_idx(osm_u)
        v_idx = hg.osm_to_idx(osm_v)
        if u_idx == -1 or v_idx == -1:
            continue
        u_pos = hg.get_node_pos(u_idx)
        v_pos = hg.get_node_pos(v_idx)
        length_m = float(data.get("length", 100))
        dist_km = length_m / 1000.0
        edge_coords = _extract_edge_geometry(g, osm_u, osm_v, u_pos, v_pos)
        features.append({
            "type": "Feature",
            "geometry": {
                "type": "LineString",
                "coordinates": edge_coords,
            },
            "properties": {
                "distance_km": round(dist_km, 3),
                "road_type": str(data.get("highway", "residential")),
            },
        })
        edges_list.append({
            "source": u_idx,
            "target": v_idx,
            "distance_km": round(dist_km, 3),
            "base_energy_kwh_per_km": 0.18,
            "base_time_minutes": round(dist_km / 40.0 * 60.0, 2),
            "road_type": str(data.get("highway", "residential")),
        })

    # Legacy nodes_pos format
    nodes_pos = {}
    for idx in range(hg.num_nodes):
        pos = hg.get_node_pos(idx)
        nodes_pos[str(idx)] = {"x": pos["x"], "y": pos["y"]}

    result = {
        "type": "FeatureCollection",
        "features": features,
        "bounds": hg.bounds,
        # Legacy fields for backward compat
        "nodes": hg.num_nodes,
        "edges": hg.num_edges,
        "charging_stations": hg.charging_stations,
        "nodes_pos": nodes_pos,
        "edges_list": edges_list,
    }
    state.road_network_cache["hyderabad"] = result
    return result


def _load_q_table() -> Optional[Dict]:
    """Load trained Q-table from disk if available."""
    if os.path.exists(_Q_TABLE_PATH):
        try:
            with open(_Q_TABLE_PATH, "rb") as f:
                data = pickle.load(f)
            return data.get("q_table", data) if isinstance(data, dict) else data
        except Exception as e:
            logger.warning("Could not load Q-table: %s", e)
    return None


def _q_learning_route(hg, source: int, dest: int, q_table: Dict) -> Optional[List[int]]:
    """Generate route by greedily following Q-table (exploitation only)."""
    import numpy as np

    path = [source]
    current = source
    visited = {source}
    max_steps = min(hg.num_nodes, 500)

    for _ in range(max_steps):
        if current == dest:
            return path
        neighbors = hg.get_neighbors(current)
        if not neighbors:
            break

        # Get Q-values for current state
        key = (current,)
        if key in q_table:
            q_vals = q_table[key]
            # Sort actions by Q-value (descending), pick best valid
            sorted_actions = np.argsort(q_vals)[::-1]
            moved = False
            for action in sorted_actions:
                if action < len(neighbors):
                    next_node = neighbors[action]
                    if next_node not in visited or next_node == dest:
                        current = next_node
                        path.append(current)
                        visited.add(current)
                        moved = True
                        break
            if not moved:
                break
        else:
            break

    return path if current == dest else None


def _dijkstra_route(hg, source: int, dest: int) -> Optional[List[int]]:
    """Shortest-path fallback using Dijkstra on the real graph (weighted by length)."""
    src_osm = hg.idx_to_osm(source)
    dst_osm = hg.idx_to_osm(dest)
    if src_osm == -1 or dst_osm == -1:
        return None
    try:
        osm_path = nx.shortest_path(hg.graph, src_osm, dst_osm, weight="length")
        return [hg.osm_to_idx(n) for n in osm_path]
    except (nx.NetworkXNoPath, nx.NodeNotFound):
        return None


def _astar_route(hg, source: int, dest: int) -> Optional[List[int]]:
    """A* route using haversine heuristic on OSMnx lat/lon positions."""
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
        return 6_371_000.0 * 2 * math.asin(math.sqrt(max(a, 0.0)))

    try:
        osm_path = nx.astar_path(hg.graph, src_osm, dst_osm, heuristic=heuristic, weight="length")
        return [hg.osm_to_idx(n) for n in osm_path]
    except (nx.NetworkXNoPath, nx.NodeNotFound):
        return None


def _dqn_route(hg, source: int, dest: int, state: AppState) -> Optional[List[int]]:
    """Generate route using the DQN agent (greedy exploitation).

    DQN justification vs Q-table: With ~1000+ nodes the state space
    (node × battery × time) explodes to millions of states. DQN's neural
    network generalises across similar states, enabling scalable routing.
    """
    try:
        import numpy as np
        from src.q_learning_agent import HAS_TF  # noqa: F401

        if not HAS_TF:
            logger.warning("[DQN] TensorFlow not available — falling back to Dijkstra")
            return None

        # Try to load DQN from disk if not already in state
        dqn_agent = state.dqn_model
        if dqn_agent is None:
            if not os.path.exists(f"{_DQN_MODEL_PATH}_model.keras"):
                logger.warning("[DQN] No trained model at %s — falling back to Dijkstra", _DQN_MODEL_PATH)
                return None
            from src.q_learning_agent import DQNAgent
            dqn_agent = DQNAgent(state_dim=8, action_space=min(hg.num_nodes, 10))
            dqn_agent.load_model(_DQN_MODEL_PATH)
            state.dqn_model = dqn_agent

        # Greedy DQN policy traversal
        path = [source]
        current = source
        visited = {source}
        max_steps = min(hg.num_nodes, 500)
        dst_pos = hg.get_node_pos(dest)

        for _ in range(max_steps):
            if current == dest:
                return path
            neighbors = hg.get_neighbors(current)
            if not neighbors:
                break

            # Build state vector: [node_norm, dest_norm, dist_norm, battery_stub × 5]
            cur_pos = hg.get_node_pos(current)
            node_norm = current / max(hg.num_nodes, 1)
            dest_norm = dest / max(hg.num_nodes, 1)
            dx = (cur_pos["x"] - dst_pos["x"]) * 111.32
            dy = (cur_pos["y"] - dst_pos["y"]) * 110.57
            dist_norm = min(math.sqrt(dx ** 2 + dy ** 2) / 50.0, 1.0)
            state_vec = np.array([node_norm, dest_norm, dist_norm, 0.8, 0.6, 0.5, 0.0, 0.0], dtype=np.float32)

            action = dqn_agent.choose_action(state_vec, training=False)
            action = action % len(neighbors)
            nxt = neighbors[action]

            if nxt not in visited or nxt == dest:
                current = nxt
                path.append(current)
                visited.add(current)
            else:
                # Try next-best neighbor
                moved = False
                for nb in neighbors:
                    if nb not in visited or nb == dest:
                        current = nb
                        path.append(current)
                        visited.add(current)
                        moved = True
                        break
                if not moved:
                    break

        return path if current == dest else None
    except Exception as exc:
        logger.warning("[DQN] Route generation failed: %s — falling back to Dijkstra", exc)
        return None


# ── Weighted Dijkstra weight functions ──────────────────

_SCENIC_ROAD_WEIGHTS: Dict[str, float] = {
    "motorway": 10.0, "motorway_link": 8.0,
    "trunk": 8.0, "trunk_link": 7.0,
    "primary": 5.0, "primary_link": 4.5,
    "secondary": 2.0, "secondary_link": 1.8,
    "tertiary": 1.5, "tertiary_link": 1.3,
    "residential": 1.0, "unclassified": 1.0,
    "living_street": 0.8, "service": 0.9,
}


def _eco_weight(u: int, v: int, d: Dict) -> float:
    """Weight by energy consumption (kWh) — prefers shorter, flatter paths."""
    return max(d.get("length", 100.0) * 0.18 / 1000.0, 1e-6)


def _scenic_weight(u: int, v: int, d: Dict) -> float:
    """Weight to prefer residential/local roads over motorways."""
    road_type = d.get("highway", "residential")
    if isinstance(road_type, list):
        road_type = road_type[0] if road_type else "residential"
    road_type = str(road_type).replace("_link", "")
    multiplier = _SCENIC_ROAD_WEIGHTS.get(road_type, 1.5)
    return max(d.get("length", 100.0) * multiplier, 1e-6)


def _dijkstra_route_weighted(hg, source: int, dest: int, weight_fn) -> Optional[List[int]]:
    """Dijkstra with a custom weight callable (u, v, d) -> float."""
    src_osm = hg.idx_to_osm(source)
    dst_osm = hg.idx_to_osm(dest)
    if src_osm == -1 or dst_osm == -1:
        return None
    try:
        osm_path = nx.shortest_path(hg.graph, src_osm, dst_osm, weight=weight_fn)
        return [hg.osm_to_idx(n) for n in osm_path]
    except (nx.NetworkXNoPath, nx.NodeNotFound):
        return None


# ── Battery-aware charging stop injection ───────────────

RECHARGE_THRESHOLD = 15.0  # % SOC — inject charging stop below this
FAST_CHARGE_TARGET_SOC = 80.0  # % — recharge to this level

_MODE_DRAIN_MULTIPLIER: Dict[str, float] = {
    "fast": 1.2,
    "eco": 0.85,
    "scenic": 1.0,
}


def _find_nearest_station_kdtree(
    state: AppState,
    hg,
    from_idx: int,
    charging_station_set: set,
    station_meta: Dict[int, Dict],
) -> Tuple[Optional[int], float]:
    """Use KDTree (if available) to find nearest charging station.

    Falls back to O(n) graph-distance scan if spatial index is unavailable.
    Returns (station_node_idx, best_dist_m).
    """
    from_pos = hg.get_node_pos(from_idx)
    from_lat, from_lon = from_pos["y"], from_pos["x"]

    # O(log n) KDTree lookup
    if state.spatial_index is not None and state.charging_stations:
        nearest = state.spatial_index.nearest(from_lat, from_lon, k=5)
        for s in nearest:
            nid = s.get("graph_node_id")
            if nid is not None and nid in charging_station_set:
                return nid, s.get("distance_m", 0.0)

    # O(n) fallback — original graph-distance approach
    current_osm = hg.idx_to_osm(from_idx)
    best_station_idx: Optional[int] = None
    best_dist: float = float("inf")
    for station_node_idx in charging_station_set:
        if station_node_idx == from_idx:
            return station_node_idx, 0.0
        station_osm = hg.idx_to_osm(station_node_idx)
        if station_osm == -1:
            continue
        try:
            d = nx.shortest_path_length(hg.graph, current_osm, station_osm, weight="length")
            if d < best_dist:
                best_dist = d
                best_station_idx = station_node_idx
        except (nx.NetworkXNoPath, nx.NodeNotFound):
            continue
    return best_station_idx, best_dist


def _inject_charging_stops(
    hg,
    state: AppState,
    path: List[int],
    battery_soc: float,
    battery_capacity_kwh: float,
    energy_weight: float = 0.18,
    route_mode: str = "fast",
) -> Dict[str, Any]:
    """Walk path edge-by-edge; inject charging detours when SOC < RECHARGE_THRESHOLD.

    Uses KDTree spatial index for O(log n) nearest-station lookup when available.

    Returns a dict with:
      - path: (possibly modified) list of node indices
      - charging_stop_details: list of injected stop dicts
      - charging_time_penalty_minutes: total charging time added
      - battery_warning: True if battery insufficient even after all attempts
    """
    drain_multiplier = _MODE_DRAIN_MULTIPLIER.get(route_mode, 1.0)
    effective_kwh_per_km = energy_weight * drain_multiplier

    remaining_soc = float(battery_soc)
    new_path: List[int] = [path[0]]
    injected_stops: List[Dict[str, Any]] = []
    total_charging_minutes = 0.0
    battery_warning = False

    charging_station_set = set(hg.charging_stations)
    # Map graph node idx -> station metadata
    station_meta: Dict[int, Dict] = {}
    for s in state.charging_stations:
        nid = s.get("graph_node_id")
        if nid is not None:
            station_meta[nid] = s

    i = 0
    while i < len(path) - 1:
        from_idx = path[i]
        to_idx = path[i + 1]
        edge_data = hg.get_edge_data(from_idx, to_idx)
        seg_dist = edge_data.get("distance_km", 0.0)
        seg_energy = seg_dist * effective_kwh_per_km
        seg_soc_drain = (seg_energy / battery_capacity_kwh) * 100.0 if battery_capacity_kwh > 0 else 0.0
        remaining_soc -= seg_soc_drain
        new_path.append(to_idx)

        if remaining_soc < RECHARGE_THRESHOLD and charging_station_set:
            # Find nearest charging station — O(log n) via KDTree
            best_station_idx, _ = _find_nearest_station_kdtree(
                state, hg, from_idx, charging_station_set, station_meta
            )

            if best_station_idx is not None:
                # Build detour path: current → station → original dest
                stn_osm = hg.idx_to_osm(best_station_idx)
                dest_osm = hg.idx_to_osm(path[-1])
                # Path from station to remaining destination
                try:
                    stn_to_dest_osm = nx.shortest_path(hg.graph, stn_osm, dest_osm, weight="length")
                    stn_to_dest = [hg.osm_to_idx(n) for n in stn_to_dest_osm]
                except (nx.NetworkXNoPath, nx.NodeNotFound):
                    stn_to_dest = None

                # Path from current node to station
                current_osm_node = hg.idx_to_osm(from_idx)
                try:
                    cur_to_stn_osm = nx.shortest_path(hg.graph, current_osm_node, stn_osm, weight="length")
                    cur_to_stn = [hg.osm_to_idx(n) for n in cur_to_stn_osm]
                except (nx.NetworkXNoPath, nx.NodeNotFound):
                    cur_to_stn = None

                if cur_to_stn and stn_to_dest:
                    # Splice detour into new_path (skip duplicate start of cur_to_stn)
                    new_path.extend(cur_to_stn[1:])  # to station
                    # The rest of the original path is replaced by stn_to_dest
                    path = stn_to_dest
                    i = 0  # restart walking from station

                    # Record injected stop details
                    soc_at_arrival = max(0.0, remaining_soc)
                    charging_kwh_needed = ((FAST_CHARGE_TARGET_SOC - soc_at_arrival) / 100.0) * battery_capacity_kwh
                    # Assume 50 kW charger
                    charging_time_min = (charging_kwh_needed / 50.0) * 60.0
                    remaining_soc = FAST_CHARGE_TARGET_SOC
                    total_charging_minutes += charging_time_min

                    pos = hg.get_node_pos(best_station_idx)
                    meta = station_meta.get(best_station_idx, {})
                    injected_stops.append({
                        "node_id": best_station_idx,
                        "lat": meta.get("lat", pos["y"]),
                        "lon": meta.get("lon", pos["x"]),
                        "name": meta.get("name", "Charging Station"),
                        "soc_at_arrival": round(soc_at_arrival, 1),
                        "charge_to_soc": FAST_CHARGE_TARGET_SOC,
                        "charging_time_minutes": round(charging_time_min, 1),
                        "injected": True,
                    })
                    continue  # don't increment i — restart from new path[0]
                else:
                    # Detour not possible → flag warning
                    battery_warning = True
            else:
                battery_warning = True
        i += 1

    return {
        "path": new_path,
        "charging_stop_details": injected_stops,
        "charging_time_penalty_minutes": round(total_charging_minutes, 1),
        "battery_warning": battery_warning,
    }


def generate_route(
    state: AppState,
    source: int,
    dest: int,
    battery_soc: float = 80.0,
    battery_capacity_kwh: float = 60.0,
    route_mode: str = "fast",
    energy_weight: float = 0.18,
) -> Dict[str, Any]:
    """Generate a route over Hyderabad streets.

    Supports all 9 routing modes:
      Classic: fast, eco, scenic, dijkstra, astar, q_learning
      AI:      dqn, gnn, hybrid
    """
    hg = require_graph(state)
    route_type = "dijkstra"
    path = None
    ai_metrics: Dict[str, Any] = {}

    # ── Hybrid mode (multi-candidate + GNN ranking) ─────────────────────────
    if route_mode == "hybrid":
        from backend.app.services.hybrid_routing_engine import HybridRoutingEngine
        engine = HybridRoutingEngine(state)
        ranked = engine.run(hg, source, dest, battery_soc, battery_capacity_kwh)
        if not ranked:
            fail("Hybrid engine could not generate any routes", 404)

        # Build primary route from best candidate
        best = ranked[0]
        path = best["path"]
        route_type = f"hybrid_{best['algorithm']}"
        ai_metrics = {
            "gnn_score": best["gnn_score"],
            "composite_score": best["composite_score"],
            "ai_confidence": best["ai_confidence"],
            "algorithm": best["algorithm"],
            "used_gnn": best["used_gnn"],
            "scoring_breakdown": best["scoring_breakdown"],
        }

        injection = _inject_charging_stops(hg, state, path, battery_soc, battery_capacity_kwh, energy_weight, route_mode)
        path = injection["path"]
        primary_feature = _build_route_feature(
            hg, state, path, route_type, battery_soc, battery_capacity_kwh,
            energy_weight=energy_weight, route_mode=route_mode,
            injected_stop_details=injection["charging_stop_details"],
            charging_time_penalty_minutes=injection["charging_time_penalty_minutes"],
            battery_warning=injection["battery_warning"],
            ai_metrics=ai_metrics,
        )

        # Build alternatives from remaining ranked candidates
        alternatives = []
        for alt in ranked[1:3]:  # up to 2 alternatives
            alt_inj = _inject_charging_stops(hg, state, alt["path"], battery_soc, battery_capacity_kwh, energy_weight, route_mode)
            alt_ai = {
                "gnn_score": alt["gnn_score"],
                "ai_confidence": alt["ai_confidence"],
                "algorithm": alt["algorithm"],
                "used_gnn": alt["used_gnn"],
            }
            alt_feat = _build_route_feature(
                hg, state, alt_inj["path"], f"hybrid_{alt['algorithm']}",
                battery_soc, battery_capacity_kwh,
                energy_weight=energy_weight, route_mode=route_mode,
                injected_stop_details=alt_inj["charging_stop_details"],
                charging_time_penalty_minutes=alt_inj["charging_time_penalty_minutes"],
                battery_warning=alt_inj["battery_warning"],
                ai_metrics=alt_ai,
            )
            alternatives.append(alt_feat)

        return {"route": primary_feature, "alternatives": alternatives}

    # ── GNN mode ─────────────────────────────────────────────────────────────
    if route_mode == "gnn":
        from backend.app.services.hybrid_routing_engine import gnn_route
        path, ai_metrics = gnn_route(state, hg, source, dest, battery_soc, battery_capacity_kwh)
        if path:
            route_type = "gnn"
        else:
            path = _dijkstra_route(hg, source, dest)
            route_type = "dijkstra"

    # ── DQN mode ─────────────────────────────────────────────────────────────
    elif route_mode == "dqn":
        path = _dqn_route(hg, source, dest, state)
        if path:
            route_type = "dqn"
        else:
            logger.info("[DQN] Falling back to Dijkstra")
            path = _dijkstra_route(hg, source, dest)
            route_type = "dijkstra"

    # ── A* mode ──────────────────────────────────────────────────────────────
    elif route_mode == "astar":
        path = _astar_route(hg, source, dest)
        route_type = "astar"

    # ── Dijkstra (explicit) ──────────────────────────────────────────────────
    elif route_mode == "dijkstra":
        path = _dijkstra_route(hg, source, dest)
        route_type = "dijkstra"

    # ── Q-Learning (forced, no fallback) ─────────────────────────────────────
    elif route_mode == "q_learning":
        q_table = state.q_table or _load_q_table()
        if q_table:
            path = _q_learning_route(hg, source, dest, q_table)
            route_type = "q_learning"
        if path is None:
            fail("Q-Learning model not trained or no path found", 404)

    # ── Eco mode ─────────────────────────────────────────────────────────────
    elif route_mode == "eco":
        path = _dijkstra_route_weighted(hg, source, dest, _eco_weight)
        route_type = "eco"

    # ── Scenic mode ──────────────────────────────────────────────────────────
    elif route_mode == "scenic":
        path = _dijkstra_route_weighted(hg, source, dest, _scenic_weight)
        route_type = "scenic"

    # ── Fast mode (default) — Q-Learning with Dijkstra fallback ──────────────
    else:  # "fast"
        q_table = state.q_table or _load_q_table()
        if q_table:
            path = _q_learning_route(hg, source, dest, q_table)
            if path:
                route_type = "q_learning"

    # Final Dijkstra fallback if primary strategy produced no path
    if path is None:
        path = _dijkstra_route(hg, source, dest)
        route_type = "dijkstra"

    if path is None:
        fail("No path found between the given nodes", 404)

    # Battery-aware: inject charging stops if SOC is too low
    injection = _inject_charging_stops(hg, state, path, battery_soc, battery_capacity_kwh, energy_weight, route_mode)
    path = injection["path"]
    injected_stop_details = injection["charging_stop_details"]
    charging_time_penalty = injection["charging_time_penalty_minutes"]
    battery_warning_flag = injection["battery_warning"]

    route_feature = _build_route_feature(
        hg, state, path, route_type, battery_soc, battery_capacity_kwh,
        energy_weight=energy_weight,
        route_mode=route_mode,
        injected_stop_details=injected_stop_details,
        charging_time_penalty_minutes=charging_time_penalty,
        battery_warning=battery_warning_flag,
        ai_metrics=ai_metrics if ai_metrics else None,
    )

    # Generate an alternative route for comparison
    alternatives = []
    if route_mode in ("fast", "q_learning") and route_type == "q_learning":
        alt_path = _dijkstra_route(hg, source, dest)
        if alt_path and alt_path != path:
            alt_feature = _build_route_feature(hg, state, alt_path, "dijkstra", battery_soc, battery_capacity_kwh, route_mode=route_mode)
            alternatives.append(alt_feature)
    elif route_mode in ("eco", "scenic", "astar", "dqn", "gnn"):
        alt_path = _dijkstra_route(hg, source, dest)
        if alt_path and alt_path != path:
            alt_feature = _build_route_feature(hg, state, alt_path, "dijkstra", battery_soc, battery_capacity_kwh, route_mode=route_mode)
            alternatives.append(alt_feature)

    return {"route": route_feature, "alternatives": alternatives}


def generate_multi_stop_route(state: AppState, waypoints: List[Dict[str, Any]], battery_soc: float = 80.0, battery_capacity_kwh: float = 60.0) -> Dict[str, Any]:
    """Generate a multi-stop route through a sequence of waypoints.
    
    Each waypoint is {lat, lon} or {node_id}. The route passes through all
    waypoints sequentially, stitching sub-routes into one continuous LineString.
    """
    hg = require_graph(state)

    # Resolve waypoint node IDs
    node_ids: List[int] = []
    for wp in waypoints:
        if "node_id" in wp:
            node_ids.append(int(wp["node_id"]))
        elif "lat" in wp and "lon" in wp:
            node_ids.append(hg.nearest_node(float(wp["lat"]), float(wp["lon"])))
        else:
            fail("Each waypoint must have {lat, lon} or {node_id}", 422)

    if len(node_ids) < 2:
        fail("At least 2 waypoints required for a route", 422)

    # Route between each consecutive pair
    all_coordinates: List[List[float]] = []
    total_distance_km = 0.0
    total_energy_kwh = 0.0
    total_time_minutes = 0.0
    combined_path: List[int] = []
    legs: List[Dict[str, Any]] = []
    all_charging_stops: List[Dict[str, Any]] = []
    segments: List[Dict[str, Any]] = []

    for i in range(len(node_ids) - 1):
        src, dst = node_ids[i], node_ids[i + 1]
        if src == dst:
            continue

        q_table = state.q_table or _load_q_table()
        sub_path = None
        rt = "dijkstra"

        if q_table:
            sub_path = _q_learning_route(hg, src, dst, q_table)
            if sub_path:
                rt = "q_learning"
        if sub_path is None:
            sub_path = _dijkstra_route(hg, src, dst)

        if sub_path is None:
            fail(f"No path between waypoints {i} and {i + 1}", 404)

        # Build coordinates for this leg
        leg_coords: List[List[float]] = []
        leg_distance = 0.0
        leg_segments: List[Dict[str, Any]] = []

        for j in range(len(sub_path) - 1):
            from_idx = sub_path[j]
            to_idx = sub_path[j + 1]
            from_osm = hg.idx_to_osm(from_idx)
            to_osm = hg.idx_to_osm(to_idx)
            from_pos = hg.get_node_pos(from_idx)
            to_pos = hg.get_node_pos(to_idx)

            edge_coords = _extract_edge_geometry(hg.graph, from_osm, to_osm, from_pos, to_pos)
            edge_data = hg.get_edge_data(from_idx, to_idx)
            seg_dist = edge_data.get("distance_km", 0.0)
            seg_energy = seg_dist * 0.18
            seg_time = edge_data.get("base_time_minutes", seg_dist / 40.0 * 60.0)

            # Avoid duplicate start point when stitching
            if leg_coords and edge_coords:
                edge_coords = edge_coords[1:]
            leg_coords.extend(edge_coords)
            leg_distance += seg_dist

            leg_segments.append({
                "from_node": from_idx,
                "to_node": to_idx,
                "distance_km": round(seg_dist, 3),
                "energy_kwh": round(seg_energy, 3),
                "road_type": edge_data.get("road_type", "residential"),
            })

        leg_energy = leg_distance * 0.18
        leg_time = leg_distance / 40.0 * 60.0

        # Stitch into overall coordinates
        if all_coordinates and leg_coords:
            leg_coords = leg_coords[1:]  # avoid duplicate junction point
        all_coordinates.extend(leg_coords)

        # Extend combined path (skip first node if already in path)
        if combined_path:
            combined_path.extend(sub_path[1:])
        else:
            combined_path.extend(sub_path)

        total_distance_km += leg_distance
        total_energy_kwh += leg_energy
        total_time_minutes += leg_time
        segments.extend(leg_segments)

        legs.append({
            "from": src,
            "to": dst,
            "distance_km": round(leg_distance, 2),
            "energy_kwh": round(leg_energy, 2),
            "time_minutes": round(leg_time, 1),
            "route_type": rt,
        })

    # Find charging stops
    for idx in combined_path:
        if idx in hg.charging_stations:
            pos = hg.get_node_pos(idx)
            for s in state.charging_stations:
                if s.get("graph_node_id") == idx:
                    all_charging_stops.append({
                        "node_id": idx,
                        "name": s.get("name", "Charging Station"),
                        "lat": s.get("lat", pos["y"]),
                        "lon": s.get("lon", pos["x"]),
                    })
                    break

    battery_remaining = battery_soc - (total_energy_kwh / battery_capacity_kwh * 100.0)
    elevation_profile = _generate_elevation_profile(total_distance_km, seed=hash((node_ids[0], node_ids[-1])) % 2**31)

    route = {
        "type": "Feature",
        "geometry": {"type": "LineString", "coordinates": all_coordinates},
        "properties": {
            "distance_km": round(total_distance_km, 2),
            "energy_kwh": round(total_energy_kwh, 2),
            "time_minutes": round(total_time_minutes, 1),
            "battery_remaining_pct": round(max(battery_remaining, 0), 1),
            "charging_stops": all_charging_stops,
            "path_node_ids": combined_path,
            "route_type": "multi_stop",
            "legs": legs,
            "segments": segments,
            "elevation_profile": elevation_profile,
        },
    }

    return {"route": route, "alternatives": []}


def _build_route_feature(
    hg,
    state: AppState,
    path: List[int],
    route_type: str,
    battery_soc: float,
    battery_capacity_kwh: float,
    energy_weight: float = 0.18,
    route_mode: str = "fast",
    injected_stop_details: Optional[List[Dict[str, Any]]] = None,
    charging_time_penalty_minutes: float = 0.0,
    battery_warning: bool = False,
    ai_metrics: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Build a GeoJSON Feature for a computed path with full street geometry."""
    coordinates: List[List[float]] = []
    total_distance_km = 0.0
    charging_stops: List[Dict[str, Any]] = []
    segments: List[Dict[str, Any]] = []

    mode_multiplier = _MODE_DRAIN_MULTIPLIER.get(route_mode, 1.0)
    cumulative_dist_km = 0.0
    cumulative_energy_kwh = 0.0

    for i in range(len(path) - 1):
        from_idx = path[i]
        to_idx = path[i + 1]
        from_osm = hg.idx_to_osm(from_idx)
        to_osm = hg.idx_to_osm(to_idx)
        from_pos = hg.get_node_pos(from_idx)
        to_pos = hg.get_node_pos(to_idx)

        # Extract full street geometry for this edge
        edge_coords = _extract_edge_geometry(hg.graph, from_osm, to_osm, from_pos, to_pos)
        edge_data = hg.get_edge_data(from_idx, to_idx)
        seg_dist = edge_data.get("distance_km", 0.0)
        seg_energy = seg_dist * energy_weight                           # base energy (kWh)
        seg_mode_energy = seg_dist * energy_weight * mode_multiplier    # mode-adjusted energy (kWh)
        seg_time = edge_data.get("base_time_minutes", seg_dist / 40.0 * 60.0)

        # Avoid duplicate coordinates at segment junctions
        if coordinates and edge_coords:
            edge_coords = edge_coords[1:]
        coordinates.extend(edge_coords)
        total_distance_km += seg_dist
        cumulative_dist_km += seg_dist
        cumulative_energy_kwh += seg_mode_energy

        segments.append({
            "from_node": from_idx,
            "to_node": to_idx,
            "distance_km": round(seg_dist, 3),
            "cumulative_distance_km": round(cumulative_dist_km, 3),
            "energy_kwh": round(seg_energy, 3),
            "mode_energy_kwh": round(seg_mode_energy, 3),
            "cumulative_energy_kwh": round(cumulative_energy_kwh, 3),
            "road_type": edge_data.get("road_type", "residential"),
        })

    # Find charging stops
    for idx in path:
        if idx in hg.charging_stations:
            pos = hg.get_node_pos(idx)
            for s in state.charging_stations:
                if s.get("graph_node_id") == idx:
                    charging_stops.append({
                        "node_id": idx,
                        "name": s.get("name", "Charging Station"),
                        "lat": s.get("lat", pos["y"]),
                        "lon": s.get("lon", pos["x"]),
                    })
                    break

    energy_kwh = total_distance_km * energy_weight
    time_minutes = total_distance_km / 40.0 * 60.0 + charging_time_penalty_minutes
    battery_remaining = battery_soc - (energy_kwh / battery_capacity_kwh * 100.0)

    # Build segment_boundaries_km: cumulative distances at each segment end (for binary search)
    segment_boundaries_km = [round(s["cumulative_distance_km"], 3) for s in segments]

    # Simulated elevation profile
    elevation_profile = _generate_elevation_profile(total_distance_km, seed=hash((path[0], path[-1])) % 2**31)

    props: Dict[str, Any] = {
        "distance_km": round(total_distance_km, 2),
        "energy_kwh": round(energy_kwh, 2),
        "time_minutes": round(time_minutes, 1),
        "battery_remaining_pct": round(max(battery_remaining, 0), 1),
        "charging_stops": charging_stops,
        "charging_stop_details": injected_stop_details or [],
        "charging_time_penalty_minutes": charging_time_penalty_minutes,
        "battery_warning": battery_warning,
        "path_node_ids": path,
        "route_type": route_type,
        "route_mode": route_mode,
        "energy_weight": energy_weight,
        "mode_multiplier": mode_multiplier,
        "segment_boundaries_km": segment_boundaries_km,
        "segments": segments,
        "elevation_profile": elevation_profile,
    }

    # Attach AI metrics if present (GNN/Hybrid/DQN modes)
    if ai_metrics:
        props["ai_confidence"] = ai_metrics.get("ai_confidence")
        props["gnn_score"] = ai_metrics.get("gnn_score")
        props["scoring_breakdown"] = ai_metrics.get("scoring_breakdown")
        props["used_gnn"] = ai_metrics.get("used_gnn", False)
        props["ai_algorithm"] = ai_metrics.get("algorithm")

    return {
        "type": "Feature",
        "geometry": {"type": "LineString", "coordinates": coordinates},
        "properties": props,
    }
