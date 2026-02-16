# Architecture Research: EV Routing Full-Stack Upgrade

> **Date:** 2026-02-16  
> **Scope:** Backend refactoring, data flow, frontend animations, testing, build order  
> **Current state:** Single-file FastAPI monolith (662 lines) + 8 ML modules (~6000 lines) + React 18 SPA

---

## 1. Backend Architecture Refactoring

### 1.1 Breaking Up the Single-File FastAPI App

The current `backend_api.py` (662 lines) mixes concerns: logging config, middleware, request/response models, route handlers, background tasks, and caching — all in one file.

**Recommended structure:**

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI app factory + lifespan
│   ├── config.py             # Pydantic Settings (all env vars)
│   ├── dependencies.py       # Dependency injection providers
│   ├── middleware/
│   │   ├── __init__.py
│   │   ├── cors.py
│   │   ├── logging.py        # Request logger + correlation ID
│   │   └── security.py       # Security headers, body size limit
│   ├── models/
│   │   ├── __init__.py
│   │   ├── requests.py       # EVStateRequest, RouteRequest, TrainingConfig
│   │   └── responses.py      # APIResponse, RouteData, MetricsData, etc.
│   ├── routers/
│   │   ├── __init__.py
│   │   ├── health.py         # GET /health
│   │   ├── routing.py        # /api/road-network, /api/generate-route, /api/save-route
│   │   ├── training.py       # /api/start-training, /api/stop-training, /api/training-status
│   │   └── analytics.py      # /api/traffic-patterns, /api/route-metrics, /api/system-stats
│   ├── services/
│   │   ├── __init__.py
│   │   ├── routing_service.py    # Route generation business logic
│   │   ├── training_service.py   # Training pipeline orchestration
│   │   └── analytics_service.py  # Metrics computation
│   └── cache.py              # TTL cache for road networks, stats
├── requirements.txt
└── run.py                    # uvicorn entry point
```

**Key pattern — APIRouter:**

```python
# backend/app/routers/routing.py
from fastapi import APIRouter, Depends
from app.dependencies import get_routing_service
from app.models.requests import RouteRequest
from app.models.responses import ok

router = APIRouter(prefix="/api", tags=["Routing"])

@router.get("/road-network")
async def get_road_network(
    grid_size: int = 10,
    service = Depends(get_routing_service),
):
    return ok(service.get_road_network(grid_size))

@router.post("/generate-route")
async def generate_route(
    route_req: RouteRequest,
    service = Depends(get_routing_service),
):
    return ok(service.generate_routes(route_req))
```

```python
# backend/app/main.py
from fastapi import FastAPI
from app.routers import health, routing, training, analytics
from app.middleware.cors import setup_cors
from app.middleware.logging import RequestLoggerMiddleware
from app.middleware.security import SecurityHeadersMiddleware
from app.dependencies import lifespan

def create_app() -> FastAPI:
    app = FastAPI(title="EV Routing API", version="2.0.0", lifespan=lifespan)
    
    # Middleware (order matters — outermost first)
    app.add_middleware(SecurityHeadersMiddleware)
    app.add_middleware(RequestLoggerMiddleware)
    setup_cors(app)
    
    # Routers
    app.include_router(health.router)
    app.include_router(routing.router)
    app.include_router(training.router)
    app.include_router(analytics.router)
    
    return app

app = create_app()
```

### 1.2 Dependency Injection — Replacing Global State

**Problem:** `backend_api.py` uses `global system` and `global training_status` — shared mutable state that makes testing impossible and creates race conditions.

**Solution: FastAPI `Depends()` with a state container class.**

```python
# backend/app/dependencies.py
from dataclasses import dataclass, field
from typing import Optional, Any, Dict
from contextlib import asynccontextmanager
from fastapi import Depends, Request

from src.main import EVRoutingSystem

@dataclass
class AppState:
    """Application-wide state, injected via dependency."""
    system: Optional[EVRoutingSystem] = None
    training_status: Dict[str, Any] = field(default_factory=lambda: {
        "is_training": False,
        "progress": 0,
        "current_step": "",
        "metrics": {},
    })

# Singleton instance — created once in lifespan
_app_state = AppState()

@asynccontextmanager
async def lifespan(app):
    """Initialize system on startup."""
    _app_state.system = EVRoutingSystem()
    _app_state.system.step1_create_road_network()
    _app_state.system.step6_create_route_generator()
    yield

