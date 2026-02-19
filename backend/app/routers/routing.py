from fastapi import APIRouter, Depends, Request
from backend.app.state import AppState, get_state
from backend.app.models.requests import RouteRequest
from backend.app.models.responses import ok, fail
from backend.app.services.routing_service import fetch_road_network, generate_route, require_graph

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


@router.get("/stations", summary="Get EV charging stations")
async def get_stations(request: Request, state: AppState = Depends(get_state)):
    stations = state.charging_stations or []
    return ok({"stations": stations, "count": len(stations)})


@router.post("/generate-route", summary="Generate EV route")
async def generate_route_endpoint(request: Request, route_req: RouteRequest, state: AppState = Depends(get_state)):
    hg = require_graph(state)

    # Resolve source/destination from lat/lon or node IDs
    source = route_req.source
    dest = route_req.destination

    if route_req.source_lat is not None and route_req.source_lon is not None:
        source = hg.nearest_node(route_req.source_lat, route_req.source_lon)
    if route_req.dest_lat is not None and route_req.dest_lon is not None:
        dest = hg.nearest_node(route_req.dest_lat, route_req.dest_lon)

    if source is None or dest is None:
        fail("Provide source/destination as lat/lon or node IDs", 422)
    if source == dest:
        fail("Source and destination must differ", 422)
    if source >= hg.num_nodes or dest >= hg.num_nodes:
        fail(f"Node IDs must be in [0, {hg.num_nodes - 1}]", 422)

    battery_soc = route_req.battery_soc
    battery_cap = route_req.battery_capacity_kwh

    try:
        result = generate_route(state, source, dest, battery_soc, battery_cap)
        return ok(result)
    except Exception as e:
        if hasattr(e, "status_code"):
            raise
        fail(f"Route generation failed: {e}")


@router.get("/system/config", summary="Get system configuration")
async def get_system_config(request: Request):
    from backend.app.config import settings
    return ok({
        "osmnx_radius_meters": settings.OSMNX_RADIUS_METERS,
        "osmnx_radius_km": round(settings.OSMNX_RADIUS_METERS / 1000, 1),
        "osmnx_center_lat": settings.OSMNX_CENTER_LAT,
        "osmnx_center_lon": settings.OSMNX_CENTER_LON,
        "max_training_episodes": settings.MAX_TRAINING_EPISODES,
    })


@router.post("/save-route", summary="Save route")
async def save_route(request: Request, route_req: RouteRequest, state: AppState = Depends(get_state)):
    return ok({
        "status": "saved",
        "route": {"source": route_req.source, "destination": route_req.destination},
    })
