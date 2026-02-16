# Phase 01 Research: Foundation & Stability

> **Researched**: 2026-02-16
> **Confidence**: HIGH — findings based on direct source file analysis, installed package checks, and crash log review.

---

## 1. Windows Asyncio Fix (STAB-01)

### Root Cause

The crash in `test_output.txt` is:

```
Windows fatal exception: code 0x80000003
File "C:\Python311\Lib\asyncio\windows_events.py", line 825 in _poll
```

This is the well-known **ProactorEventLoop** bug on Windows. FastAPI's `TestClient` (via `anyio` → `asyncio`) uses the default `ProactorEventLoop` on Windows, which crashes during `_poll()` when the IOCP handle is closed concurrently. The `test_output.txt` shows the crash occurs in `anyio._backends._asyncio` calling `run_blocking_portal`, confirming it's the anyio-spawned event loop that crashes.

### Exact Fix

**Two changes are required:**

#### 1a. Add `conftest.py` at project root

```python
# conftest.py (project root)
import sys
import asyncio
import pytest

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

@pytest.fixture(scope="session", autouse=True)
def _windows_event_loop_policy():
    """Force SelectorEventLoop on Windows to avoid ProactorEventLoop crash."""
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    yield
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(None)
```

The **module-level** `set_event_loop_policy()` call is critical — it runs at import time, before any fixture or test collection happens. The session-scoped fixture is belt-and-suspenders.

#### 1b. Install `pytest-asyncio` and configure `pyproject.toml`

Add to `pyproject.toml` under `[tool.pytest.ini_options]`:

```toml
asyncio_mode = "auto"
```

Install: `pip install pytest-asyncio>=0.25.0`

#### 1c. Update `testpaths` in pyproject.toml

Currently `testpaths = ["src"]`, but API tests are in `tests/`. Change to:

```toml
testpaths = ["tests", "src"]
```

### Why This Works

`WindowsSelectorEventLoopPolicy` uses the select-based event loop instead of IOCP-based ProactorEventLoop. The ProactorEventLoop in Python 3.11 has a known race condition where `_poll()` can crash when handles are closed from another thread — exactly what happens when TestClient spawns a background server thread.

### Confidence: HIGH

This is a well-documented Python bug. The fix is deterministic.

---

## 2. Current Test State

### Python Tests (17 total)

**Location**: `tests/test_api.py` (17 tests) + `src/test_*.py` (4 files)

| File | Tests | Status |
|------|-------|--------|
| `tests/test_api.py` | 17 tests (5 classes) | 1 passed, crash before rest |
| `src/test_environment.py` | 3 tests | Not collected (pyproject testpaths=["src"] but these use direct imports) |
| `src/test_road_graph.py` | 13 tests (4 classes) | Not collected by current pytest config |
| `src/test_route_generator.py` | 9 tests (3 classes) | Not collected by current pytest config |
| `src/test_traffic_generation.py` | 4 tests | Not collected by current pytest config |

**Key observations:**

1. `pyproject.toml` sets `testpaths = ["src"]` — so `tests/test_api.py` is NOT collected by default. The crash log shows it WAS collected, meaning pytest was run without relying on pyproject config OR the user ran `pytest tests/`.
2. `test_api.py` requires `fastapi`, `httpx` (via TestClient), `slowapi`, `pydantic` — **none of which are currently installed**.
3. The `src/test_*.py` files use `sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))` and then `from src.road_graph import ...` — this works when run from project root.
4. `src/test_environment.py` uses bare `from environment import ...` which only works if CWD is `src/` or `src/` is on `sys.path`.

### Frontend Tests (4 Vitest files, 2 E2E files)

| File | Tests | Notes |
|------|-------|-------|
| `__tests__/Header.test.tsx` | 5 tests | Mocks API, uses fake timers |
| `__tests__/Sidebar.test.tsx` | 4 tests | Pure render tests |
| `__tests__/StatCard.test.tsx` | 2 tests | Pure render tests |
| `__tests__/store.test.ts` | 10 tests (7 describe blocks) | Pure state tests, no DOM |
| `e2e/app.spec.ts` | 4 tests | Needs running dev server |
| `e2e/navigation.spec.ts` | 4 tests | Needs running dev server |

