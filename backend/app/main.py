"""FastAPI application factory for the EV Routing System."""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import logging

from backend.app.state import get_state
from backend.app.middleware import register_middleware
from backend.app.routers import health, routing, training, analytics
from backend.app.routers import evaluation
from src.config import get_settings

logger = logging.getLogger("ev_routing")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load Hyderabad graph + charging stations on startup. CPU-only, no CUDA."""
    state = get_state()
    try:
        # Load real Hyderabad road graph (cached after first download)
        from backend.app.services.graph_service import get_hyderabad_graph
        from backend.app.services.station_service import get_charging_stations, snap_stations_to_graph
        from backend.app.config import settings

        hgraph = get_hyderabad_graph()
        stations = get_charging_stations(settings.OSMNX_CENTER_LAT, settings.OSMNX_CENTER_LON)
        snap_stations_to_graph(stations, hgraph)

        state.hyderabad_graph = hgraph
        state.charging_stations = stations
        logger.info(
            "Hyderabad graph loaded: %d nodes, %d edges, %d stations",
            hgraph.num_nodes, hgraph.num_edges, len(stations),
        )

        # Initialize spatial index for O(log n) nearest-station lookup
        try:
            from backend.app.services.spatial_index import StationSpatialIndex
            state.spatial_index = StationSpatialIndex(stations)
            logger.info("Spatial index built for %d charging stations", len(stations))
        except Exception as e:
            logger.warning("Spatial index init failed: %s", e)

        # Initialize GNN routing service (non-fatal if model not trained)
        try:
            from backend.app.services.gnn_routing_service import GNNRoutingService
            gnn_svc = GNNRoutingService()
            gnn_svc.load_model(graph=hgraph)
            state.gnn_service = gnn_svc
            logger.info("GNN service initialized (model loaded: %s)", gnn_svc.is_loaded)
        except Exception as e:
            logger.warning("GNN service init failed: %s. GNN/Hybrid modes will use heuristics.", e)

    except Exception as e:
        logger.error("Failed to initialise Hyderabad graph: %s", e)
        logger.warning("Server starting without graph — endpoints will return errors")
    yield
    logger.info("Shutting down EV Routing System")



tags_metadata = [
    {"name": "System", "description": "Health checks and system statistics"},
    {"name": "Routing", "description": "EV route generation and optimization"},
    {"name": "Training", "description": "ML model training pipeline management"},
    {"name": "Analytics", "description": "Route metrics and traffic pattern analysis"},
]


def create_app() -> FastAPI:
    settings = get_settings()
    limiter = Limiter(key_func=get_remote_address, default_limits=["60/minute"])

    app = FastAPI(
        title="EV Routing System API",
        description="Electric Vehicle Route Optimization API.",
        version="2.0.0",
        lifespan=lifespan,
        openapi_tags=tags_metadata,
        contact={"name": "EV Routing Team", "url": "https://github.com/ev-routing"},
        license_info={"name": "MIT", "url": "https://opensource.org/licenses/MIT"},
    )

    # Rate limiter
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

    # CORS — allow_methods="*" lets CORSMiddleware handle OPTIONS preflights correctly
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?$",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Custom middleware
    register_middleware(app)

    # Routers
    app.include_router(health.router)
    app.include_router(routing.router)
    app.include_router(training.router)
    app.include_router(analytics.router)
    app.include_router(evaluation.router)

    # Static files (must be last -- catches all unmatched routes)
    frontend_path = settings.frontend_dist_path
    if frontend_path.exists():
        app.mount("/", StaticFiles(directory=str(frontend_path), html=True), name="static")

    return app
