# Phase 02: Backend Restructure — RESEARCH

> **Date:** 2026-02-16
> **Phase Researcher Output**
> **Scope:** FastAPI monolith breakup, DI, SSE, threading, caching, regression testing

---

## Standard Stack

### Libraries (all already available or one `pip install` away)

| Library | Version | Purpose | Already in project? |
|---------|---------|---------|---------------------|
| **FastAPI** | 0.115.6 | Web framework | Yes (requirements-api.txt) |
| **Pydantic / pydantic-settings** | 2.10.4 | Request/response models, config | Yes |
| **slowapi** | >=0.1.9 | Rate limiting | Yes |
| **sse-starlette** | >=2.0 | Server-Sent Events helper | **No — add** |
| **cachetools** | >=5.3 | TTLCache, LRUCache | **No — add** |
| **uvicorn** | 0.34.0 | ASGI server | Yes |
| **httpx** | >=0.28.0 | Async test client | Yes (requirements-dev.txt) |
| **pytest-asyncio** | >=0.25.0 | Async test support | Yes |

### Libraries explicitly NOT needed

| Library | Why skip |
|---------|----------|
| Celery / arq | Overkill — single-process demo, ThreadPoolExecutor is sufficient |
| Redis | No shared state needed across processes |
| WebSocket | One-way stream only — SSE is simpler and purpose-built |
| HTTPX `AsyncClient` for SSE tests | `TestClient` + `iter_lines()` covers SSE |

---

## Architecture Patterns

### 1. Target Directory Layout

```
backend/
 app/
    __init__.py            # Package marker (empty or re-exports create_app)
    main.py                # create_app() factory + lifespan
    state.py               # AppState dataclass + get_state() provider
    dependencies.py        # All Depends() providers (state, services, settings)
    middleware.py           # All middleware (security headers, request logger, body size)
    models/
       __init__.py
       requests.py        # EVStateRequest, RouteRequest, TrainingConfig
       responses.py       # APIResponse, ok(), fail(), RouteData, etc.
    routers/
       __init__.py
       health.py          # GET /health
       routing.py         # /api/road-network, /api/generate-route, /api/save-route
       training.py        # /api/training-status, /api/start-training, /api/stop-training, /api/training/stream
       analytics.py       # /api/traffic-patterns, /api/route-metrics, /api/system-stats
    services/
        __init__.py
        routing_service.py     # Road network + route generation business logic
        training_service.py    # Training pipeline + SSE generator
```

**Rationale:** Flat-enough to be navigable (no 5-level nesting), deep-enough to separate concerns. Middleware stays in one file (4 middleware functions, ~80 lines — no need for sub-package).

### 2. AppState Class + Dependency Injection

**Pattern: dataclass singleton + module-level instance + `Depends()` providers.**

```python
# backend/app/state.py
from dataclasses import dataclass, field
from typing import Optional, Any, Dict
from cachetools import TTLCache
from src.main import EVRoutingSystem

@dataclass
class AppState:
    system: Optional[EVRoutingSystem] = None
    training_status: Dict[str, Any] = field(default_factory=lambda: {
        "is_training": False,
        "progress": 0,
        "current_step": "",
        "metrics": {},
    })
    road_network_cache: TTLCache = field(default_factory=lambda: TTLCache(maxsize=16, ttl=300))
    system_stats_cache: TTLCache = field(default_factory=lambda: TTLCache(maxsize=1, ttl=10))

# Module-level singleton
_state = AppState()

def get_state() -> AppState:
    """Dependency provider — returns the singleton AppState."""
    return _state

def reset_state() -> None:
    """For testing — reset to fresh state."""
    global _state
    _state = AppState()
```

**Why NOT `app.state`:** FastAPI's `app.state` requires passing `Request` into every handler to access `request.app.state`. A module-level singleton with `Depends(get_state)` is cleaner — handlers declare `state: AppState = Depends(get_state)` and the signature is explicit + overridable in tests via `dependency_overrides`.

**Why NOT `@lru_cache`:** `@lru_cache` works for immutable singletons (like Settings). `AppState` is mutable (training_status changes) — a simple module-level variable is more obvious than a cached factory.