def get_app_state() -> AppState:
    return _app_state

def get_routing_service(state: AppState = Depends(get_app_state)):
    from app.services.routing_service import RoutingService
    return RoutingService(state)

def get_training_service(state: AppState = Depends(get_app_state)):
    from app.services.training_service import TrainingService
    return TrainingService(state)
```

**Testing benefit:** In tests, override the dependency:

```python
from app.dependencies import get_app_state, AppState

def mock_state():
    state = AppState()
    state.system = MockEVRoutingSystem()
    return state

app.dependency_overrides[get_app_state] = mock_state
```

### 1.3 Configuration Management (Pydantic Settings)

**Problem:** Hardcoded paths (`"models"`, `"results"`, `"data"`), magic numbers, and `os.getenv()` scattered throughout.

**Solution:**

```python
# backend/app/config.py
from pydantic_settings import BaseSettings
from pathlib import Path
from functools import lru_cache

class Settings(BaseSettings):
    # ── Server ──
    host: str = "0.0.0.0"
    port: int = 8000
    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:3000"]
    max_body_size: int = 1_048_576
    log_format: str = "json"  # "json" | "text"
    
    # ── Paths ──
    base_dir: Path = Path(__file__).resolve().parent.parent
    model_dir: Path = Path("models")
    results_dir: Path = Path("results")
    data_dir: Path = Path("data")
    frontend_dist: Path = Path("frontend/dist")
    
    # ── ML Defaults ──
    default_grid_size: int = 10
    default_gan_epochs: int = 100
    default_rl_episodes: int = 500
    default_traffic_samples: int = 500
    
    # ── Rate Limits ──
    rate_limit_default: str = "60/minute"
    rate_limit_training: str = "5/minute"
    
    # ── Cache TTL ──
    road_network_cache_ttl: int = 300   # seconds
    stats_cache_ttl: int = 10

    model_config = {"env_prefix": "EV_", "env_file": ".env"}

@lru_cache
def get_settings() -> Settings:
    return Settings()
```

**Usage across codebase:**

```python
from app.config import get_settings

settings = get_settings()
np.save(settings.data_dir / "training_data" / "traffic_data.npy", data)
```

### 1.4 Background Tasks for Long-Running ML Training

**Problem:** The current `BackgroundTasks.add_task()` approach works for simple fire-and-forget, but ML training (GAN + Q-Learning) can take **minutes to hours**. `BackgroundTasks` runs in the same process — no crash isolation, no progress streaming hooks.

**Recommended approaches (ranked by complexity):**

| Approach | Complexity | Best For |
|----------|-----------|----------|
| `asyncio.create_task()` + SSE | Low | This project (single-server demo) |
| `concurrent.futures.ProcessPoolExecutor` | Medium | CPU-heavy ML, need isolation |
| Celery + Redis | High | Production multi-worker |
| `arq` (async Redis queue) | Medium | Async-native alternative to Celery |

**Recommended for this project: `asyncio.create_task()` + thread executor for CPU-bound ML:**

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
        
        # Run CPU-bound training in a thread to not block the event loop
        loop = asyncio.get_event_loop()
        loop.run_in_executor(_executor, self._run_pipeline, config)
    
    def _run_pipeline(self, config):
        """Synchronous training pipeline — runs in thread."""
        try:
            system = EVRoutingSystem(config.dict())
            self._update(10, "Creating road network")
            system.step1_create_road_network()
            # ... steps 2-7 ...
            self._update(100, "Complete")
            self.state.system = system
        except Exception as e:
            self.state.training_status["current_step"] = f"Error: {e}"
        finally:
            self.state.training_status["is_training"] = False
    
    def _update(self, progress: int, step: str):
        self.state.training_status["progress"] = progress
        self.state.training_status["current_step"] = step
```

---

## 2. Data Flow Architecture

### 2.1 Training Progress: SSE vs WebSocket vs Polling

**Current approach:** The frontend polls `/api/training-status` every 2 seconds via `setInterval`. This works but is inefficient and has 2-second latency.

| Method | Latency | Complexity | Browser Support | Recommendation |
|--------|---------|-----------|----------------|----------------|
| **Polling** (current) | 2s | Trivial | Universal | Keep as fallback |
| **SSE (Server-Sent Events)** | ~0ms | Low | Universal | **Best fit** |
| **WebSocket** | ~0ms | Medium | Universal | Overkill for one-way updates |

