# Codebase Concerns

Technical debt, known issues, and areas of concern for the EV Routing System.

## Critical

### 1. Duplicate Data & Model Directories

**Severity: High** — Confusing, risks stale data.

Root-level `data/`, `models/`, `results/` mirror `src/data/`, `src/models/`, `src/results/` with overlapping but inconsistent contents:

| Directory | Root | src/ |
|-----------|------|------|
| `data/historical_routes/` | Empty | Contains `routes.npz` |
| `models/gnn_gan/` | Empty | Contains weights files |
| `models/sg_gan/` | Has `.h5` + `.keras` | Only `.keras` |
| `models/q_learning/` | Has `trained_agent.pkl` | Has `trained_agent.pkl` |

**Risk:** Code may read from one location but write to another. Unclear which is canonical.

### 2. Windows Fatal Exception in Tests

**Severity: High** — Test suite crashes.

`test_output.txt` shows a Windows fatal exception (`code 0x80000003`) during pytest, triggered by asyncio event loop issues on Windows:

```
Windows fatal exception: code 0x80000003
Thread 0x000032b8 (most recent call first):
  File "...\asyncio\windows_events.py", line 825 in _poll
```

Only 1 of 17 tests ran before the crash. The test suite is effectively non-functional on Windows.

### 3. TypeScript Compilation Errors

**Severity: Medium** — `frontend/tsc_errors.txt` records 2 errors:

- `src/App.tsx(31,22)`: TS6133 — unused variable `e`
- `src/components/Header.tsx(8,11)`: TS6133 — unused variable `isDarkMode`

Build succeeds (Vite doesn't enforce strict TS checks), but `tsc --noEmit` fails.

## High

### 4. No Authentication or Authorization

**Severity: High** — All API endpoints are publicly accessible.

`backend_api.py` has rate limiting via `slowapi` and CORS configuration, but zero authentication. Training endpoints (`/api/train/start`, `/api/train/stop`) can be triggered by anyone.

### 5. Global Mutable State in API

**Severity: High** — `backend_api.py` uses module-level mutable state:

- `system` (global EVRoutingSystem instance)
- `training_status` (dict tracking training progress)
- `route_cache` (LRU cache)

This breaks under concurrent requests and prevents horizontal scaling.

### 6. No Input Validation on Route Requests

**Severity: Medium-High** — Pydantic models provide basic type validation, but route planning endpoints don't validate that `start`/`end` nodes exist in the graph, battery constraints are physical, etc. Bad input could cause unhandled exceptions deep in the ML pipeline.

## Medium

### 7. Hardcoded Paths and Configuration

Multiple hardcoded paths throughout:
- `backend_api.py`: `sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))`
- `backend_api.py`: `frontend_path = Path(__file__).parent / "frontend" / "dist"`
- Import fallbacks with try/except blocks in `src/` modules (`from road_graph import ...` / `from src.road_graph import ...`)

### 8. No Database — File-System Only

All data stored as `.npy`, `.npz`, `.h5`, `.keras`, `.pkl`, `.json` files. No database for:
- Route history
- User preferences
- Training run metadata
- System configuration

This limits querying, concurrent access, and data integrity.

### 9. Frontend API Service Lacks Error Recovery

`frontend/src/services/api.ts` and `frontend/src/hooks/useApi.ts` handle errors with toast notifications but lack retry logic, offline detection, or request queuing.

### 10. No CI/CD Pipeline

No GitHub Actions, no automated testing on push, no deployment pipeline. The `Makefile` provides local commands but nothing runs in CI.

## Low

### 11. Mixed Model Serialization Formats

Models saved in both `.h5` (legacy Keras) and `.keras` (new Keras 3) formats. The `.h5` format is deprecated as of TensorFlow 2.16+.

### 12. Frontend Bundle Analysis

`frontend/stats.html` exists (bundle analyzer output) but is a committed build artifact — should be in `.gitignore`.

### 13. No Environment Variable Validation

`backend_api.py` reads `LOG_FORMAT` from env but most configuration is hardcoded. No `.env.example` file documenting expected environment variables.

## Recommendations (Priority Order)

1. **Consolidate duplicate directories** — Pick `src/` as canonical, remove or symlink root copies
2. **Fix Windows test crash** — Likely needs `asyncio.WindowsSelectorEventLoopPolicy()` or pytest-asyncio configuration
3. **Fix TypeScript errors** — Remove unused variables in `App.tsx` and `Header.tsx`
4. **Add basic API authentication** — At minimum, API key for training endpoints
5. **Extract global state** — Move to dependency injection or a proper state container
6. **Add CI pipeline** — GitHub Actions for pytest + vitest + tsc on push
7. **Add `.env.example`** — Document all environment variables

---

_Mapped: February 2026_
