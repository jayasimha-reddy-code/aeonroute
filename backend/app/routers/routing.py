from fastapi import APIRouter, Depends, Request
from backend.app.state import AppState, get_state
from backend.app.models.requests import RouteRequest
from backend.app.models.responses import ok, fail
from backend.app.services.routing_service import fetch_road_network, generate_route, generate_multi_stop_route, require_graph

router = APIRouter(prefix="/api", tags=["Routing"])


@router.get("/routing/modes", summary="Get available routing modes")
async def get_routing_modes(state: AppState = Depends(get_state)):
    """Return all supported routing modes with descriptions, categories, and availability."""
    from backend.app.services.route_strategy import get_available_modes
    modes = get_available_modes(state)
    return ok({"modes": modes, "count": len(modes)})


@router.get("/model/status", summary="Get AI model status")
async def get_model_status(state: AppState = Depends(get_state)):
    """Return status of all AI models: Q-table, DQN, GNN, SG-GAN."""
    import os
    q_table_trained = state.q_table is not None or os.path.exists("models/q_learning/q_table_hyderabad.pkl")
    q_table_states = len(state.q_table) if state.q_table else None

    dqn_trained = (
        state.dqn_model is not None
        or os.path.exists("models/dqn/dqn_agent_model.keras")
    )

    gnn_status = state.gnn_service.get_status() if state.gnn_service else {
        "gnn_loaded": False,
        "sg_gan_loaded": False,
        "model_dir": "models/gnn_gan",
        "has_tensorflow": False,
        "is_ready": False,
    }

    return ok({
        "q_table_trained": q_table_trained,
        "q_table_states": q_table_states,
        "dqn_trained": dqn_trained,
        "gnn_loaded": gnn_status.get("gnn_loaded", False),
        "sg_gan_loaded": gnn_status.get("sg_gan_loaded", False),
        "gnn_model_dir": gnn_status.get("model_dir"),
        "has_tensorflow": gnn_status.get("has_tensorflow", False),
        "gnn_is_ready": gnn_status.get("is_ready", False),
        "graph_data_prepared": gnn_status.get("graph_data_prepared", False),
    })


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

    battery_soc = route_req.battery_soc
    battery_cap = route_req.battery_capacity_kwh

    # ── Multi-stop waypoint mode ──────────────────────────
    if route_req.waypoints and len(route_req.waypoints) >= 2:
        waypoints_dicts = []
        for wp in route_req.waypoints:
            if wp.node_id is not None:
                waypoints_dicts.append({"node_id": wp.node_id})
            elif wp.lat is not None and wp.lon is not None:
                waypoints_dicts.append({"lat": wp.lat, "lon": wp.lon})
            else:
                fail("Each waypoint must have lat/lon or node_id", 422)
        try:
            result = generate_multi_stop_route(state, waypoints_dicts, battery_soc, battery_cap)
            return ok(result)
        except Exception as e:
            if hasattr(e, "status_code"):
                raise
            fail(f"Multi-stop route generation failed: {e}")

    # ── Standard 2-point route ────────────────────────────
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

    try:
        result = generate_route(
                state, source, dest, battery_soc, battery_cap,
                route_req.route_mode or "fast",
                energy_weight=route_req.energy_weight if route_req.energy_weight is not None else 0.18,
            )
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