**Recommendation: SSE for training progress.**

Training progress is a one-way server→client stream — SSE is purpose-built for this. WebSocket is bidirectional, which adds unnecessary complexity.

```python
# backend/app/routers/training.py
from fastapi.responses import StreamingResponse
import asyncio, json

@router.get("/api/training-stream")
async def training_stream(state: AppState = Depends(get_app_state)):
    async def event_generator():
        while True:
            data = json.dumps(state.training_status)
            yield f"data: {data}\n\n"
            if not state.training_status["is_training"] and state.training_status["progress"] >= 100:
                yield f"data: {json.dumps({'done': True})}\n\n"
                break
            await asyncio.sleep(0.5)
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
```

```typescript
// Frontend SSE client
function useTrainingStream() {
  const [status, setStatus] = useState<TrainingStatus>(initial);

  useEffect(() => {
    const es = new EventSource(`${API_URL}/api/training-stream`);
    es.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.done) { es.close(); return; }
      setStatus(data);
    };
    es.onerror = () => es.close();
    return () => es.close();
  }, []);

  return status;
}
```

**Keep the polling endpoint too** — as a fallback and for initial page load.

### 2.2 Caching Strategies for Expensive ML Computations

The current caching (in-memory dicts with TTL) is reasonable for a single-process demo. Improvements:

**Layer 1: In-memory TTL cache (current, cleaned up)**

```python
# backend/app/cache.py
import time
from typing import TypeVar, Generic, Optional

T = TypeVar("T")

class TTLCache(Generic[T]):
    """Simple TTL cache for computed values."""
    def __init__(self, ttl_seconds: int = 300):
        self._store: dict[str, tuple[T, float]] = {}
        self._ttl = ttl_seconds
    
    def get(self, key: str) -> Optional[T]:
        if key in self._store:
            val, ts = self._store[key]
            if time.time() - ts < self._ttl:
                return val
            del self._store[key]
        return None
    
    def set(self, key: str, value: T) -> None:
        self._store[key] = (value, time.time())
    
    def invalidate(self, key: str = None) -> None:
        if key:
            self._store.pop(key, None)
        else:
            self._store.clear()

# Instances
road_network_cache = TTLCache[dict](ttl_seconds=300)
stats_cache = TTLCache[dict](ttl_seconds=10)
route_cache = TTLCache[dict](ttl_seconds=60)
```

**Layer 2: Disk-based model caching (already exists, formalize)**

Models are saved to `models/` — add checksums and lazy loading:

```python
# backend/app/services/model_cache.py
import hashlib, pickle
from pathlib import Path

class ModelRegistry:
    """Track trained model artifacts with checksums."""
    def __init__(self, model_dir: Path):
        self.model_dir = model_dir
        self.manifest_path = model_dir / "manifest.json"
    
    def is_trained(self, model_name: str) -> bool:
        return (self.model_dir / model_name).exists()
    
    def get_checksum(self, model_name: str) -> str:
        path = self.model_dir / model_name
        return hashlib.md5(path.read_bytes()).hexdigest()
```

**Layer 3: Route result caching**

Cache generated routes by `(source, dest, battery_soc, grid_size)` tuple. Routes with identical inputs produce identical outputs.

### 2.3 File Organization — Canonical Locations

**Problem:** Duplicate directories at root and `src/`:
- `data/` and `src/data/`  
- `models/` and `src/models/`
- `results/` and `src/results/`

**Recommendation: Single canonical location at project root, referenced via config.**

```
EV_Routing/
├── data/                    # ← CANONICAL (input data)
│   ├── generated_traffic/
│   ├── historical_routes/
│   └── training_data/
├── models/                  # ← CANONICAL (trained artifacts)
│   ├── gnn_gan/
│   ├── q_learning/
│   └── sg_gan/
├── results/                 # ← CANONICAL (output artifacts)
│   ├── metrics/
│   └── plots/
├── src/                     # ← ML source code ONLY
│   ├── __init__.py
│   ├── environment.py
│   ├── evaluate.py
│   ├── gnn_route_generator.py
│   ├── main.py
│   ├── q_learning_agent.py
│   ├── road_graph.py
│   ├── route_generator.py
│   └── traffic_generator.py
├── backend/                 # ← API code (NEW)
│   └── app/ ...
└── frontend/                # ← React SPA
    └── src/ ...
```