### 3. Lifespan Handler

```python
# backend/app/main.py
from contextlib import asynccontextmanager
from fastapi import FastAPI
from app.state import get_state
from src.main import EVRoutingSystem
import logging

logger = logging.getLogger("ev_routing")

@asynccontextmanager
async def lifespan(app: FastAPI):
    state = get_state()
    try:
        state.system = EVRoutingSystem()
        state.system.step1_create_road_network()
        state.system.step6_create_route_generator()
        logger.info("EV Routing System initialised")
    except Exception as e:
        logger.error("Failed to initialise system: %s", e)
    yield
    logger.info("Shutting down EV Routing System")

def create_app() -> FastAPI:
    app = FastAPI(
        title="EV Routing System API",
        version="2.0.0",
        lifespan=lifespan,
    )
    # ... register middleware, routers
    return app
```

### 4. Router Registration Pattern

```python
# Each router file:
from fastapi import APIRouter, Depends
router = APIRouter(prefix="/api", tags=["Routing"])

# In main.py create_app():
from app.routers import health, routing, training, analytics

app.include_router(health.router)        # /health (no prefix)
app.include_router(routing.router)       # /api/road-network, /api/generate-route, etc.
app.include_router(training.router)      # /api/training-status, /api/start-training, etc.
app.include_router(analytics.router)     # /api/traffic-patterns, /api/route-metrics, etc.
```

**Prefix convention:**
- `health.router`: no prefix (`/health` at root)
- All others: `prefix="/api"`
- Tags match current OpenAPI tags: System, Routing, Training, Analytics

### 5. SSE Streaming for Training Progress

**Use `sse-starlette`** — it handles event ID, retry, and proper `text/event-stream` formatting:

```python
# backend/app/routers/training.py
from sse_starlette.sse import EventSourceResponse
import asyncio, json

@router.get("/training/stream", tags=["Training"])
async def training_stream(state: AppState = Depends(get_state)):
    async def event_generator():
        last_progress = -1
        while True:
            progress = state.training_status["progress"]
            if progress != last_progress:
                yield {
                    "event": "progress",
                    "data": json.dumps(state.training_status),
                }
                last_progress = progress

            if not state.training_status["is_training"] and progress >= 100:
                yield {"event": "complete", "data": json.dumps(state.training_status)}
                break
            if not state.training_status["is_training"] and progress < 100 and progress > 0:
                yield {"event": "stopped", "data": json.dumps(state.training_status)}
                break
            await asyncio.sleep(0.5)

    return EventSourceResponse(event_generator())
```

**Why `sse-starlette` over raw `StreamingResponse`:**
- Handles `text/event-stream` content type automatically
- Supports `event:` field (allows frontend to use `addEventListener("progress", ...)`)
- Handles client disconnect detection
- Adds `retry:` hint for automatic reconnection
- 2.4M monthly PyPI downloads, used in official FastAPI examples

### 6. ThreadPoolExecutor for ML Training

```python
# backend/app/services/training_service.py
import asyncio
from concurrent.futures import ThreadPoolExecutor

_executor = ThreadPoolExecutor(max_workers=1, thread_name_prefix="ml-train")

class TrainingService:
    def __init__(self, state: AppState):
        self.state = state

    async def start_training(self, config: TrainingConfig) -> None:
        if self.state.training_status["is_training"]:
            raise HTTPException(409, "Training already in progress")

        self.state.training_status.update({
            "is_training": True, "progress": 0,
            "current_step": "Queued", "metrics": {},
        })

        loop = asyncio.get_running_loop()
        loop.run_in_executor(_executor, self._run_pipeline, config)

    def _run_pipeline(self, config: TrainingConfig):
        """Synchronous — runs in ThreadPoolExecutor thread."""
        try:
            sys = EVRoutingSystem(config.model_dump())
            self._update(10, "Creating road network")
            sys.step1_create_road_network()

            self._update(25, "Generating traffic data")
            traffic = sys.step2_generate_traffic_data()

            self._update(40, "Training traffic GAN")
            sys.step3_train_gan(traffic)

            self._update(55, "Creating RL environment")
            sys.step4_create_environment()

            if not self.state.training_status["is_training"]:
                self._update(self.state.training_status["progress"], "Stopped by user")
                return

            self._update(75, "Training Q-Learning agent")
            sys.step5_train_agent()

            self._update(85, "Creating route generator")
            sys.step6_create_route_generator()

            self._update(95, "Evaluating system")
            results = sys.step7_evaluate_system()
            self.state.training_status["metrics"] = results

            self._update(100, "Complete")
            self.state.system = sys  # atomic swap of trained system
        except Exception as e:
            self.state.training_status["current_step"] = f"Error: {str(e)}"
        finally:
            self.state.training_status["is_training"] = False

    def _update(self, progress: int, step: str):
        self.state.training_status["progress"] = progress
        self.state.training_status["current_step"] = step
```

