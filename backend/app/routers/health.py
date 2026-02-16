from fastapi import APIRouter, Depends, Request
from datetime import datetime
from backend.app.state import AppState, get_state
from backend.app.models.responses import ok, fail

router = APIRouter(tags=["System"])


@router.get("/health", summary="Health check")
async def health_check(request: Request, state: AppState = Depends(get_state)):
    return ok({
        "status": "healthy",
        "system_initialized": state.system is not None,
        "timestamp": datetime.now().isoformat(),
    })


@router.get("/api/system-stats", summary="System statistics")
async def get_system_stats(request: Request, state: AppState = Depends(get_state)):
    cached = state.system_stats_cache.get("stats")
    if cached is not None:
        return ok(cached)
    if state.system is None:
        fail("System not initialised", 503)
    s = state.system
    result = {
        "road_network": {
            "nodes": s.road_graph.num_nodes if s.road_graph else 0,
            "edges": s.road_graph.graph.number_of_edges() if s.road_graph else 0,
        },
        "models": {
            "gan_trained": s.gan is not None,
            "agent_trained": s.agent is not None,
            "gnn_gan_trained": s.gnn_gan is not None,
        },
        "training_status": state.training_status,
    }
    state.system_stats_cache["stats"] = result
    return ok(result)