**Delete `src/data/`, `src/models/`, `src/results/`** — they contain the same files. Update `main.py` to read paths from config instead of relative `os.path`.

**Add to `.gitignore`:**
```
data/generated_traffic/*.npy
models/**/*.h5
models/**/*.keras
models/**/*.pkl
results/plots/*.png
results/metrics/*.json
```

---

## 3. Frontend Architecture for Animations

### 3.1 Component Structure for Glassmorphism Design System

The current UI components (`Card`, `Button`, `Badge`, etc.) are functional but lack animation orchestration. A glassmorphism design system needs:

**Design tokens layer:**

```typescript
// frontend/src/design/tokens.ts
export const glass = {
  panel: 'bg-white/10 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10',
  card: 'bg-white/60 dark:bg-surface-800/60 backdrop-blur-lg border border-white/30 dark:border-surface-700/30',
  input: 'bg-white/40 dark:bg-surface-900/40 backdrop-blur-sm border border-white/20',
  sidebar: 'bg-surface-900/80 backdrop-blur-2xl border-r border-white/10',
} as const;

export const shadows = {
  glow: {
    primary: '0 0 20px rgba(20, 168, 192, 0.3), 0 0 60px rgba(20, 168, 192, 0.1)',
    accent:  '0 0 20px rgba(245, 158, 11, 0.3), 0 0 60px rgba(245, 158, 11, 0.1)',
  },
  elevation: {
    sm: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.06)',
    md: '0 4px 12px rgba(0,0,0,0.15), 0 2px 4px rgba(0,0,0,0.08)',
    lg: '0 10px 30px rgba(0,0,0,0.20), 0 4px 8px rgba(0,0,0,0.10)',
  },
} as const;
```

**Glass component library:**

```typescript
// frontend/src/components/ui/GlassCard.tsx
import { cn } from '../../lib/utils';
import { glass } from '../../design/tokens';
import { motion, HTMLMotionProps } from 'framer-motion';

interface GlassCardProps extends HTMLMotionProps<'div'> {
  variant?: 'panel' | 'card' | 'elevated';
  glow?: 'primary' | 'accent' | false;
}

export function GlassCard({ 
  variant = 'card', glow = false, className, children, ...props 
}: GlassCardProps) {
  return (
    <motion.div
      className={cn(
        glass[variant],
        'rounded-2xl p-6',
        glow && `shadow-[${shadows.glow[glow]}]`,
        className,
      )}
      {...props}
    >
      {children}
    </motion.div>
  );
}
```

**Recommended component hierarchy:**

```
components/
├── ui/                     # Primitives (no business logic)
│   ├── GlassCard.tsx
│   ├── GlassButton.tsx
│   ├── GlassInput.tsx
│   ├── AnimatedNumber.tsx   # Count-up animation for stats
│   ├── Skeleton.tsx         # Shimmer loading states
│   └── index.ts
├── layout/                 # Page structure
│   ├── Header.tsx
│   ├── Sidebar.tsx
│   ├── PageTransition.tsx   # AnimatePresence wrapper
│   └── Container.tsx
├── domain/                 # Business components
│   ├── NetworkMap.tsx
│   ├── RouteCard.tsx
│   ├── StatCard.tsx
│   ├── TrainingPipeline.tsx
│   └── MetricsChart.tsx
└── composed/               # Page-level compositions
    ├── Dashboard.tsx
    ├── RoutePlanner.tsx
    ├── Training.tsx
    └── Analytics.tsx
```

### 3.2 Animation Orchestration Patterns

**Install Framer Motion:**
```bash
cd frontend && npm install framer-motion
```

**Pattern 1: Staggered entrance animations**

```typescript
// frontend/src/components/layout/PageTransition.tsx
import { motion, AnimatePresence } from 'framer-motion';

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
};

export function PageTransition({ children, key }: { children: React.ReactNode; key: string }) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={key}
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
```

**Pattern 2: Staggered children (for stat card grids)**

