---
phase: 01-foundation-stability
plan: 01
status: complete
started: 2026-02-16
completed: 2026-02-16
---

# Summary: Python Test Infrastructure

## What Was Built
Fixed Windows asyncio ProactorEventLoop crash that killed pytest, pinned all Python dependencies, and configured pytest to discover tests across the entire project.

## Tasks Completed
1. **Pin dependencies and fix pytest configuration** — Created requirements-lock.txt with exact versions, updated requirements-api.txt & requirements-dev.txt, configured pyproject.toml with both test directories and asyncio_mode, created conftest.py with Windows asyncio fix
2. **Install dependencies and verify Python tests pass** — Installed missing packages (pytest-asyncio, httpx, pydantic-settings, fastapi, uvicorn, slowapi), ran full test suite: **52 passed, 0 failed**

## Key Files Modified
- `conftest.py` — Windows asyncio fix + TF suppression + matplotlib Agg
- `requirements-lock.txt` — Pinned dependency versions
- `requirements-api.txt` — Fixed version conflicts
- `requirements-dev.txt` — Added pytest-asyncio and httpx
- `pyproject.toml` — Updated testpaths and asyncio_mode

## Test Results
```
52 passed, 3 warnings in 18.28s
- tests/test_api.py: 17 passed
- src/test_environment.py: 3 passed
- src/test_road_graph.py: 13 passed
- src/test_route_generator.py: 9 passed
- src/test_traffic_generation.py: 4 passed
```

## Issues & Notes
- TensorFlow STATUS_BREAKPOINT (0x80000003) was caused by faulthandler intercepting C++ SEH — fixed by disabling faulthandler in conftest.py
- matplotlib Tcl thread crash fixed by setting MPLBACKEND=Agg before import
- All 52 tests pass without any hardcoded path failures (tests use relative imports that work from project root)
- The `src/test_*.py` files use bare imports (`from road_graph import ...`) which work because pyproject.toml testpaths includes `src/` and pytest adds it to sys.path

## Decisions Made
- Used `faulthandler.disable()` instead of just the asyncio policy — needed to fully suppress Windows TF crashes
- Set `CUDA_VISIBLE_DEVICES=-1` and `TF_ENABLE_ONEDNN_OPTS=0` in conftest to prevent GPU probing crashes
- Set `MPLBACKEND=Agg` to prevent Tkinter thread crashes during TestClient tests