### 7. TTL Cache with cachetools

```python
# In AppState (state.py):
from cachetools import TTLCache

road_network_cache: TTLCache = field(default_factory=lambda: TTLCache(maxsize=16, ttl=300))
system_stats_cache: TTLCache = field(default_factory=lambda: TTLCache(maxsize=1, ttl=10))

# Usage in router:
cached = state.road_network_cache.get(grid_size)
if cached is not None:
    return ok(cached)
# ... compute result ...
state.road_network_cache[grid_size] = result

# Invalidation after training completes:
state.road_network_cache.clear()
state.system_stats_cache.clear()
```

### 8. Backward Compatibility — Keeping `backend_api.py` as Thin Proxy

To avoid breaking existing `from backend_api import app` in tests:

```python
# backend_api.py (project root — thin re-export)
"""Backward-compatible entry point. Delegates to backend/app/main.py."""
from backend.app.main import create_app

app = create_app()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

This ensures `tests/test_api.py` (which does `from backend_api import app`) continues to work without modification during the transition.

---

## Don't Hand-Roll

| Need | Use This | Don't Write Your Own |
|------|----------|---------------------|
| TTL cache | `cachetools.TTLCache` | Current dict+timestamp tuples |
| SSE streaming | `sse-starlette.EventSourceResponse` | Raw `StreamingResponse` with manual formatting |
| Rate limiting | `slowapi` (already in use) | Custom middleware counter |
| Settings | `pydantic-settings` (already done in `src/config.py`) | `os.getenv()` calls |
| Correlation ID | `contextvars.ContextVar` (already in use) | Thread-local |
| Request validation | Pydantic `BaseModel` + `Field` (already in use) | Manual if/else checks |

---

## Common Pitfalls

### P1: TensorFlow Thread Safety (HIGH RISK)

TensorFlow is **not fully thread-safe**. Calling `model.fit()` from a `ThreadPoolExecutor` thread while the main thread accesses TF objects can cause segfaults.

**Mitigation:**
- Use `max_workers=1` on the executor — only one training run at a time (already enforced by `is_training` guard)
- The training thread creates its own `EVRoutingSystem` instance (fresh TF session) — no sharing with the main thread's models
- After training, assign `state.system = trained_system` atomically (Python GIL makes single-attribute assignment atomic)
- Do NOT access `state.system.gan` or `state.system.agent` while training is running on a different system instance — the main `state.system` remains the old one until swap

### P2: Lifespan + State Initialization Order

The lifespan handler runs before any request. But `get_state()` returns a module-level `_state` — it must exist BEFORE lifespan runs. This is fine because module-level `_state = AppState()` is created at import time (system=None), and lifespan fills in `_state.system`.

**Gotcha:** Don't create a new `AppState` in lifespan. Mutate the existing one:

```python
# CORRECT:
state = get_state()
state.system = EVRoutingSystem()