---

## 3. TypeScript Error Fixes (STAB-02)

### Error 1: `src/App.tsx(31,22)` — TS6133 unused variable `e`

**Current code** (line ~31):
```tsx
const handler = () => {
  if (themeMode === 'system') {
    setThemeMode('system');
  }
};
```

Wait — the error says unused `e` on line 31. Looking at the actual source, line 31 is:
```tsx
const handler = () => {
```

The error is about the `handler` callback parameter. Actually, looking closer at the file (line 30-38 of App.tsx), the `mq.addEventListener('change', handler)` callback. The TS error `'e' is declared but its value is never read` means the `handler` function likely had a parameter `e` in the compiled output or there was an `(e)` param. But the source shows `() =>` with no param.

Actually, re-reading the tsc_errors.txt: `src/App.tsx(31,22)` — column 22 suggests the parameter is inside the arrow function. Let me recount: looking at the file, line 31 in the TSX corresponds to `const handler = () => {`. But `()` has no param. The column 22 offset... Actually, the error might be from the `catch (error: any)` block lower down, or it could be a line numbering mismatch from prior edits.

**Better approach**: Run `tsc --noEmit` during implementation to identify the exact locations. The fix for unused variables is:
- Prefix with underscore: `_e`
- Or remove the parameter entirely
- Or use it

### Error 2: `src/components/Header.tsx(8,11)` — TS6133 unused `isDarkMode`

**Current code** (line 8):
```tsx
const { themeMode, cycleTheme } = useTheme();
```

Wait — line 8 has `const { themeMode, cycleTheme } = useTheme();`. But the destructured export from `useTheme()` doesn't show `isDarkMode`. Looking at the original error — `isDarkMode` IS in useTheme but the Header only uses `themeMode` and `cycleTheme`. The error means `isDarkMode` was destructured but never used.

**BUT** looking at the actual Header.tsx line 8, it says `const { themeMode, cycleTheme } = useTheme();` — no `isDarkMode`. So either:
1. The error was from a previous version and has been partially fixed
2. The tsc_errors.txt is stale

**Fix**: During implementation, run `tsc --noEmit` to get current errors. If `isDarkMode` is still destructured, remove it from the destructuring pattern. The tsconfig has `"noUnusedLocals": true` and `"noUnusedParameters": true` which triggers TS6133.

### Exact approach

```bash
cd frontend && npx tsc --noEmit 2>&1
```

Then fix each TS6133 by either:
- Removing unused variables from destructuring
- Prefixing with `_` for intentionally unused callback params

### Confidence: HIGH for the approach, MEDIUM for exact line numbers (tsc_errors.txt may be stale)

---

## 4. Vitest/Playwright Status (STAB-03, STAB-04)

### Vitest

**Config** (`vitest.config.ts`):
- Environment: `jsdom`
- Globals: `true`
- Pattern: `src/**/*.{test,spec}.{ts,tsx}`
- **Missing**: `setupFiles` — neither `src/test-setup.ts` nor `src/__tests__/setup.ts` is referenced

**Issue**: Two setup files exist but neither is wired in:
- `src/test-setup.ts` — extends expect with jest-dom matchers
- `src/__tests__/setup.ts` — same thing

Current tests don't use jest-dom matchers (they use `.toBeTruthy()` not `.toBeInTheDocument()`), so tests probably pass without the setup file. But it should be wired for correctness.

**Fix**: Add to `vitest.config.ts`:
```typescript
test: {
    setupFiles: ['./src/test-setup.ts'],
    // ... rest
}
```

**Likely test status**: Tests should pass since they use basic vitest assertions and mock API calls. Need to verify by running `npx vitest run`.

### Playwright

