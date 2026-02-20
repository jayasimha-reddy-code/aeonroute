"""Analytics router — all endpoints return 200 with real or graceful-fallback data.

Uses analytics_service which works against state.hyderabad_graph directly.
Never touches the legacy state.system.* objects.
"""

from fastapi import APIRouter, Depends, Request
import asyncio
import numpy as np
from backend.app.state import AppState, get_state
from backend.app.models.responses import ok
from backend.app.services.analytics_service import (
    compute_gan_evaluation,
    compute_route_metrics,
    compute_agent_performance,
    compute_training_history,
    compute_route_evaluation,
    compute_system_health,
    compute_energy_breakdown,
)

router = APIRouter(prefix="/api", tags=["Analytics"])


# ── Traffic Patterns (graceful fallback) ──────────────────

@router.get("/traffic-patterns/temporal", summary="Temporal traffic for heatmap slider")
async def get_temporal_traffic(request: Request, state: AppState = Depends(get_state)):
    """Returns simulated temporal traffic. Always 200."""
    hg = state.hyderabad_graph
    grid_size = 10
    # Generate synthetic temporal traffic pattern (24 time steps)
    rng = np.random.default_rng(42)
    base = rng.random((24, grid_size, grid_size)).astype(float)
    # Add rush-hour peaks
    for h in [8, 9, 17, 18]:
        base[h] *= 1.5
    return ok({
        "grid_size": grid_size,
        "time_steps": 24,
        "traffic": base.tolist(),
    })


@router.get("/traffic-patterns", summary="Get traffic patterns")
async def get_traffic_patterns(request: Request, time_step: int = 12, state: AppState = Depends(get_state)):
    """Returns simulated traffic pattern data. Always 200."""
    rng = np.random.default_rng(time_step)
    traffic_data = [
        {"scenario": i, "values": rng.random(20).tolist()}
        for i in range(5)
    ]
    return ok({"traffic_patterns": traffic_data})


# ── Route Metrics (real Dijkstra on Hyderabad graph) ──────

@router.get("/route-metrics", summary="Route metrics")
async def get_route_metrics(request: Request, num_samples: int = 10, state: AppState = Depends(get_state)):
    """Compute route metrics using real Dijkstra on Hyderabad graph. Always 200."""
    result = await asyncio.get_event_loop().run_in_executor(
        None, lambda: compute_route_metrics(state.hyderabad_graph, num_samples)
    )
    return ok(result)


# ── GAN Evaluation ────────────────────────────────────────

@router.get("/analytics/gan-evaluation", summary="GAN training quality metrics")
async def get_gan_evaluation(request: Request, state: AppState = Depends(get_state)):
    """Returns GAN evaluation or graceful 'not_trained' status. Always 200."""
    result = await asyncio.get_event_loop().run_in_executor(None, compute_gan_evaluation)
    return ok(result)


# ── Agent Performance ─────────────────────────────────────

@router.get("/analytics/agent-performance", summary="Q-Learning agent performance")
async def get_agent_performance(request: Request, state: AppState = Depends(get_state)):
    """Evaluate Q-Learning agent. Returns graceful fallback if not trained. Always 200."""
    result = await asyncio.get_event_loop().run_in_executor(
        None, lambda: compute_agent_performance(state.hyderabad_graph, state.q_table)
    )
    return ok(result)


# ── Training History ──────────────────────────────────────

@router.get("/analytics/training-history", summary="Training loss and reward history")
async def get_training_history(request: Request, state: AppState = Depends(get_state)):
    """Return training history in Recharts-compatible format. Always 200."""
    result = compute_training_history(state.training_status)
    return ok(result)


# ── Route Evaluation ──────────────────────────────────────

@router.get("/analytics/route-evaluation", summary="Route generation quality metrics")
async def get_route_evaluation(request: Request, state: AppState = Depends(get_state)):
    """Evaluate route generation quality. Always 200."""
    result = await asyncio.get_event_loop().run_in_executor(
        None, lambda: compute_route_evaluation(state.hyderabad_graph, state.q_table)
    )
    return ok(result)


# ── System Health Radar (Recharts RadarChart) ─────────────

@router.get("/analytics/system-health", summary="System health radar metrics")
async def get_system_health(request: Request, state: AppState = Depends(get_state)):
    """Returns system health in RadarChart array-of-objects format. Always 200."""
    result = compute_system_health(state.hyderabad_graph, state.q_table)
    return ok(result)


# ── Energy Breakdown (Recharts BarChart) ──────────────────

@router.get("/analytics/energy-breakdown", summary="Energy source breakdown")
async def get_energy_breakdown(request: Request, state: AppState = Depends(get_state)):
    """Returns energy breakdown in stacked BarChart format. Always 200."""
    result = compute_energy_breakdown(state.hyderabad_graph)
    return ok(result)