# WRONG:
_state = AppState(system=EVRoutingSystem())  # new instance, Depends() returns the old one
```

### P3: SSE + CORS

SSE requests are regular GET requests, so CORS middleware handles them. But if the frontend and backend are on different origins:
- `Access-Control-Allow-Origin` must include the frontend origin
- `EventSource` does NOT support custom headers (no auth headers) — if auth is needed later, use query params or cookies
- For this project: CORS is already configured, no auth on SSE endpoint — no issue

### P4: Middleware Order in FastAPI

Middleware is applied in **reverse registration order** (last registered = first executed). The current order in `backend_api.py` is:
1. `security_headers_middleware` (registered first = runs last)
2. `request_logger` (registered second = runs first)

After refactor, ensure the same effective order. The request logger should wrap security headers so timing includes all processing.

### P5: Import Path Changes

Currently tests do `from backend_api import app`. After creating `backend/app/`, the import becomes `from backend.app.main import app`.

**Solution:** Keep a thin `backend_api.py` at project root that re-exports `app`. This avoids changing all test imports simultaneously.

### P6: Rate Limiter State

`slowapi.Limiter` needs `app.state.limiter = limiter`. When using `create_app()` factory, ensure this is set inside the factory, not at module level.

### P7: Static File Mount Must Be Last

`app.mount("/", StaticFiles(...))` catches ALL unmatched routes. It MUST be registered after all API routers. In the factory pattern, mount it at the end of `create_app()`.

### P8: Background Task vs run_in_executor

The current code uses `BackgroundTasks.add_task(run_training_pipeline, ...)` which runs the async function in the event loop. Since the training pipeline calls synchronous TF code (GAN training, Q-learning), this **blocks the event loop** during training — no other requests can be served.

**Fix:** Use `loop.run_in_executor(ThreadPoolExecutor(), sync_function)` which actually runs code in a separate OS thread, keeping the event loop responsive.

### P9: `global` Keyword Elimination

Search for all `global` keywords and replace each with state mutation:
- `global system`  `state.system = ...`
- `global training_status`  `state.training_status.update(...)`
- `global _system_stats_cache`  `state.system_stats_cache[...] = ...`

All four global mutable variables become `AppState` fields.

---

## Code Examples

### Example 1: Complete Health Router

```python
# backend/app/routers/health.py
from fastapi import APIRouter, Depends, Request
from datetime import datetime
from app.state import AppState, get_state
from app.models.responses import ok
from app.dependencies import get_limiter

router = APIRouter(tags=["System"])

@router.get("/health", summary="Health check")
async def health_check(
    request: Request,
    state: AppState = Depends(get_state),
):
    return ok({
        "status": "healthy",
        "system_initialized": state.system is not None,
        "timestamp": datetime.now().isoformat(),
    })
```

### Example 2: Dependency Override in Tests

```python
# tests/test_api.py
import pytest
from fastapi.testclient import TestClient
from backend.app.main import create_app
from backend.app.state import AppState, get_state

def make_test_app():
    app = create_app()
    test_state = AppState()
    from src.main import EVRoutingSystem
    test_state.system = EVRoutingSystem()
    test_state.system.step1_create_road_network()
    test_state.system.step6_create_route_generator()
    app.dependency_overrides[get_state] = lambda: test_state
    return app

@pytest.fixture
def client():
    app = make_test_app()
    with TestClient(app) as c:
        yield c
```

### Example 3: Regression Test — Response Shape Validation

```python
# tests/test_regression.py
"""Ensure refactored endpoints return identical response shapes."""
import pytest
from fastapi.testclient import TestClient

ENDPOINTS = [
    ("GET", "/health", None, 200),
    ("GET", "/api/road-network?grid_size=5", None, 200),
    ("GET", "/api/training-status", None, 200),
    ("GET", "/api/system-stats", None, 200),
    ("POST", "/api/stop-training", None, 409),
]

@pytest.mark.parametrize("method,url,body,expected_status", ENDPOINTS)
def test_response_shape(client, method, url, body, expected_status):
    if method == "GET":
        r = client.get(url)
    else:
        r = client.post(url, json=body)
    assert r.status_code == expected_status
    data = r.json()
    assert "ok" in data
    assert "message" in data or "detail" in data
```

### Example 4: SSE Test with TestClient

```python
# tests/test_sse.py
def test_training_stream_sends_events(client):
    """SSE endpoint should return text/event-stream."""
    with client.stream("GET", "/api/training/stream") as response:
        assert response.headers["content-type"].startswith("text/event-stream")
        for line in response.iter_lines():
            if line.startswith("data:"):
                import json
                data = json.loads(line[5:])
                assert "is_training" in data
                break
