"""
FastAPI Backend for EV Routing System
======================================
Exposes the EV routing system as REST API endpoints for the web frontend.
Production-ready with rate limiting, structured logging, and security hardening.
"""

from fastapi import FastAPI, HTTPException, BackgroundTasks, Request, Response
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
import uuid
from contextvars import ContextVar
from pathlib import Path
from typing import Optional, List, Any, Dict
from functools import lru_cache
from pydantic import BaseModel, Field, field_validator

# ── Correlation ID context ────────────────────────────
_request_id_ctx: ContextVar[str] = ContextVar("request_id", default="-")

# ── Structured Logging ───────────────────────────────
LOG_FORMAT = os.getenv("LOG_FORMAT", "json")

class _StructuredFormatter(logging.Formatter):
    """JSON structured log formatter with correlation ID support."""
    def format(self, record: logging.LogRecord) -> str:
        log = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "request_id": _request_id_ctx.get("-"),
        }
        if record.exc_info and record.exc_info[0]:
            log["exception"] = self.formatException(record.exc_info)
        # Merge extra fields attached by middleware
        for k in ("method", "path", "status", "duration_ms"):
            if hasattr(record, k):
                log[k] = getattr(record, k)
        return json.dumps(log, default=str)

_handler = logging.StreamHandler()
if LOG_FORMAT == "json":
    _handler.setFormatter(_StructuredFormatter())
else:
    _handler.setFormatter(logging.Formatter(
        "%(asctime)s  %(levelname)-8s  [%(request_id)s]  %(message)s",
        datefmt="%H:%M:%S",
        defaults={"request_id": "-"},
    ))

logging.basicConfig(level=logging.INFO, handlers=[_handler], force=True)
logger = logging.getLogger("ev_routing")

# Add src directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from src.road_graph import RoadGraph, EVState
from src.route_generator import RouteGenerator, EVRoutePlanner
from src.main import EVRoutingSystem
from src.q_learning_agent import QLearningAgent

# ── Rate Limiting ─────────────────────────────────────
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

limiter = Limiter(key_func=get_remote_address, default_limits=["60/minute"])

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
    logger.info("Shutting down EV Routing System")

# ==================== OpenAPI Metadata ====================

tags_metadata = [
    {"name": "System", "description": "Health checks and system statistics"},
    {"name": "Routing", "description": "EV route generation and optimization"},
    {"name": "Training", "description": "ML model training pipeline management"},
    {"name": "Analytics", "description": "Route metrics and traffic pattern analysis"},
]

# ==================== App Init ====================

app = FastAPI(
    title="EV Routing System API",
    description=(
        "AI-Powered Electric Vehicle Route Optimization API.\n\n"
        "Uses SG-GAN for traffic generation, graph-based road networks, "
        "and Q-Learning for optimal EV routing decisions."
    ),
    version="2.0.0",
    lifespan=lifespan,
    openapi_tags=tags_metadata,
    contact={"name": "EV Routing Team", "url": "https://github.com/ev-routing"},
    license_info={"name": "MIT", "url": "https://opensource.org/licenses/MIT"},
)

# Register rate limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS — configurable via env
_cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
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

# ==================== Response Models ====================

class APIResponse(BaseModel):
    """Standard API response envelope."""
    ok: bool = True
    message: str = "success"
    data: Any = None

class HealthData(BaseModel):
    status: str
    system_initialized: bool
    timestamp: str

class RouteData(BaseModel):
    path: List[int]
    distance_km: float
    energy_kwh: float
    time_minutes: float
    feasibility_score: float
    charging_stops: List[Any] = []

class RoutesResponse(BaseModel):
    routes: List[RouteData]
    count: int

class MetricsData(BaseModel):
    avg_distance_km: float
    avg_energy_kwh: float
    avg_time_minutes: float
    avg_feasibility: float
    samples: int

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

# Request body size limit (1 MB)
_MAX_BODY_SIZE = int(os.getenv("MAX_BODY_SIZE", 1_048_576))

@app.middleware("http")
async def security_headers_middleware(request: Request, call_next):
    """Add security headers to all responses."""
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    return response