```typescript
// frontend/src/design/animations.ts
export const stagger = {
  container: {
    animate: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
  },
  item: {
    initial: { opacity: 0, y: 20, scale: 0.95 },
    animate: { 
      opacity: 1, y: 0, scale: 1,
      transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] },
    },
  },
};

// Usage in Dashboard:
<motion.div className="grid grid-cols-4 gap-4" variants={stagger.container} initial="initial" animate="animate">
  {cards.map((card, i) => (
    <motion.div key={i} variants={stagger.item}>
      <StatCard {...card} />
    </motion.div>
  ))}
</motion.div>
```

**Pattern 3: Animated number counters**

```typescript
// frontend/src/components/ui/AnimatedNumber.tsx
import { useEffect, useRef, useState } from 'react';
import { animate } from 'framer-motion';

export function AnimatedNumber({ value, duration = 1 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);
  const prev = useRef(0);

  useEffect(() => {
    const controls = animate(prev.current, value, {
      duration,
      ease: 'easeOut',
      onUpdate: (v) => setDisplay(v),
    });
    prev.current = value;
    return controls.stop;
  }, [value, duration]);

  return <span>{Number.isInteger(value) ? Math.round(display) : display.toFixed(1)}</span>;
}
```

**Pattern 4: Training pipeline step animations**

```typescript
// Animate pipeline steps as they complete
const stepVariants = {
  pending:  { opacity: 0.4, scale: 0.95, x: -10 },
  active:   { opacity: 1, scale: 1, x: 0, transition: { type: 'spring', stiffness: 300 } },
  complete: { opacity: 1, scale: 1, x: 0 },
};
```

### 3.3 State Management for Real-Time Data

**Current approach:** Zustand store with persistence — solid choice. Improvements:

**Add polling hooks with Zustand integration:**

```typescript
// frontend/src/hooks/usePolling.ts
import { useEffect, useRef } from 'react';

export function usePolling<T>(
  fetcher: () => Promise<T>,
  onData: (data: T) => void,
  intervalMs: number,
  enabled: boolean = true,
) {
  const savedFetcher = useRef(fetcher);
  const savedOnData = useRef(onData);
  savedFetcher.current = fetcher;
  savedOnData.current = onData;

  useEffect(() => {
    if (!enabled) return;
    let active = true;

    const poll = async () => {
      try {
        const data = await savedFetcher.current();
        if (active) savedOnData.current(data);
      } catch { /* retry next interval */ }
    };

    poll(); // initial fetch
    const id = setInterval(poll, intervalMs);
    return () => { active = false; clearInterval(id); };
  }, [intervalMs, enabled]);
}
```

**Add SSE hook for training:**

```typescript
// frontend/src/hooks/useSSE.ts
import { useEffect, useRef, useCallback, useState } from 'react';

export function useSSE<T>(url: string, enabled: boolean = true) {
  const [data, setData] = useState<T | null>(null);
  const [connected, setConnected] = useState(false);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!enabled) return;
    
    const es = new EventSource(url);
    esRef.current = es;
    
    es.onopen = () => setConnected(true);
    es.onmessage = (e) => setData(JSON.parse(e.data));
    es.onerror = () => { setConnected(false); es.close(); };
    
    return () => es.close();
  }, [url, enabled]);

  return { data, connected };
}
```

**Recommended polling intervals:**

| Endpoint | Interval | Justification |
|----------|----------|---------------|
| Training status | SSE (real-time) or 2s fallback | User actively watching |
| Dashboard stats | 30s | Background refresh |
| Road network | No polling (fetch once) | Rarely changes |
| Route metrics | No polling (on-demand) | User-triggered |

---

## 4. Testing Architecture

### 4.1 pytest-asyncio on Windows: Known Issues and Fixes

**The crash in `test_output.txt`** is a well-known Python 3.10-3.11 Windows issue:

```
Windows fatal exception: code 0x80000003
File "asyncio\windows_events.py", line 825 in _poll
```

**Root cause:** `ProactorEventLoop` (Windows default) has bugs with `anyio`/`httpx` used by FastAPI's `TestClient`. When the event loop shuts down, pending I/O completion port callbacks trigger a Windows breakpoint exception.

**Fix 1: Force `SelectorEventLoop` in conftest.py** (most reliable)

```python
# tests/conftest.py
import sys
import asyncio
import pytest

if sys.platform == "win32":
    # SelectorEventLoop doesn't have the IOCP crash bug
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

@pytest.fixture(scope="session")
def event_loop_policy():
    if sys.platform == "win32":
        return asyncio.WindowsSelectorEventLoopPolicy()
    return asyncio.DefaultEventLoopPolicy()
```

