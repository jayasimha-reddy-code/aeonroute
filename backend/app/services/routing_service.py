"""Routing service — real Hyderabad road network and route generation."""

import logging
import os
import pickle
from typing import Dict, Any, List, Optional

import networkx as nx

from backend.app.state import AppState
from backend.app.models.responses import fail

logger = logging.getLogger("ev_routing")

_Q_TABLE_PATH = "models/q_learning/q_table_hyderabad.pkl"


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

    # Edge features (LineStrings)
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
        features.append({
            "type": "Feature",
            "geometry": {
                "type": "LineString",
                "coordinates": [[u_pos["x"], u_pos["y"]], [v_pos["x"], v_pos["y"]]],
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
    """Shortest-path fallback using Dijkstra on the real graph."""
    src_osm = hg.idx_to_osm(source)
    dst_osm = hg.idx_to_osm(dest)
    if src_osm == -1 or dst_osm == -1:
        return None
    try:
        osm_path = nx.shortest_path(hg.graph, src_osm, dst_osm, weight="length")
        return [hg.osm_to_idx(n) for n in osm_path]
    except (nx.NetworkXNoPath, nx.NodeNotFound):
        return None


def generate_route(state: AppState, source: int, dest: int, battery_soc: float = 80.0, battery_capacity_kwh: float = 60.0) -> Dict[str, Any]:
    """Generate a real route over Hyderabad streets. Q-table if trained, else Dijkstra."""
    hg = require_graph(state)

    # Try Q-table first
    q_table = state.q_table or _load_q_table()
    route_type = "dijkstra"
    path = None

    if q_table:
        path = _q_learning_route(hg, source, dest, q_table)
        if path:
            route_type = "q_learning"

    # Fallback to Dijkstra
    if path is None:
        path = _dijkstra_route(hg, source, dest)
        route_type = "dijkstra"

    if path is None:
        fail("No path found between the given nodes", 404)

    # Build GeoJSON LineString
    coordinates = []
    total_distance_km = 0.0
    charging_stops = []

    for i, idx in enumerate(path):
        pos = hg.get_node_pos(idx)
        coordinates.append([pos["x"], pos["y"]])
        if i > 0:
            edge = hg.get_edge_data(path[i - 1], idx)
            total_distance_km += edge.get("distance_km", 0.0)
        if idx in hg.charging_stations:
            # Find station info
            for s in state.charging_stations:
                if s.get("graph_node_id") == idx:
                    charging_stops.append({
                        "node_id": idx,
                        "name": s.get("name", "Charging Station"),
                        "lat": s.get("lat", pos["y"]),
                        "lon": s.get("lon", pos["x"]),
                    })
                    break

    energy_kwh = total_distance_km * 0.18
    time_minutes = total_distance_km / 40.0 * 60.0
    battery_remaining = battery_soc - (energy_kwh / battery_capacity_kwh * 100.0)

    route = {
        "type": "Feature",
        "geometry": {"type": "LineString", "coordinates": coordinates},
        "properties": {
            "distance_km": round(total_distance_km, 2),
            "energy_kwh": round(energy_kwh, 2),
            "time_minutes": round(time_minutes, 1),
            "battery_remaining_pct": round(max(battery_remaining, 0), 1),
            "charging_stops": charging_stops,
            "path_node_ids": path,
            "route_type": route_type,
        },
    }

    # Generate alternatives (Dijkstra shortest-distance and shortest-time)
    alternatives = []
    if route_type == "q_learning":
        alt_path = _dijkstra_route(hg, source, dest)
        if alt_path and alt_path != path:
            alt_coords = [[hg.get_node_pos(i)["x"], hg.get_node_pos(i)["y"]] for i in alt_path]
            alt_dist = sum(hg.get_edge_data(alt_path[j], alt_path[j + 1]).get("distance_km", 0) for j in range(len(alt_path) - 1))
            alternatives.append({
                "type": "Feature",
                "geometry": {"type": "LineString", "coordinates": alt_coords},
                "properties": {
                    "distance_km": round(alt_dist, 2),
                    "energy_kwh": round(alt_dist * 0.18, 2),
                    "time_minutes": round(alt_dist / 40.0 * 60.0, 1),
                    "route_type": "dijkstra",
                    "path_node_ids": alt_path,
                },
            })

    return {"route": route, "alternatives": alternatives}
