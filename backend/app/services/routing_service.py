"""Routing service — real Hyderabad road network and route generation."""

import logging
import math
import os
import pickle
import random
from typing import Dict, Any, List, Optional

import networkx as nx

from backend.app.state import AppState
from backend.app.models.responses import fail

logger = logging.getLogger("ev_routing")

_Q_TABLE_PATH = "models/q_learning/q_table_hyderabad.pkl"


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

    route_feature = _build_route_feature(hg, state, path, route_type, battery_soc, battery_capacity_kwh)

    # Generate alternatives (Dijkstra shortest-distance)
    alternatives = []
    if route_type == "q_learning":
        alt_path = _dijkstra_route(hg, source, dest)
        if alt_path and alt_path != path:
            alt_feature = _build_route_feature(hg, state, alt_path, "dijkstra", battery_soc, battery_capacity_kwh)
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


def _build_route_feature(hg, state: AppState, path: List[int], route_type: str, battery_soc: float, battery_capacity_kwh: float) -> Dict[str, Any]:
    """Build a GeoJSON Feature for a computed path with full street geometry."""
    coordinates: List[List[float]] = []
    total_distance_km = 0.0
    charging_stops: List[Dict[str, Any]] = []
    segments: List[Dict[str, Any]] = []

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
        seg_energy = seg_dist * 0.18
        seg_time = edge_data.get("base_time_minutes", seg_dist / 40.0 * 60.0)

        # Avoid duplicate coordinates at segment junctions
        if coordinates and edge_coords:
            edge_coords = edge_coords[1:]
        coordinates.extend(edge_coords)
        total_distance_km += seg_dist

        segments.append({
            "from_node": from_idx,
            "to_node": to_idx,
            "distance_km": round(seg_dist, 3),
            "energy_kwh": round(seg_energy, 3),
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

    energy_kwh = total_distance_km * 0.18
    time_minutes = total_distance_km / 40.0 * 60.0
    battery_remaining = battery_soc - (energy_kwh / battery_capacity_kwh * 100.0)

    # Simulated elevation profile
    elevation_profile = _generate_elevation_profile(total_distance_km, seed=hash((path[0], path[-1])) % 2**31)

    return {
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
            "segments": segments,
            "elevation_profile": elevation_profile,
        },
    }