**Fix 2: Pin `anyio` version and add pytest-asyncio config**

```toml
# pyproject.toml additions
[tool.pytest.ini_options]
asyncio_mode = "auto"

# And pin:
# anyio>=4.4.0  (contains Windows IOCP fixes)
# httpx>=0.27   (TestClient backend)
```

**Fix 3: Use `httpx.AsyncClient` instead of `TestClient`** (avoids threading entirely)

```python
import pytest
import httpx
from app.main import create_app

@pytest.fixture
async def client():
    app = create_app()
    async with httpx.AsyncClient(app=app, base_url="http://test") as client:
        yield client

class TestHealth:
    @pytest.mark.asyncio
    async def test_health(self, client):
        resp = await client.get("/health")
        assert resp.status_code == 200
```

**Recommendation:** Use Fix 1 immediately (one line, fixes crash). Migrate to Fix 3 during refactoring for fully async tests.

### 4.2 Test Isolation for FastAPI with Global State

**Problem:** The current `backend_api.py` uses `global system` — tests share state, causing order-dependent failures.

**Fix (with DI refactoring):**

```python
# tests/conftest.py
import pytest
from unittest.mock import MagicMock
from app.main import create_app
from app.dependencies import get_app_state, AppState

@pytest.fixture
def mock_system():
    """Create a lightweight mock EVRoutingSystem."""
    system = MagicMock()
    system.road_graph.num_nodes = 25
    system.road_graph.graph.number_of_edges.return_value = 40
    system.road_graph.charging_stations = [5, 10, 15]
    system.gan = None
    system.agent = None
    system.gnn_gan = None
    return system

@pytest.fixture
def app(mock_system):
    """Create app with mocked dependencies."""
    app = create_app()
    
    def override_state():
        state = AppState()
        state.system = mock_system
        return state
    
    app.dependency_overrides[get_app_state] = override_state
    return app

@pytest.fixture
def client(app):
    from fastapi.testclient import TestClient
    with TestClient(app) as c:
        yield c
```

**Key isolation patterns:**
1. Each test gets a fresh `AppState` via fixture
2. ML system is mocked — tests don't load TensorFlow (fast!)
3. No shared globals — tests can run in parallel with `pytest-xdist`

### 4.3 Frontend Testing with Animations (Framer Motion + Vitest)

**Challenge:** Framer Motion animations use `requestAnimationFrame` and DOM measurements. In jsdom, these either don't run or cause flaky tests.

**Solution 1: Mock Framer Motion in tests**

```typescript
// frontend/src/__tests__/__mocks__/framer-motion.ts
export const motion = new Proxy(
  {},
  {
    get: (_, tag: string) => {
      // Return a component that renders the HTML tag without animations
      return ({ children, ...props }: any) => {
        const { initial, animate, exit, variants, transition, whileHover, whileTap, ...rest } = props;
        const Tag = tag as keyof JSX.IntrinsicElements;
        return <Tag {...rest}>{children}</Tag>;
      };
    },
  }
);

export const AnimatePresence = ({ children }: any) => children;
export const useAnimation = () => ({ start: vi.fn(), stop: vi.fn() });
export const useInView = () => true;
```

```typescript
// vitest.config.ts — add alias
export default defineConfig({
  test: {
    alias: {
      'framer-motion': './src/__tests__/__mocks__/framer-motion.ts',
    },
  },
});
```

**Solution 2: Use `@testing-library/react` with `act()` for integration tests**

```typescript
import { render, screen, act } from '@testing-library/react';
import { StatCard } from '../components/StatCard';

test('renders stat value', async () => {
  await act(async () => {
    render(<StatCard title="Nodes" value={100} icon={Navigation} color="primary" />);
  });
  expect(screen.getByText('100')).toBeInTheDocument();
});
```

**Solution 3: Playwright for visual/animation E2E tests** (already configured)

Animation quality is best tested visually. Use Playwright's `screenshot` comparison:

