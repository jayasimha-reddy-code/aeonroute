from fastapi import APIRouter, Depends, Request
from backend.app.state import AppState, get_state
from backend.app.models.requests import RouteRequest
from backend.app.models.responses import ok, fail
from backend.app.services.routing_service import fetch_road_network, require_route_gen
from src.road_graph import EVState

router = APIRouter(prefix="/api", tags=["Routing"])


@router.get("/road-network", summary="Get road network")
async def get_road_network(request: Request, grid_size: int = 10, state: AppState = Depends(get_state)):
    try:
        result = fetch_road_network(state, grid_size)
        return ok(result)
    except Exception as e:
        if hasattr(e, "status_code"):
            raise
        fail(f"Failed to fetch road network: {e}")


@router.post("/generate-route", summary="Generate EV route")
async def generate_route(request: Request, route_req: RouteRequest, state: AppState = Depends(get_state)):
    s = require_route_gen(state)
    try:
        node_count = s.road_graph.num_nodes
        if route_req.source >= node_count or route_req.destination >= node_count:
            fail(f"Node IDs must be in [0, {node_count - 1}]", 422, {"nodes_available": node_count})
        ev_state = EVState(
            battery_soc=route_req.ev_state.battery_soc,
            current_node=route_req.ev_state.current_node,
            battery_capacity_kwh=route_req.ev_state.battery_capacity_kwh,
            time_minutes=route_req.ev_state.time_minutes,
        )
        routes = s.route_generator.generate_routes(
            source=route_req.source,
            destination=route_req.destination,
            ev_state=ev_state,
            num_candidates=route_req.num_candidates,
        )
        routes_data = [
            {
                "path": r.path,
                "distance_km": r.total_distance_km,
                "energy_kwh": r.total_energy_kwh,
                "time_minutes": r.total_time_minutes,
                "feasibility_score": r.feasibility_score,
                "charging_stops": r.charging_stops if hasattr(r, "charging_stops") else [],
            }
            for r in routes
        ]
        return ok({"routes": routes_data, "count": len(routes_data)})
    except Exception as e:
        if hasattr(e, "status_code"):
            raise
        fail(f"Route generation failed: {e}")


@router.post("/save-route", summary="Save route")
async def save_route(request: Request, route_req: RouteRequest, state: AppState = Depends(get_state)):
    return ok({
        "status": "saved",
        "route": {"source": route_req.source, "destination": route_req.destination},
    })