**Config** (`playwright.config.ts`):
- Uses `baseURL: 'http://localhost:5173'`
- Runs `npm run dev` as webServer
- Requires the backend to be running for the app to function properly (API calls on load)
- `e2e/app.spec.ts` checks title matches `/EVRouteOpt/i` — need to verify the actual `<title>` in `index.html`

**Potential issues**:
1. Title check (`/EVRouteOpt/i`) must match `<title>` in `frontend/index.html`
2. The app makes API calls on load (`api.getRoadNetwork(10)`) — if backend isn't running, the app shows error toast but still renders
3. Tests are loose (check `main` is visible) so they should pass even without backend

**Fix approach**: Run `npx playwright test` after ensuring `npm run dev` works. If the title assertion fails, update `index.html` `<title>` or the test assertion.

### Confidence: MEDIUM — need to actually run tests to confirm

---

## 5. Directory Consolidation Plan (STAB-05)

### Current State

Two parallel directory trees with overlapping content:

| Root-level (canonical) | `src/`-level (duplicate) | Content |
|----------------------|------------------------|---------|
| `data/generated_traffic/sample_traffic.npy` | `src/data/generated_traffic/sample_traffic.npy` | Same structure |
| `data/training_data/traffic_data.npy` | `src/data/training_data/traffic_data.npy` | Same structure |
| `data/historical_routes/` (empty) | `src/data/historical_routes/routes.npz` | **src/ has more** |
| `models/sg_gan/` (4 files) | `src/models/sg_gan/` (2 files) | **Root has more** |
| `models/q_learning/trained_agent.pkl` | `src/models/q_learning/trained_agent.pkl` | Same structure |
| `models/gnn_gan/` (empty) | `src/models/gnn_gan/` (2 .weights.h5 files) | **src/ has more** |
| `results/metrics/` (2 files) | `src/results/metrics/` (2 files) | Same structure |
| `results/plots/` (3 files) | `src/results/plots/` (4 files) | **src/ has more** |

### Why Duplicates Exist

- `src/main.py` default config uses relative paths `'model_dir': 'models'`, `'data_dir': 'data'`, `'results_dir': 'results'`. When run from **project root**, these resolve to root-level dirs. When run from **`src/`**, they resolve to `src/data/` etc.
- `src/traffic_generator.py`, `src/q_learning_agent.py`, `src/road_graph.py` have `__main__` blocks that use `"../models/"`, `"../results/"` — relative to `src/`, pointing to root.
- The duplication happened from running the system from different CWDs.

### Consolidation Plan

1. **Keep root-level** `data/`, `models/`, `results/` as canonical
2. **Merge unique files from `src/` into root**:
   - `src/data/historical_routes/routes.npz` → `data/historical_routes/routes.npz`
   - `src/models/gnn_gan/*.weights.h5` → `models/gnn_gan/`
   - `src/results/plots/demo_routes.png` → `results/plots/`
3. **Delete** `src/data/`, `src/models/`, `src/results/` entirely
4. **Update all relative paths** in `src/*.py` `__main__` blocks:
   - `"../models/"` → use config-based paths from Pydantic Settings
   - `"../results/"` → same

### Files With Hardcoded Relative Paths to Update

| File | Lines | Current Path | Fix |
|------|-------|-------------|-----|
| `src/traffic_generator.py` | 818-825 | `"../models/sg_gan"`, `"../results/plots"` | Use Settings |
| `src/q_learning_agent.py` | 673-677 | `"../models/q_learning"` | Use Settings |
| `src/road_graph.py` | 744 | `"../results/plots/road_graph.png"` | Use Settings |
| `src/route_generator.py` | 697-698 | `"../results/plots"` | Use Settings |
| `src/main.py` | 107-109 | `'models'`, `'results'`, `'data'` | Use Settings |
| `backend_api.py` | 66 | `sys.path.insert(0, ...)` | Remove (use package import) |
| `backend_api.py` | 658 | `Path(__file__).parent / "frontend" / "dist"` | Use Settings |

### Confidence: HIGH

---

## 6. Pydantic Settings Design (STAB-06)

### Package

