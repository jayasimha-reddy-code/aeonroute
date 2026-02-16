---
phase: 01-foundation-stability
plan: 03
subsystem: infra
tags: [pydantic-settings, imports, directory-structure, config]

requires:
  - phase: 01-01
    provides: Python test infrastructure working (conftest.py, deps installed)
provides:
  - Centralized EVRoutingSettings (src/config.py)
  - Single canonical data/, models/, results/ at project root
  - All imports standardized to src.X package pattern
  - Zero sys.path hacks, zero hardcoded paths
affects: [02-ui-overhaul, 03-backend-hardening, 04-ml-pipeline]

tech-stack:
  added: [pydantic-settings]
  patterns:
    - "All config via get_settings() singleton"
    - "All imports use src.X package prefix"
    - "Path resolution via settings.models_path, settings.data_path, etc."

key-files:
  created:
    - src/config.py
    - src/__init__.py
  modified:
    - src/main.py
    - src/evaluate.py
    - src/environment.py
    - src/route_generator.py
    - src/gnn_route_generator.py
    - src/q_learning_agent.py
    - src/road_graph.py
    - src/traffic_generator.py
    - backend_api.py
    - src/test_traffic_generation.py
    - src/test_route_generator.py
    - src/test_road_graph.py
    - src/test_environment.py

key-decisions:
  - "Removed duplicate src/data, src/models, src/results (merged unique files to root)"
  - "Used Pydantic Settings with EV_ env prefix for all config"
  - "Replaced try/except dual-import patterns with direct src.X imports"
  - "Hardcoded paths in __main__ blocks use get_settings() properties"

patterns-established:
  - "Import pattern: from src.module import Class"
  - "Path pattern: settings = get_settings(); settings.models_path / 'subdir'"
  - "Config singleton: from src.config import get_settings"

duration: 25min
completed: 2025-02-16
---

# Plan 01-03: Directory Consolidation & Pydantic Settings Summary

**Single canonical directory structure with centralized Pydantic Settings — zero hardcoded paths, zero sys.path hacks**

## Performance

- **Duration:** ~25 min
- **Tasks:** 2/2 completed
- **Files modified:** 17 (2 created + 15 modified)

## Accomplishments

- Consolidated duplicate data/, models/, results/ directories (merged unique files from src/ to root, deleted src/ duplicates)
- Created src/config.py with EVRoutingSettings (Pydantic BaseSettings) — all paths, ML hyperparams, API config centralized
- Created src/__init__.py making src a proper Python package
- Removed 5 sys.path.insert hacks across main.py, evaluate.py, backend_api.py, test files
- Converted 16 bare imports to src.X package pattern
- Replaced 2 try/except dual-import blocks with direct imports
- Replaced all ../models, ../results, ../data hardcoded paths with settings properties

## Task Commits

1. **Task 1: Consolidate directories + Pydantic Settings** — `fb39894` (feat)
2. **Task 2: Standardize imports + replace paths** — `0adeff2` (refactor)

## Files Created

- `src/config.py` — EVRoutingSettings with all project paths and config
- `src/__init__.py` — Package marker

## Files Modified

- `src/main.py` — Removed sys.path hack, 7 imports standardized
- `src/evaluate.py` — Removed sys.path hack, 5 imports standardized
- `src/environment.py` — Replaced try/except import with direct src.road_graph import
- `src/route_generator.py` — Replaced try/except imports, paths use settings
- `src/gnn_route_generator.py` — Fixed __main__ import
- `src/q_learning_agent.py` — Fixed import + paths use settings
- `src/road_graph.py` — Paths use settings
- `src/traffic_generator.py` — Paths use settings
- `backend_api.py` — Removed sys.path hack
- `src/test_*.py` (4 files) — Removed sys.path hacks, standardized imports

## Test Results

- **Python:** 52/52 passed (0 failures)
- **Backend import:** Succeeds without errors
- **sys.path.insert grep:** 0 matches
- **Hardcoded path grep:** 0 matches
