"""
FastAPI Backend for EV Routing System
======================================
Exposes the EV routing system as REST API endpoints for the web frontend.
"""

from fastapi import FastAPI, HTTPException, BackgroundTasks, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import numpy as np
from datetime import datetime
import asyncio
import json
import os
import sys
import time
import logging
from pathlib import Path
from typing import Optional, List, Any, Dict
from functools import lru_cache

# ── Logging ──────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("ev_routing")

# Add src directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from src.road_graph import RoadGraph, EVState
from src.route_generator import RouteGenerator, EVRoutePlanner
from src.main import EVRoutingSystem
from src.q_learning_agent import QLearningAgent

# ==================== Lifecycle ====================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Modern lifespan handler — replaces deprecated on_event."""
    global system
    try:
        system = EVRoutingSystem()
        system.step1_create_road_network()
        system.step6_create_route_generator()
        logger.info("✅  EV Routing System initialised and ready")
    except Exception as e:
        logger.error("❌  Failed to initialise system: %s", e)
    yield
    # Shutdown cleanup (if needed in the future)
    logger.info("Shutting down EV Routing System")

# ==================== App Init ====================

app = FastAPI(
    title="EV Routing System API",
    description="AI-Powered Electric Vehicle Route Optimization API",
    version="2.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Global state ─────────────────────────────────────
system: Optional[EVRoutingSystem] = None
training_status: Dict[str, Any] = {
    "is_training": False,
    "progress": 0,
    "current_step": "",
    "metrics": {},
}

# ==================== Helpers ====================

def ok(data: Any = None, message: str = "success") -> Dict[str, Any]:
    """Standard success envelope."""
    return {"ok": True, "message": message, "data": data}


def fail(message: str, code: int = 400, detail: Any = None):
    """Raise a structured HTTP error."""
    content: Dict[str, Any] = {"ok": False, "message": message}
    if detail is not None:
        content["detail"] = detail
    raise HTTPException(status_code=code, detail=content)


def require_system():
    """Guard: ensure system is initialised."""
    if system is None:
        fail("System not initialised – start the server first", 503)
    return system


def require_route_gen():
    """Guard: ensure route generator is ready."""
    s = require_system()
    if s.route_generator is None:
        fail("Route generator not ready – train the system first", 503)
    return s

# ==================== Middleware ====================

@app.middleware("http")
async def request_logger(request: Request, call_next):
    """Log every request with timing + expose X-Response-Time header."""
    start = time.perf_counter()
    response = await call_next(request)
    elapsed_ms = (time.perf_counter() - start) * 1000
    response.headers["X-Response-Time"] = f"{elapsed_ms:.1f}ms"
    logger.info(
        "%s %s %s  %.0f ms",
        request.method,
        request.url.path,
        response.status_code,
        elapsed_ms,
    )
    return response


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Catch-all – never leak raw tracebacks to the frontend."""
    logger.exception("Unhandled error on %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=500,
        content={"ok": False, "message": "Internal server error"},
    )

# ==================== Models ====================

from pydantic import BaseModel, Field, field_validator

class EVStateRequest(BaseModel):
    battery_soc: float = Field(..., ge=0, le=100, description="State of charge 0-100")
    current_node: int = Field(..., ge=0)
    battery_capacity_kwh: float = Field(60, gt=0)
    time_minutes: int = Field(480, ge=0)

class RouteRequest(BaseModel):
    source: int = Field(..., ge=0)
    destination: int = Field(..., ge=0)
    ev_state: EVStateRequest
    num_candidates: int = Field(5, ge=1, le=20)

    @field_validator("destination")
    @classmethod
    def source_ne_dest(cls, v, info):
        if "source" in info.data and v == info.data["source"]:
            raise ValueError("source and destination must differ")
        return v

class TrainingConfig(BaseModel):
    grid_size: int = Field(10, ge=3, le=50)
    gan_epochs: int = Field(100, ge=1)
    rl_episodes: int = Field(500, ge=1)
    traffic_samples: int = Field(500, ge=10)
    gan_batch_size: int = Field(32, ge=1)
    rl_max_steps: int = Field(200, ge=10)

# ==================== Response Cache ====================

_road_network_cache: Dict[int, tuple] = {}  # grid_size -> (data, timestamp)
_system_stats_cache: tuple = (None, 0.0)     # (data, timestamp)
_ROAD_NET_TTL = 300   # 5 minutes
_STATS_TTL = 10       # 10 seconds

def _get_cached_road_network(grid_size: int) -> Optional[Dict]:
    if grid_size in _road_network_cache:
        data, ts = _road_network_cache[grid_size]
        if time.time() - ts < _ROAD_NET_TTL:
            return data
    return None

def _get_cached_stats() -> Optional[Dict]:
    data, ts = _system_stats_cache
    if data is not None and time.time() - ts < _STATS_TTL:
        return data
    return None

# ==================== Endpoints ====================

@app.get("/health")
async def health_check():
    return ok({
        "status": "healthy",
        "system_initialized": system is not None,
        "timestamp": datetime.now().isoformat(),
    })


@app.get("/api/road-network")
async def get_road_network(grid_size: int = 10):
    """Return the current road network topology (cached per grid_size)."""
    # Clamp grid size to valid range
    grid_size = max(3, min(grid_size, 50))

    cached = _get_cached_road_network(grid_size)
    if cached is not None:
        return ok(cached)

    s = require_system()
    try:
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
            {"source": int(u), "target": int(v)}
            for u, v in rg.graph.edges()
        ]

        charging_stations = (
            [int(cs) for cs in rg.charging_stations]
            if hasattr(rg, "charging_stations")
            else []
        )

        result = {
            "nodes": rg.num_nodes,
            "edges": rg.graph.number_of_edges(),
            "charging_stations": charging_stations,
            "nodes_pos": nodes_pos,
            "edges_list": edges_list,
        }

        _road_network_cache[grid_size] = (result, time.time())
        return ok(result)
    except HTTPException:
        raise
    except Exception as e:
        fail(f"Failed to fetch road network: {e}")


@app.post("/api/generate-route")
async def generate_route(request: RouteRequest):
    """Generate optimal EV routes between two nodes."""
    s = require_route_gen()
    try:
        node_count = s.road_graph.num_nodes
        if request.source >= node_count or request.destination >= node_count:
            fail(
                f"Node IDs must be in [0, {node_count - 1}]",
                422,
                {"nodes_available": node_count},
            )

        ev_state = EVState(
            battery_soc=request.ev_state.battery_soc,
            current_node=request.ev_state.current_node,
            battery_capacity_kwh=request.ev_state.battery_capacity_kwh,
            time_minutes=request.ev_state.time_minutes,
        )

        routes = s.route_generator.generate_routes(
            source=request.source,
            destination=request.destination,
            ev_state=ev_state,
            num_candidates=request.num_candidates,
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
    except HTTPException:
        raise
    except Exception as e:
        fail(f"Route generation failed: {e}")


@app.get("/api/traffic-patterns")
async def get_traffic_patterns(time_step: int = 12):
    """Generate sample traffic pattern scenarios."""
    s = require_system()
    if s.gan is None:
        fail("Traffic GAN model not trained yet", 503)
    try:
        traffic = s.gan.generate_traffic_scenarios(n_samples=5)
        traffic_data = [
            {"scenario": i, "values": t.flatten().tolist()[:20]}
            for i, t in enumerate(traffic)
        ]
        return ok({"traffic_patterns": traffic_data})
    except HTTPException:
        raise
    except Exception as e:
        fail(f"Traffic generation failed: {e}")


@app.get("/api/training-status")
async def get_training_status():
    """Return current training pipeline status."""
    return ok(training_status)


@app.post("/api/start-training")
async def start_training(config: TrainingConfig, background_tasks: BackgroundTasks):
    """Kick off the full training pipeline in the background."""
    global system, training_status

    if training_status["is_training"]:
        fail("Training already in progress", 409)

    try:
        system_config = {
            "grid_size": config.grid_size,
            "max_battery": 100,
            "battery_capacity_kwh": 60,
            "gan_epochs": config.gan_epochs,
            "gan_batch_size": config.gan_batch_size,
            "gnn_epochs": 50,
            "gnn_batch_size": 16,
            "rl_episodes": config.rl_episodes,
            "rl_max_steps": config.rl_max_steps,
            "traffic_samples": config.traffic_samples,
            "historical_routes": 300,
            "seed": 42,
            "model_dir": "models",
            "results_dir": "results",
            "data_dir": "data",
            "use_gnn_gan": True,
        }

        # Create a new training system but keep the old one until training succeeds
        training_system = EVRoutingSystem(system_config)
        training_status.update({
            "is_training": True,
            "progress": 0,
            "current_step": "Queued",
            "metrics": {},
        })

        background_tasks.add_task(run_training_pipeline, training_system)
        logger.info("Training started with config: %s", config.dict())
        return ok({"status": "training_started"})
    except HTTPException:
        raise
    except Exception as e:
        fail(f"Failed to start training: {e}")


@app.post("/api/stop-training")
async def stop_training():
    """Request graceful stop of training."""
    global training_status
    if not training_status["is_training"]:
        fail("No training is currently running", 409)
    training_status["is_training"] = False
    logger.info("Training stop requested")
    return ok({"status": "training_stopped"})


@app.get("/api/route-metrics")
async def get_route_metrics(num_samples: int = 10):
    """Sample random routes and return aggregate metrics."""
    s = require_route_gen()
    try:
        distances, energies, times, feasibilities = [], [], [], []

        for _ in range(min(num_samples, 50)):  # cap at 50
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
    except HTTPException:
        raise
    except Exception as e:
        fail(f"Metrics generation failed: {e}")


@app.post("/api/save-route")
async def save_route(request: RouteRequest):
    """Bookmark a route for later reference."""
    return ok({
        "status": "saved",
        "route": {"source": request.source, "destination": request.destination},
    })


@app.get("/api/system-stats")
async def get_system_stats():
    """Aggregate system statistics (cached 10s)."""
    global _system_stats_cache
    cached = _get_cached_stats()
    if cached is not None:
        return ok(cached)

    s = require_system()
    try:
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
            "training_status": training_status,
        }
        _system_stats_cache = (result, time.time())
        return ok(result)
    except HTTPException:
        raise
    except Exception as e:
        fail(f"Failed to fetch system stats: {e}")

# ==================== Background Tasks ====================

async def run_training_pipeline(sys: EVRoutingSystem):
    """Run the full training pipeline in background."""
    global training_status, system
    steps = [
        (10,  "Creating road network",      lambda: sys.step1_create_road_network()),
        (25,  "Generating traffic data",     lambda: sys.step2_generate_traffic_data()),
        (40,  "Training traffic GAN",        None),  # needs return value from step 2
        (55,  "Creating RL environment",     lambda: sys.step4_create_environment()),
        (75,  "Training Q-Learning agent",   lambda: sys.step5_train_agent()),
        (85,  "Creating route generator",    lambda: sys.step6_create_route_generator()),
        (95,  "Evaluating system",           None),
    ]
    try:
        # Step 1
        training_status["current_step"] = "Creating road network"
        training_status["progress"] = 10
        sys.step1_create_road_network()

        # Step 2
        training_status["current_step"] = "Generating traffic data"
        training_status["progress"] = 25
        traffic_data = sys.step2_generate_traffic_data()

        # Step 3
        training_status["current_step"] = "Training traffic GAN"
        training_status["progress"] = 40
        sys.step3_train_gan(traffic_data)

        # Step 4
        training_status["current_step"] = "Creating RL environment"
        training_status["progress"] = 55
        sys.step4_create_environment()

        if not training_status["is_training"]:
            training_status["current_step"] = "Stopped by user"
            logger.info("Training stopped by user after environment creation")
            return

        # Step 5
        training_status["current_step"] = "Training Q-Learning agent"
        training_status["progress"] = 75
        sys.step5_train_agent()

        # Step 6
        training_status["current_step"] = "Creating route generator"
        training_status["progress"] = 85
        sys.step6_create_route_generator()

        # Step 7
        training_status["current_step"] = "Evaluating system"
        training_status["progress"] = 95
        results = sys.step7_evaluate_system()
        training_status["metrics"] = results

        training_status["progress"] = 100
        training_status["current_step"] = "Complete"
        training_status["is_training"] = False
        # Only replace the global system after successful training
        system = sys
        logger.info("✅  Training pipeline completed successfully")

    except Exception as e:
        training_status["is_training"] = False
        training_status["current_step"] = f"Error: {str(e)}"
        logger.error("Training pipeline failed: %s", e, exc_info=True)

# ==================== Static Files ====================

frontend_path = Path(__file__).parent / "frontend" / "dist"
if frontend_path.exists():
    app.mount("/", StaticFiles(directory=str(frontend_path), html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