```
pip install pydantic-settings>=2.0.0
```

(`pydantic-settings` is separate from `pydantic` since v2)

### Settings Class

Create `src/config.py`:

```python
"""
EV Routing System Configuration
================================
Single source of truth for all paths and parameters.
Uses Pydantic Settings for env-var override support.
"""
from pathlib import Path
from pydantic_settings import BaseSettings
from pydantic import Field
from functools import lru_cache


def _project_root() -> Path:
    """Locate project root (directory containing pyproject.toml)."""
    current = Path(__file__).resolve().parent
    for parent in [current] + list(current.parents):
        if (parent / "pyproject.toml").exists():
            return parent
    return current.parent  # fallback


class EVRoutingSettings(BaseSettings):
    """All project configuration, overridable via environment variables."""

    # ── Project root (auto-detected) ────────────────────
    project_root: Path = Field(default_factory=_project_root)

    # ── Directory paths (relative to project root) ──────
    model_dir: str = "models"
    data_dir: str = "data"
    results_dir: str = "results"
    frontend_dist_dir: str = "frontend/dist"

    # ── ML Hyperparameters ──────────────────────────────
    grid_size: int = 10
    max_battery: float = 100.0
    battery_capacity_kwh: float = 60.0
    gan_epochs: int = 100
    gan_batch_size: int = 32
    gnn_epochs: int = 50
    gnn_batch_size: int = 16
    rl_episodes: int = 500
    rl_max_steps: int = 200
    traffic_samples: int = 500
    historical_routes: int = 300
    seed: int = 42
    use_gnn_gan: bool = True

    # ── API Config ──────────────────────────────────────
    cors_origins: str = "http://localhost:5173,http://localhost:3000"
    log_format: str = "json"
    max_body_size: int = 1_048_576
    api_host: str = "0.0.0.0"
    api_port: int = 8000

    # ── Resolved absolute paths ─────────────────────────
    @property
    def models_path(self) -> Path:
        return self.project_root / self.model_dir

    @property
    def data_path(self) -> Path:
        return self.project_root / self.data_dir

    @property
    def results_path(self) -> Path:
        return self.project_root / self.results_dir

    @property
    def frontend_dist_path(self) -> Path:
        return self.project_root / self.frontend_dist_dir

    # ── Subdirectory helpers ────────────────────────────
    @property
    def sg_gan_model_path(self) -> Path:
        return self.models_path / "sg_gan"

    @property
    def gnn_gan_model_path(self) -> Path:
        return self.models_path / "gnn_gan"

    @property
    def q_learning_model_path(self) -> Path:
        return self.models_path / "q_learning"

    @property
    def plots_path(self) -> Path:
        return self.results_path / "plots"

    @property
    def metrics_path(self) -> Path:
        return self.results_path / "metrics"

    model_config = {"env_prefix": "EV_", "env_file": ".env", "extra": "ignore"}


@lru_cache()
def get_settings() -> EVRoutingSettings:
    """Cached singleton settings instance."""
    return EVRoutingSettings()
```

### Integration Strategy

Each module that currently uses hardcoded paths gets updated:

```python
# BEFORE (src/main.py)
self.config = config or self._default_config()
# ...
'model_dir': 'models',
'results_dir': 'results',
'data_dir': 'data',

# AFTER
from config import get_settings
settings = get_settings()
# Use settings.models_path, settings.data_path, etc.
```

```python
# BEFORE (backend_api.py)
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))
# ...
frontend_path = Path(__file__).parent / "frontend" / "dist"
# ...
_cors_origins = os.getenv("CORS_ORIGINS", "...").split(",")

# AFTER
from src.config import get_settings
settings = get_settings()
# ...
frontend_path = settings.frontend_dist_path
_cors_origins = settings.cors_origins.split(",")
```

### How `__main__` blocks in src/*.py change

The `__main__` blocks in `traffic_generator.py`, `q_learning_agent.py`, `road_graph.py` use relative paths like `"../models/"`. These aren't typically run in production (they're for standalone testing). Options:
1. **Replace with Settings** — best for consistency
2. **Remove** — if no one uses them standalone anymore