```

---

## Confidence Levels

| Recommendation | Confidence | Notes |
|---------------|-----------|-------|
| **Router split pattern** (APIRouter + include_router) | **HIGH** | Standard FastAPI pattern, used in every FastAPI project >500 lines |
| **AppState dataclass + module-level singleton + Depends()** | **HIGH** | Proven pattern; `dependency_overrides` makes testing trivial |
| **BACK-03 already satisfied** (Pydantic Settings in `src/config.py`) | **HIGH** | `EVRoutingSettings` exists with all needed config. Routers import `get_settings()` from `src.config` — no duplication |
| **`sse-starlette` for SSE** | **HIGH** | 2.4M monthly PyPI downloads, actively maintained, used in official FastAPI examples |
| **`cachetools.TTLCache`** | **HIGH** | Drop-in replacement for hand-rolled dict+timestamp. 12M monthly downloads |
| **ThreadPoolExecutor(max_workers=1) for ML training** | **MEDIUM** | Works because training creates own TF session. Would NOT work if threads shared TF objects |
| **`backend_api.py` as thin re-export proxy** | **HIGH** | Zero-risk backward compatibility — tests keep working throughout refactor |
| **Middleware preserved via `create_app()` factory** | **HIGH** | Same middleware functions, just registered inside factory instead of module level |
| **SSE client disconnect detection** | **MEDIUM** | `sse-starlette` handles it, but test coverage for disconnect is tricky |
| **Rate limiter migration to factory pattern** | **HIGH** | `slowapi` docs show factory pattern explicitly |

---

## BACK-03 Status: ALREADY DONE

`src/config.py` contains `EVRoutingSettings(BaseSettings)` with:
- All directory paths (project_root, model_dir, data_dir, results_dir, frontend_dist_dir)
- ML hyperparameters (grid_size, gan_epochs, rl_episodes, etc.)
- API config (cors_origins, log_format, max_body_size, api_host, api_port)
- `@lru_cache` singleton via `get_settings()`
- env prefix `EV_`, `.env` file support

**For Phase 02:** Import `get_settings` from `src.config` in the new router modules. Do NOT create a second `backend/app/config.py`. The existing `EVRoutingSettings` already has `cors_origins`, `max_body_size`, `api_host`, `api_port` — use them directly.

---

## Summary for Planner

**New dependencies to add:** `sse-starlette>=2.0`, `cachetools>=5.3`

**Files to CREATE:**
- `backend/app/__init__.py`
- `backend/app/main.py` (create_app factory + lifespan)
- `backend/app/state.py` (AppState dataclass + get_state)
- `backend/app/dependencies.py` (Depends providers)
- `backend/app/middleware.py` (4 middleware functions moved from monolith)
- `backend/app/models/__init__.py`
- `backend/app/models/requests.py` (EVStateRequest, RouteRequest, TrainingConfig)
- `backend/app/models/responses.py` (APIResponse, ok, fail, RouteData, etc.)
- `backend/app/routers/__init__.py`
- `backend/app/routers/health.py`
- `backend/app/routers/routing.py`
- `backend/app/routers/training.py` (includes SSE endpoint)
- `backend/app/routers/analytics.py`
- `backend/app/services/__init__.py`
- `backend/app/services/routing_service.py`
- `backend/app/services/training_service.py`

**Files to MODIFY:**
- `backend_api.py`  gut contents, replace with thin re-export
- `requirements-api.txt`  add sse-starlette, cachetools

**Files to NOT modify:**
- `src/config.py` (BACK-03 already done)
- `src/main.py`, `src/road_graph.py`, etc. (ML code stays as-is)

**Estimated plans:** 3-4
1. **Plan 1:** Scaffold `backend/app/` structure + AppState + models + middleware + dependencies
2. **Plan 2:** Router extraction + service layer + dependency wiring + backward-compat proxy
3. **Plan 3:** SSE endpoint + ThreadPoolExecutor training + cachetools migration
4. **Plan 4:** Regression tests + security verification + final cleanup