@app.middleware("http")
async def request_logger(request: Request, call_next):
    """Log every request with timing, correlation ID, and structured fields."""
    # Correlation ID
    request_id = request.headers.get("X-Request-ID", str(uuid.uuid4())[:8])
    _request_id_ctx.set(request_id)

    # Body size check for POST/PUT/PATCH
    if request.method in ("POST", "PUT", "PATCH"):
        content_length = request.headers.get("content-length")
        if content_length and int(content_length) > _MAX_BODY_SIZE:
            return JSONResponse(
                status_code=413,
                content={"ok": False, "message": "Request body too large (max 1 MB)"},
            )

    start = time.perf_counter()
    response = await call_next(request)
    elapsed_ms = (time.perf_counter() - start) * 1000

    response.headers["X-Response-Time"] = f"{elapsed_ms:.1f}ms"
    response.headers["X-Request-ID"] = request_id

    logger.info(
        "%s %s %s  %.0f ms",
        request.method,
        request.url.path,
        response.status_code,
        elapsed_ms,
        extra={
            "method": request.method,
            "path": request.url.path,
            "status": response.status_code,
            "duration_ms": round(elapsed_ms, 1),
        },
    )
    return response


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Catch-all – never leak raw tracebacks to the frontend."""
    logger.exception(
        "Unhandled error on %s %s", request.method, request.url.path,
        extra={"method": request.method, "path": request.url.path},
    )
    return JSONResponse(
        status_code=500,
        content={"ok": False, "message": "Internal server error"},
    )

# ==================== Request Models ====================

class EVStateRequest(BaseModel):
    battery_soc: float = Field(..., ge=0, le=100, description="State of charge (0-100%)")
    current_node: int = Field(..., ge=0, le=9999, description="Current node ID")
    battery_capacity_kwh: float = Field(60, gt=0, le=500, description="Battery capacity in kWh")
    time_minutes: int = Field(480, ge=0, le=1440, description="Current time of day in minutes")

class RouteRequest(BaseModel):
    source: int = Field(..., ge=0, le=9999, description="Source node ID")
    destination: int = Field(..., ge=0, le=9999, description="Destination node ID")
    ev_state: EVStateRequest
    num_candidates: int = Field(5, ge=1, le=20, description="Number of candidate routes")

    @field_validator("destination")
    @classmethod
    def source_ne_dest(cls, v, info):
        if "source" in info.data and v == info.data["source"]:
            raise ValueError("source and destination must differ")
        return v

class TrainingConfig(BaseModel):
    grid_size: int = Field(10, ge=3, le=50, description="Road network grid size")
    gan_epochs: int = Field(100, ge=1, le=1000, description="GAN training epochs")
    rl_episodes: int = Field(500, ge=1, le=5000, description="RL training episodes")
    traffic_samples: int = Field(500, ge=10, le=5000, description="Number of traffic samples")
    gan_batch_size: int = Field(32, ge=1, le=256, description="GAN batch size")
    rl_max_steps: int = Field(200, ge=10, le=1000, description="Max steps per RL episode")

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

@app.get("/health", tags=["System"], summary="Health check",
         description="Returns system health status and initialization state.")
@limiter.limit("120/minute")
async def health_check(request: Request):
    return ok({
        "status": "healthy",
        "system_initialized": system is not None,
        "timestamp": datetime.now().isoformat(),
    })


@app.get("/api/road-network", tags=["Routing"], summary="Get road network",
         description="Return the current road network topology with node positions and edges. Cached for 5 minutes per grid size.")
@limiter.limit("30/minute")
async def get_road_network(request: Request, grid_size: int = 10):
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


@app.post("/api/generate-route", tags=["Routing"], summary="Generate EV route",
          description="Generate optimal EV routes between two nodes considering battery state, charging stations, and traffic conditions.")
@limiter.limit("30/minute")
async def generate_route(request: Request, route_req: RouteRequest):
    """Generate optimal EV routes between two nodes."""
    s = require_route_gen()
    try:
        node_count = s.road_graph.num_nodes
        if route_req.source >= node_count or route_req.destination >= node_count:
            fail(
                f"Node IDs must be in [0, {node_count - 1}]",
                422,
                {"nodes_available": node_count},
            )

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
    except HTTPException:
        raise
    except Exception as e:
        fail(f"Route generation failed: {e}")


@app.get("/api/traffic-patterns", tags=["Analytics"], summary="Get traffic patterns",
         description="Generate sample traffic pattern scenarios using the trained GAN model.")
@limiter.limit("30/minute")
async def get_traffic_patterns(request: Request, time_step: int = 12):
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


@app.get("/api/training-status", tags=["Training"], summary="Training status",
         description="Return current training pipeline status including progress and metrics.")
@limiter.limit("60/minute")
async def get_training_status(request: Request):
    return ok(training_status)


@app.post("/api/start-training", tags=["Training"], summary="Start training",
          description="Kick off the full ML training pipeline (SG-GAN + Q-Learning) in the background.")
@limiter.limit("5/minute")
async def start_training(request: Request, config: TrainingConfig, background_tasks: BackgroundTasks):
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

        training_system = EVRoutingSystem(system_config)
        training_status.update({
            "is_training": True,
            "progress": 0,
            "current_step": "Queued",
            "metrics": {},
        })

        background_tasks.add_task(run_training_pipeline, training_system)
        logger.info("Training started with config: %s", config.model_dump())
        return ok({"status": "training_started"})
    except HTTPException:
        raise
    except Exception as e:
        fail(f"Failed to start training: {e}")


@app.post("/api/stop-training", tags=["Training"], summary="Stop training",
          description="Request graceful stop of any running training pipeline.")
@limiter.limit("10/minute")
async def stop_training(request: Request):
    global training_status
    if not training_status["is_training"]:
        fail("No training is currently running", 409)
    training_status["is_training"] = False
    logger.info("Training stop requested")
    return ok({"status": "training_stopped"})


@app.get("/api/route-metrics", tags=["Analytics"], summary="Route metrics",
         description="Sample random routes and return aggregate performance metrics including distance, energy, time, and feasibility.")
@limiter.limit("30/minute")
async def get_route_metrics(request: Request, num_samples: int = 10):
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


@app.post("/api/save-route", tags=["Routing"], summary="Save route",
          description="Bookmark a route for later reference.")
@limiter.limit("30/minute")
async def save_route(request: Request, route_req: RouteRequest):
    return ok({
        "status": "saved",
        "route": {"source": route_req.source, "destination": route_req.destination},
    })


@app.get("/api/system-stats", tags=["System"], summary="System statistics",
         description="Aggregate system statistics including road network info, model status, and training state. Cached for 10 seconds.")
@limiter.limit("60/minute")
async def get_system_stats(request: Request):
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