Recommended: Replace with `get_settings()` calls. The Settings `_project_root()` always finds the right root regardless of CWD.

### Confidence: HIGH

---

## 7. Dependency Pinning Strategy (STAB-07)

### Current State

Three requirements files with **inconsistent, loose pins**:

| File | Style | Issues |
|------|-------|--------|
| `requirements.txt` | `>=` lower bounds only | `tensorflow>=2.10.0` could install 2.20 |
| `requirements-api.txt` | `==` exact pins | `tensorflow==2.14.0` conflicts with requirements.txt |
| `requirements-dev.txt` | `>=` lower bounds, includes `-r requirements.txt` | No upper bounds |

**Currently installed** (on this system):
- Python 3.11.9
- tensorflow 2.20.0
- numpy 2.4.2
- scipy 1.17.0
- gymnasium 1.2.3
- networkx 3.6.1
- pytest 9.0.2
- **Missing**: fastapi, pydantic, uvicorn, anyio, httpx, slowapi, pytest-asyncio, pydantic-settings

### Conflicts

`requirements-api.txt` pins `tensorflow==2.14.0` and `numpy==1.24.3` but the system has `tensorflow==2.20.0` and `numpy==2.4.2`. These are incompatible.

### Recommended Approach

1. **Create `requirements-lock.txt`** using `pip freeze` after installing a verified working set
2. **Do NOT use pip-compile** (requires pip-tools which adds complexity) — `pip freeze` is simpler and sufficient
3. **Pin the exact versions that work together**

### Exact Steps

```bash
# 1. Create clean venv
python -m venv .venv
.venv\Scripts\activate

# 2. Install core deps with known-good versions
pip install tensorflow==2.18.0 numpy==1.26.4 scipy==1.14.1 networkx==3.4.2 gymnasium==0.29.1 matplotlib==3.9.3

# 3. Install API deps
pip install fastapi==0.115.6 uvicorn==0.34.0 pydantic==2.10.4 pydantic-settings==2.7.1 slowapi==0.1.9 python-multipart==0.0.18 python-json-logger==2.0.7

# 4. Install dev deps
pip install pytest==8.3.4 pytest-asyncio==0.25.2 pytest-cov==6.0.0 httpx==0.28.1

# 5. Freeze
pip freeze > requirements-lock.txt
```

### Why tensorflow==2.18.0 and numpy==1.26.4

- TF 2.18.0 is the last stable release that supports numpy 1.26.x (TF 2.19+ requires numpy 2.x which has breaking changes)
- numpy 1.26.4 is the most stable 1.x release, avoids numpy 2.x migration issues
- These two are known to work together reliably on Python 3.11

### Confidence: HIGH

---

## 8. Import Architecture Fix

### Current Problem

The `src/` modules use dual-import try/except patterns:

```python
try:
    from road_graph import RoadGraph  # works when CWD=src/
except ImportError:
    from src.road_graph import RoadGraph  # works when CWD=project root
```

This is fragile and creates module identity issues (same module may be imported under two names).

### Recommended Fix

1. **Add `src/__init__.py`** (currently missing!) — makes `src` a proper Python package
2. **Standardize all imports to `from src.X import Y`** form
3. **Remove all `sys.path.insert()` hacks**
4. **Remove all try/except import fallbacks**
5. **The `conftest.py` at project root handles path setup for pytest**

After adding `src/__init__.py` and running from project root:
- `backend_api.py`: `from src.road_graph import ...` ✓ (already does this)
- `tests/test_api.py`: Remove `sys.path.insert`, import `backend_api` directly (pytest adds project root to path)
- `src/main.py`: Change `from road_graph import ...` → `from src.road_graph import ...`
- `src/route_generator.py`: Change try/except → `from src.road_graph import ...`
- `src/environment.py`: Same pattern
- etc.

**BUT** — This breaks `python src/main.py` standalone execution. To preserve it, add to `pyproject.toml`:

```toml
[project.scripts]
ev-routing = "src.main:main"
```

Or accept that the canonical way to run is `python -m src.main` from project root.

### Alternative: Keep try/except but add `src/__init__.py`

Less disruption but still messy. **Not recommended** for STAB-06 goals.

### Confidence: HIGH for the approach. Implementation requires touching every `src/*.py` file.

---

## 9. Code Examples for Planner

### conftest.py (project root)

```python
import sys
import asyncio
import pytest

# MUST be at module level — runs before pytest collects tests
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())


@pytest.fixture(scope="session", autouse=True)
def _windows_event_loop_policy():
    """Reinforce SelectorEventLoop on Windows."""
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    yield
    asyncio.set_event_loop_policy(None)
```

### pyproject.toml changes

```toml
[tool.pytest.ini_options]
addopts = "-v --tb=short"
testpaths = ["tests", "src"]
python_files = ["test_*.py"]
python_classes = ["Test*"]
python_functions = ["test_*"]
asyncio_mode = "auto"
markers = [
    "slow: marks tests as slow",
    "gpu: marks tests that may use GPU",
]
```

### TypeScript fixes

For `App.tsx` — if the error is about an unused variable `e`, the fix depends on what `e` is:
```tsx
// If it's a catch parameter:
} catch (_error: unknown) {  // prefix with underscore

// If it's an event handler parameter:
const handler = (_e: MediaQueryListEvent) => { ... }
```

For `Header.tsx` — remove `isDarkMode` from destructuring if unused:
```tsx
// BEFORE
const { isDarkMode, themeMode, cycleTheme } = useTheme();
// AFTER
const { themeMode, cycleTheme } = useTheme();
```

### vitest.config.ts fix

```typescript
export default defineConfig({
    plugins: [react()],
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: ['./src/test-setup.ts'],
        include: ['src/**/*.{test,spec}.{ts,tsx}'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'lcov'],
            include: ['src/**/*.{ts,tsx}'],
            exclude: ['src/**/*.test.*', 'src/main.tsx'],
        },
    },
});
```

---

## 10. Risk Assessment

| Item | Risk | Mitigation |
|------|------|------------|
| asyncio fix | LOW | Well-known fix, deterministic |
| TS fixes | LOW | Mechanical (remove unused vars) |
| Vitest tests | LOW | Tests are well-written with proper mocks |
| Playwright E2E | MEDIUM | Title assertion may need updating; needs dev server |
| Directory consolidation | MEDIUM | Must merge unique files from src/ before deleting |
| Pydantic Settings | MEDIUM | Touches many files; need thorough import testing |
| Dependency pinning | HIGH | TF/numpy version compatibility is fragile; must test in clean venv |
| Import refactor | MEDIUM | Every src/*.py file changes; risk of circular imports |

### Task Ordering Recommendation

1. **First**: Dependency pinning (STAB-07) — everything else depends on packages working
2. **Second**: Windows asyncio fix (STAB-01) — unblocks test validation
3. **Third**: Directory consolidation (STAB-05) — clean slate for path changes
4. **Fourth**: Pydantic Settings + import cleanup (STAB-06) — biggest refactor
5. **Fifth**: TypeScript fixes (STAB-02) — trivial
6. **Sixth**: Vitest fixes (STAB-03) — wire setup file, run tests
7. **Seventh**: Playwright E2E (STAB-04) — depends on frontend building correctly

---

## 11. Open Questions for Planner

1. **Should `src/` modules still be runnable standalone?** (`python src/main.py`) — affects import strategy
2. **Do we create a fresh virtualenv as part of this phase?** — pinning deps without one isn't reproducible
3. **E2E tests**: The `app.spec.ts` checks title `/EVRouteOpt/i` — does `index.html` actually have this title? Need to verify.
4. **The `src/test_environment.py` constructor**: It calls `EVRoutingEnvironment(grid_size=5, max_battery=100)` but the class constructor takes `config: EnvironmentConfig` — this may be using a different init signature or could be broken.
