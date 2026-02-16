from typing import Dict, Any
from backend.app.state import AppState
from backend.app.models.responses import fail
from src.road_graph import RoadGraph


def require_system(state: AppState):
    if state.system is None:
        fail("System not initialised - start the server first", 503)
    return state.system


def require_route_gen(state: AppState):
    s = require_system(state)
    if s.route_generator is None:
        fail("Route generator not ready - train the system first", 503)
    return s


def fetch_road_network(state: AppState, grid_size: int) -> Dict[str, Any]:
    grid_size = max(3, min(grid_size, 50))
    cached = state.road_network_cache.get(grid_size)
    if cached is not None:
        return cached
    s = require_system(state)
    if s.road_graph is None:
        s.road_graph = RoadGraph(grid_size=grid_size)
    rg = s.road_graph
    nodes_pos = {}
    for node, data in rg.graph.nodes(data=True):
        nodes_pos[str(node)] = {
            "x": float(data.get("x", 0.0)),
            "y": float(data.get("y", 0.0)),
        }
    edges_list = [
        {
            "source": int(u),
            "target": int(v),
            "distance_km": round(float(d.get("distance_km", 0)), 3),
            "base_energy_kwh_per_km": round(float(d.get("base_energy_kwh_per_km", 0)), 4),
            "base_time_minutes": round(float(d.get("base_time_minutes", 0)), 2),
            "road_type": str(d.get("road_type", "local").value)
            if hasattr(d.get("road_type", ""), "value")
            else str(d.get("road_type", "local")),
        }
        for u, v, d in rg.graph.edges(data=True)
    ]
    charging_stations = (
        [int(cs) for cs in rg.charging_stations]
        if hasattr(rg, "charging_stations") else []
    )
    result = {
        "nodes": rg.num_nodes,
        "edges": rg.graph.number_of_edges(),
        "charging_stations": charging_stations,
        "nodes_pos": nodes_pos,
        "edges_list": edges_list,
    }
    state.road_network_cache[grid_size] = result
    return result
