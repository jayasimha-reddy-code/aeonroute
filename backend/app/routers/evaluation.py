"""Evaluation and Benchmark API Router.

Provides endpoints for:
  - POST /api/evaluate      — run evaluation on specified algorithms
  - POST /api/benchmark     — run benchmark suite (background task)
  - GET  /api/benchmark/status — check benchmark progress
  - GET  /api/benchmark/results — retrieve latest results
"""

from __future__ import annotations

import logging
import os
import random
import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, BackgroundTasks, Depends

from backend.app.state import AppState, get_state
from backend.app.models.requests import EvaluationRequest, BenchmarkRequest
from backend.app.models.responses import ok, fail

router = APIRouter(prefix="/api", tags=["Evaluation"])
logger = logging.getLogger("ev_routing")

# In-memory benchmark status (suitable for single-worker server)
# Moved to AppState.benchmark_status

_ALGORITHMS = ["dijkstra", "astar", "eco", "scenic", "q_learning", "gnn", "hybrid"]


def _run_algorithm_sample(
    state: AppState,
    algorithm: str,
    source: int,
    dest: int,
    battery_soc: float = 80.0,
    battery_capacity_kwh: float = 60.0,
) -> Optional[Dict[str, Any]]:
    """Run one route sample and return metrics. Returns None on failure."""
    from backend.app.services.routing_service import generate_route
    t0 = time.perf_counter()
    try:
        result = generate_route(
            state, source, dest, battery_soc, battery_capacity_kwh,
            route_mode=algorithm, energy_weight=0.18,
        )
        elapsed_ms = (time.perf_counter() - t0) * 1000
        props = result["route"]["properties"]
        return {
            "algorithm": algorithm,
            "success": True,
            "distance_km": props.get("distance_km", 0),
            "energy_kwh": props.get("energy_kwh", 0),
            "time_minutes": props.get("time_minutes", 0),
            "computation_ms": elapsed_ms,
        }
    except Exception as exc:
        elapsed_ms = (time.perf_counter() - t0) * 1000
        logger.debug("Sample failed for %s: %s", algorithm, exc)
        return {
            "algorithm": algorithm,
            "success": False,
            "distance_km": 0,
            "energy_kwh": 0,
            "time_minutes": 0,
            "computation_ms": elapsed_ms,
        }


def _aggregate_results(raw: List[Dict]) -> Dict[str, Dict]:
    """Aggregate per-sample results into per-algorithm statistics."""
    by_algo: Dict[str, List[Dict]] = {}
    for r in raw:
        by_algo.setdefault(r["algorithm"], []).append(r)

    agg = {}
    for alg, samples in by_algo.items():
        successes = [s for s in samples if s["success"]]
        total = len(samples)
        agg[alg] = {
            "algorithm": alg,
            "success_rate": round(len(successes) / max(total, 1), 3),
            "avg_distance_km": round(
                sum(s["distance_km"] for s in successes) / max(len(successes), 1), 3
            ),
            "avg_energy_kwh": round(
                sum(s["energy_kwh"] for s in successes) / max(len(successes), 1), 3
            ),
            "avg_time_minutes": round(
                sum(s["time_minutes"] for s in successes) / max(len(successes), 1), 1
            ),
            "avg_computation_ms": round(
                sum(s["computation_ms"] for s in samples) / max(total, 1), 1
            ),
            "num_samples": total,
        }
    return agg


# ─────────────────────────────────────────────────────────────────────────────
# Endpoints
# ─────────────────────────────────────────────────────────────────────────────


@router.post("/evaluate", summary="Evaluate routing algorithms")
async def run_evaluation(
    req: EvaluationRequest,
    state: AppState = Depends(get_state),
):
    """Run synchronous evaluation on one or more algorithms.

    Generates `num_samples` random routes and returns aggregate metrics.
    """
    hg = state.hyderabad_graph
    if hg is None:
        fail("Graph not loaded — server still initialising", 503)

    algorithms = req.algorithms or ["dijkstra", "eco", "astar", "gnn", "hybrid"]
    # Filter to valid modes
    algorithms = [a for a in algorithms if a in _ALGORITHMS]

    num_samples = req.num_samples
    rng = random.Random(42)

    raw_results: List[Dict] = []
    for _ in range(num_samples):
        src = req.source_node if req.source_node is not None else rng.randint(0, hg.num_nodes - 1)
        dst = req.dest_node if req.dest_node is not None else rng.randint(0, hg.num_nodes - 1)
        if src == dst:
            dst = (dst + 1) % hg.num_nodes

        for alg in algorithms:
            result = _run_algorithm_sample(state, alg, src, dst)
            if result:
                raw_results.append(result)

    aggregated = _aggregate_results(raw_results)
    results_list = list(aggregated.values())

    # Build comparison table (sorted by avg_distance_km)
    comparison_table = sorted(results_list, key=lambda x: x.get("avg_distance_km", 999))

    return ok({
        "results": results_list,
        "comparison_table": comparison_table,
        "evaluated_at": datetime.now(timezone.utc).isoformat(),
        "num_samples": num_samples,
        "algorithms": algorithms,
    })