```typescript
// frontend/e2e/animations.spec.ts
import { test, expect } from '@playwright/test';

test('dashboard cards stagger in', async ({ page }) => {
  await page.goto('/');
  // Wait for animations to complete
  await page.waitForTimeout(1000);
  await expect(page.locator('[data-testid="stat-card"]')).toHaveCount(4);
  // Visual snapshot
  await expect(page).toHaveScreenshot('dashboard-loaded.png', { maxDiffPixels: 100 });
});
```

---

## 5. Suggested Build Order

### Dependency Graph

```
[Config + Settings] ─────────────────────────────────────────┐
       │                                                      │
[Fix Windows Tests] ──── standalone, no deps ────────────     │
       │                                                      │
[DI + AppState] ──── depends on Config ──────────────┐       │
       │                                              │       │
[Router Split] ──── depends on DI ───────────────┐   │       │
       │                                          │   │       │
[Service Layer] ──── depends on Router Split ─┐   │   │       │
       │                                      │   │   │       │
[Deduplicate dirs] ──── depends on Config ────┼───┼───┘       │
       │                                      │   │           │
[SSE Training] ──── depends on Service Layer ─┘   │           │
       │                                          │           │
[Cache cleanup] ──── depends on Service Layer ────┘           │
       │                                                      │
[Test Isolation] ──── depends on DI ──────────────────────────┘
       │
[Frontend animations] ──── independent of backend ────────────
       │
[Glassmorphism components] ──── depends on Framer Motion ─────
```

### Recommended Phase Order

#### Phase 1: Foundation (do first — everything depends on this)
1. **Create `backend/app/config.py`** — Pydantic Settings, centralize all env vars and paths
2. **Fix Windows asyncio crash** — add `conftest.py` with `WindowsSelectorEventLoopPolicy`
3. **Deduplicate `data/`, `models/`, `results/`** — delete `src/data`, `src/models`, `src/results`, update `main.py` paths to use config

#### Phase 2: Backend Structure (enables testability)
4. **Create `AppState` class + dependency injection** — replace globals
5. **Extract request/response models** to `app/models/`
6. **Extract middleware** to `app/middleware/`
7. **Split routes into `APIRouter` modules** — health, routing, training, analytics
8. **Create service layer** — business logic out of route handlers

#### Phase 3: Data Flow (enables real-time UX)
9. **Clean up caching** — extract `TTLCache` class, add route caching
10. **Add SSE endpoint** for training progress streaming
11. **Add SSE hook** in frontend, wire to Training page
12. **Add `usePolling` hook** for dashboard auto-refresh

#### Phase 4: Frontend Polish (cosmetic, high impact)
13. **Install Framer Motion**, create animation tokens
14. **Build glassmorphism component library** — `GlassCard`, `GlassButton`, `AnimatedNumber`
15. **Add page transitions** with `AnimatePresence`
16. **Add staggered grid animations** to Dashboard, Analytics
17. **Animate training pipeline** steps

#### Phase 5: Testing Maturity
18. **Backend test isolation** with DI overrides + mock system
19. **Frontend animation mocks** for Vitest
20. **E2E visual tests** with Playwright screenshots

### What NOT to Do Yet
- **Auth/RBAC** — no multi-user need identified; adds complexity without value for a demo/portfolio app
- **Database migration** — file-system storage is fine for ML artifacts; a DB would only help if you're storing user data or session history
- **CI/CD pipeline** — valuable but not a blocker; set up after the structure is clean
- **Celery/Redis** — overkill for single-server demo; `asyncio` + thread pool is sufficient

---

## Summary of Key Recommendations

| Area | Current | Recommended | Priority |
|------|---------|-------------|----------|
| Backend structure | Single 662-line file | 4 routers + 3 services + config | **Critical** |
| Global state | `global system` | `AppState` + `Depends()` | **Critical** |
| Config | Hardcoded paths + `os.getenv()` | Pydantic Settings | **High** |
| Training progress | 2s polling | SSE stream + polling fallback | **High** |
| File duplication | `data/` at root AND `src/data/` | Single canonical root dirs | **High** |
| Windows tests | Crash (`code 0x80000003`) | `WindowsSelectorEventLoopPolicy` | **High** |
| Animations | CSS-only `animate-stagger` | Framer Motion orchestration | **Medium** |
| Glassmorphism | Not implemented | `backdrop-blur` + glass tokens | **Medium** |
| Test isolation | Shared globals | DI overrides + mock system | **Medium** |
| Caching | Ad-hoc dicts | `TTLCache` class | **Low** |
