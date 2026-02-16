---
phase: 02-backend-restructure
plan: 01
subsystem: api
tags: [fastapi, dependency-injection, pydantic, cachetools, sse-starlette]
requires:
  - phase: 01-foundation
    provides: "src/config.py EVRoutingSettings, test infrastructure"
provides:
  - "backend/app/ package with create_app() factory"
  - "AppState dataclass with TTL caches"
  - "Pydantic request/response models"
  - "Middleware stack (security headers, logging, error handler)"
  - "4 stub routers (health, routing, training, analytics)"
affects: [02-02, 02-03, 02-04]
tech-stack:
  added: [sse-starlette, cachetools]
  patterns: [app-factory, dependency-injection, dataclass-state]
key-files:
  created:
    - backend/app/main.py
    - backend/app/state.py
    - backend/app/middleware.py
    - backend/app/models/requests.py
    - backend/app/models/responses.py
    - backend/app/dependencies.py
  modified:
    - requirements-api.txt
key-decisions:
  - "AppState as dataclass with TTLCache fields instead of global variables"
  - "create_app() factory pattern for testability"
  - "Middleware registered via register_middleware() function, not decorators"
patterns-established:
  - "App factory: create_app() returns configured FastAPI instance"
  - "State injection: Depends(get_state) in all endpoint signatures"
  - "Response helpers: ok() and fail() for uniform API envelope"
duration: 8min
completed: 2026-02-16
---

# Plan 02-01: Scaffold Backend Package

**Created backend/app/ package with AppState, Pydantic models, middleware, and create_app() factory — the foundation for the restructured backend.**

## Performance

- **Duration:** ~8 min
- **Tasks:** 2/2
- **Files created:** 16

## Accomplishments

- Created backend/app/ directory structure with all subpackages
- Extracted and centralized AppState with cachetools TTL caches
- Moved Pydantic request/response models from monolith
- Extracted middleware into standalone functions with register_middleware()
- Created create_app() factory with all middleware and 4 stub routers
- Installed sse-starlette and cachetools dependencies

## Task Commits

1. **Task 1: Create backend/app/ package + AppState + models + deps** - `83a8ae1` (feat)
2. **Task 2: Create main.py factory + middleware + stub routers** - `fd7995d` (feat)

## Files Created/Modified

- `backend/app/main.py` - Application factory with lifespan, middleware, routers
- `backend/app/state.py` - AppState dataclass with TTL caches
- `backend/app/middleware.py` - Security headers, request logger, exception handler
- `backend/app/dependencies.py` - DI providers (get_state, get_settings)
- `backend/app/models/requests.py` - EVStateRequest, RouteRequest, TrainingConfig
- `backend/app/models/responses.py` - APIResponse, ok(), fail() helpers
- `requirements-api.txt` - Added sse-starlette and cachetools