@router.post("/benchmark", summary="Start benchmark suite (background)")
async def start_benchmark(
    req: BenchmarkRequest,
    background_tasks: BackgroundTasks,
    state: AppState = Depends(get_state),
):
    """Start a comprehensive benchmark in the background.

    Returns immediately with task_id. Poll /api/benchmark/status for progress.
    """
    if state.benchmark_status["running"]:
        return ok({
            "status": "running",
            "task_id": state.benchmark_status["task_id"],
            "message": "Benchmark already running",
        })

    hg = state.hyderabad_graph
    if hg is None:
        fail("Graph not loaded", 503)

    task_id = f"bench_{int(time.time())}"
    state.benchmark_status.update({
        "running": True,
        "task_id": task_id,
        "results": None,
        "csv_path": None,
        "error": None,
        "started_at": datetime.now(timezone.utc).isoformat(),
        "completed_at": None,
    })

    background_tasks.add_task(_benchmark_task, state, req, task_id)
    return ok({"status": "started", "task_id": task_id})


@router.get("/benchmark/status", summary="Get benchmark status")
async def get_benchmark_status(state: AppState = Depends(get_state)):
    return ok(state.benchmark_status)


@router.get("/benchmark/results", summary="Get latest benchmark results")
async def get_benchmark_results(state: AppState = Depends(get_state)):
    if state.benchmark_status["results"] is None:
        return ok({"status": "no_results", "message": "No benchmark has completed yet."})
    return ok({
        "status": "complete",
        "results": state.benchmark_status["results"],
        "csv_path": state.benchmark_status.get("csv_path"),
        "completed_at": state.benchmark_status.get("completed_at"),
    })


# ─────────────────────────────────────────────────────────────────────────────
# Background Task
# ─────────────────────────────────────────────────────────────────────────────


def _benchmark_task(state: AppState, req: BenchmarkRequest, task_id: str) -> None:
    """Heavy benchmark — runs in FastAPI background task."""
    try:
        hg = state.hyderabad_graph
        algorithms = req.algorithms or ["dijkstra", "eco", "astar", "q_learning", "gnn", "hybrid"]
        algorithms = [a for a in algorithms if a in _ALGORITHMS]

        rng = random.Random(123)
        raw_results: List[Dict] = []

        for i in range(req.num_routes):
            src = rng.randint(0, hg.num_nodes - 1)
            dst = rng.randint(0, hg.num_nodes - 1)
            while dst == src:
                dst = rng.randint(0, hg.num_nodes - 1)

            for alg in algorithms:
                result = _run_algorithm_sample(state, alg, src, dst)
                if result:
                    result["route_idx"] = i
                    raw_results.append(result)

        aggregated = _aggregate_results(raw_results)
        results_list = list(aggregated.values())

        # Save CSV if requested
        csv_path = None
        if req.output_csv:
            try:
                import csv as csv_mod
                os.makedirs("results/benchmark", exist_ok=True)
                csv_path = f"results/benchmark/benchmark_{task_id}.csv"
                if results_list:
                    with open(csv_path, "w", newline="") as f:
                        writer = csv_mod.DictWriter(f, fieldnames=list(results_list[0].keys()))
                        writer.writeheader()
                        writer.writerows(results_list)
            except Exception as e:
                logger.warning("Failed to write benchmark CSV: %s", e)

        state.benchmark_status.update({
            "running": False,
            "results": results_list,
            "csv_path": csv_path,
            "completed_at": datetime.now(timezone.utc).isoformat(),
        })

    except Exception as e:
        logger.error("Benchmark task failed: %s", e, exc_info=True)
        state.benchmark_status.update({
            "running": False,
            "error": str(e),
            "completed_at": datetime.now(timezone.utc).isoformat(),
        })
