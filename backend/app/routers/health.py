from fastapi import APIRouter, Depends, Request
from datetime import datetime
from backend.app.state import AppState, get_state
from backend.app.models.responses import ok, fail

router = APIRouter(tags=["System"])


@router.get("/health", summary="Health check")
async def health_check(request: Request, state: AppState = Depends(get_state)):
    """Liveness probe — always returns 200 if server is up."""
    return ok({
        "status": "healthy",
        "graph_loaded": state.hyderabad_graph is not None,
        "stations_loaded": len(state.charging_stations) > 0,
        "timestamp": datetime.now().isoformat(),
    })


@router.get("/api/system-stats", summary="System statistics")
async def get_system_stats(request: Request, state: AppState = Depends(get_state)):
    cached = state.system_stats_cache.get("stats")
    if cached is not None:
        return ok(cached)

    hg = state.hyderabad_graph
    result = {
        "road_network": {
            "nodes": hg.num_nodes if hg else 0,
            "edges": hg.num_edges if hg else 0,
            "bounds": hg.bounds if hg else {},
        },
        "stations": {
            "count": len(state.charging_stations),
        },
        "models": {
            "q_table_loaded": state.q_table is not None,
        },
        "training_status": state.training_status,
    }
    state.system_stats_cache["stats"] = result
    return ok(result)
