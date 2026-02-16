from fastapi import APIRouter, Depends, Request
import numpy as np
from backend.app.state import AppState, get_state
from backend.app.models.responses import ok, fail
from src.road_graph import EVState

router = APIRouter(prefix="/api", tags=["Analytics"])


@router.get("/traffic-patterns/temporal", summary="Temporal traffic for heatmap slider")
async def get_temporal_traffic(request: Request, state: AppState = Depends(get_state)):
    if state.system is None or state.system.gan is None:
        return fail("System or GAN not initialized", 503)
    try:
        traffic = state.system.gan.generate_traffic_scenarios(n_samples=1)
        grid_size = state.system.config.get("grid_size", 10)
        return ok({
            "grid_size": grid_size,
            "time_steps": 24,
            "traffic": traffic[0].tolist(),
        })
    except Exception as e:
        if hasattr(e, "status_code"):
            raise
        return fail(f"Temporal traffic generation failed: {e}")


@router.get("/traffic-patterns", summary="Get traffic patterns")
async def get_traffic_patterns(request: Request, time_step: int = 12, state: AppState = Depends(get_state)):
    if state.system is None:
        fail("System not initialised", 503)
    if state.system.gan is None:
        fail("Traffic GAN model not trained yet", 503)
    try:
        traffic = state.system.gan.generate_traffic_scenarios(n_samples=5)
        traffic_data = [
            {"scenario": i, "values": t.flatten().tolist()[:20]}
            for i, t in enumerate(traffic)
        ]
        return ok({"traffic_patterns": traffic_data})
    except Exception as e:
        if hasattr(e, "status_code"):
            raise
        fail(f"Traffic generation failed: {e}")


@router.get("/route-metrics", summary="Route metrics")
async def get_route_metrics(request: Request, num_samples: int = 10, state: AppState = Depends(get_state)):
    if state.system is None:
        fail("System not initialised", 503)
    if state.system.route_generator is None:
        fail("Route generator not ready", 503)
    s = state.system
    try:
        distances, energies, times, feasibilities = [], [], [], []
        for _ in range(min(num_samples, 50)):
            source = np.random.randint(0, max(s.road_graph.num_nodes - 1, 2))
            dest = np.random.randint(0, s.road_graph.num_nodes)
            if source == dest:
                dest = (dest + 1) % s.road_graph.num_nodes
            ev_state = EVState(battery_soc=80, current_node=source)
            routes = s.route_generator.generate_routes(source, dest, ev_state, num_candidates=1)
            if routes:
                distances.append(routes[0].total_distance_km)
                energies.append(routes[0].total_energy_kwh)
                times.append(routes[0].total_time_minutes)
                feasibilities.append(routes[0].feasibility_score)
        return ok({
            "avg_distance_km": float(np.mean(distances)) if distances else 0,
            "avg_energy_kwh": float(np.mean(energies)) if energies else 0,
            "avg_time_minutes": float(np.mean(times)) if times else 0,
            "avg_feasibility": float(np.mean(feasibilities)) if feasibilities else 0,
            "samples": len(distances),
        })
    except Exception as e:
        if hasattr(e, "status_code"):
            raise
        fail(f"Metrics generation failed: {e}")
