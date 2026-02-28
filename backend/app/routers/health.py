from fastapi import APIRouter, Depends, Request
from datetime import datetime
import os
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

    # Derive last_trained_at from training status or Q-table file mtime
    last_trained_at = None
    if state.training_status.get("completed_at"):
        last_trained_at = state.training_status["completed_at"]
    else:
        q_path = "models/q_learning/q_table_hyderabad.pkl"
        if os.path.exists(q_path):
            from datetime import timezone
            mtime = os.path.getmtime(q_path)
            last_trained_at = datetime.fromtimestamp(mtime, tz=timezone.utc).isoformat()

    # Derive q_learning_accuracy from last training metrics (success rate or reward-based)
    q_learning_accuracy: float | None = None
    ts_metrics = state.training_status.get("metrics", {})
    if ts_metrics:
        final_reward = ts_metrics.get("final_avg_reward")
        if final_reward is not None:
            # Normalise: reward ≈ 0 → 100 %, reward ≤ -10 → 0 %
            q_learning_accuracy = round(max(0.0, min(1.0, 1.0 + final_reward / 10.0)), 4)
    # Fallback: try evaluation results on disk
    if q_learning_accuracy is None:
        _eval_path = "results/metrics/evaluation_results.json"
        if os.path.exists(_eval_path):
            try:
                import json as _json
                with open(_eval_path) as _f:
                    _eval = _json.load(_f)
                _sr = (_eval.get("agent") or {}).get("success_rate")
                if _sr is not None:
                    q_learning_accuracy = round(float(_sr), 4)
            except Exception:
                pass

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
            # Frontend-expected fields
            "gan_trained": os.path.exists("models/sg_gan/traffic_gan_generator.keras"),
            "agent_trained": state.q_table is not None or os.path.exists("models/q_learning/q_table_hyderabad.pkl"),
            "gnn_gan_trained": os.path.exists("models/gnn_gan"),
            # NEW: real accuracy + training timestamp
            "last_trained_at": last_trained_at,
            "q_learning_accuracy": q_learning_accuracy,
        },
        "training_status": state.training_status,
    }
    state.system_stats_cache["stats"] = result
    return ok(result)


@router.get("/api/system-health", summary="Real-time CPU and memory metrics")
async def get_system_health(request: Request):
    """Returns live CPU %, memory %, and Python/uptime metadata via psutil."""
    try:
        import psutil, time
        cpu_pct  = psutil.cpu_percent(interval=0.2)
        mem      = psutil.virtual_memory()
        uptime_s = int(time.time() - psutil.boot_time())
        import platform
        return ok({
            "cpu_percent":     round(cpu_pct, 1),
            "memory_percent":  round(mem.percent, 1),
            "memory_used_gb":  round(mem.used  / 1024**3, 2),
            "memory_total_gb": round(mem.total / 1024**3, 2),
            "python_version":  platform.python_version(),
            "uptime_seconds":  uptime_s,
        })
    except ImportError:
        # psutil not installed — return dash values so UI shows "—"
        return ok({
            "cpu_percent":     None,
            "memory_percent":  None,
            "memory_used_gb":  None,
            "memory_total_gb": None,
            "python_version":  None,
            "uptime_seconds":  None,
        })
