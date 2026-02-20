# Phase 14 Plan 01: Architecture Consolidation & Cleanup Summary

Docker spaghetti nuked, Python requirements consolidated to single file, MapLibre v5→v4 downgrade fixes fatal WebGL crash — `npm run build` exits 0.

## Performance

- **Duration:** 6 min
- **Started:** 2026-02-20T14:02:51Z
- **Completed:** 2026-02-20T14:09:50Z
- **Tasks completed:** 3/3
- **Files modified:** 15+

## Accomplishments

### Task 1: Delete Redundant Docker Files (fcbbf57)
- Deleted `docker/Dockerfile` (legacy test runner, never used by UI compose)
- Deleted legacy `docker-compose.yml` (test/training/tensorboard — never used in production)
- Promoted `docker-compose.ui.yml` → `docker-compose.yml` (canonical compose)
- Moved `docker/Dockerfile.backend` → `backend/Dockerfile`
- Moved `docker/Dockerfile.frontend` → `frontend/Dockerfile`
- Updated compose references to new Dockerfile paths
- Removed obsolete `version: '3.8'` attribute
- Updated Makefile Docker targets
- Deleted `docker/` directory entirely

### Task 2: Consolidate Python Requirements (ff3918e)
- Merged `requirements-api.txt` (FastAPI, uvicorn, sse-starlette, etc.) into `requirements.txt`
- Upgraded version pins to match latest stable (tensorflow>=2.14, networkx>=3.2, gymnasium==0.29.1)
- Deleted `requirements-api.txt`
- Updated `backend/Dockerfile` to reference `requirements.txt`

### Task 3: Fix Vite/MapLibre Fatal Crash (ea0e9a9)
- Deleted stale `vite.config.js` and `vite.config.d.ts` build artifacts
- Downgraded `maplibre-gl` from `^5.18.0` to `^4.7.1` (stable with react-map-gl v7)
- Pinned `react-map-gl` to `^7.1.7` (compatible with maplibre-gl v4)
- Added `optimizeDeps.include` for maplibre-gl pre-bundling in `vite.config.ts`
- Fixed type imports: `CircleLayerSpecification` and `LineLayerSpecification` now from `@maplibre/maplibre-gl-style-spec` (not re-exported by maplibre-gl v4)
- Added `emitDeclarationOnly` to `tsconfig.node.json` to prevent JS emission from `tsc -b`
- Added build artifacts (`vite.config.js`, `vite.config.d.ts`, `*.tsbuildinfo`) to `.gitignore`
- `npm run build` exits 0, 2668 modules transformed, zero errors

## Files Created/Modified

**Deleted:**
- `docker/Dockerfile` — legacy test runner
- `docker/Dockerfile.backend` — moved to `backend/Dockerfile`
- `docker/Dockerfile.frontend` — moved to `frontend/Dockerfile`
- `docker-compose.yml` — legacy test/tensorboard compose
- `docker-compose.ui.yml` — promoted to `docker-compose.yml`
- `docker/` directory — entirely removed
- `requirements-api.txt` — merged into `requirements.txt`
- `frontend/vite.config.js` — stale build artifact
- `frontend/vite.config.d.ts` — stale build artifact
- `frontend/tsconfig.node.tsbuildinfo` — build artifact
- `frontend/tsconfig.tsbuildinfo` — build artifact

**Modified:**
- `docker-compose.yml` — new canonical compose with updated paths
- `backend/Dockerfile` — references `requirements.txt`
- `requirements.txt` — consolidated all Python deps
- `Makefile` — updated Docker targets
- `frontend/package.json` — maplibre-gl ^4.7.1, react-map-gl ^7.1.7
- `frontend/vite.config.ts` — added optimizeDeps.include
- `frontend/tsconfig.node.json` — added emitDeclarationOnly
- `frontend/.gitignore` — added build artifacts
- `frontend/src/components/map/NetworkNodesLayer.tsx` — fixed type import
- `frontend/src/components/map/NetworkEdgesLayer.tsx` — fixed type import

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Type imports incompatible with maplibre-gl v4**
- **Found during:** Task 3 (MapLibre downgrade)
- **Issue:** `CircleLayerSpecification` and `LineLayerSpecification` types are not re-exported by `maplibre-gl` v4 (only in v5). They exist in `@maplibre/maplibre-gl-style-spec`.
- **Fix:** Changed imports from `maplibre-gl` to `@maplibre/maplibre-gl-style-spec`
- **Files modified:** `NetworkNodesLayer.tsx`, `NetworkEdgesLayer.tsx`
- **Verification:** `npm run build` succeeds with zero type errors

**2. [Rule 3 - Blocking] tsc -b regenerates vite.config.js on every build**
- **Found during:** Task 3 (after deleting vite.config.js)
- **Issue:** `tsconfig.node.json` with `composite: true` causes `tsc -b` to emit JS from vite.config.ts, recreating the file we deleted
- **Fix:** Added `emitDeclarationOnly: true` to `tsconfig.node.json` and added `vite.config.js` to `.gitignore`
- **Files modified:** `tsconfig.node.json`, `.gitignore`
- **Verification:** Build no longer produces stale JS artifacts

**Total deviations:** 2 auto-fixed (both blocking issues preventing task completion)

## Decisions Made

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | Downgrade maplibre-gl to v4 instead of fixing v5 | v4 is the stable version compatible with react-map-gl v7; v5+v8 combo has known `__publicField` and WebGL context loss bugs |
| 2 | Use @maplibre/maplibre-gl-style-spec for types | Types are defined there and only re-exported by maplibre-gl v5, not v4 |
| 3 | Add emitDeclarationOnly to tsconfig.node | Prevents tsc from regenerating deleted build artifacts |

## Issues Encountered

None — all tasks completed successfully.

## Verification Results

1. ✅ Exactly 1 `docker-compose.yml` at project root
2. ✅ Exactly 1 `Dockerfile` in `backend/`, 1 in `frontend/`
3. ✅ `docker/` directory deleted
4. ✅ `requirements-api.txt` deleted, deps merged into `requirements.txt`
5. ✅ `vite.config.js` and `vite.config.d.ts` deleted (and gitignored)
6. ✅ `npm run build` succeeds with zero errors (2668 modules, 18s)
7. ✅ `docker compose config` validates without errors

## Next Phase Readiness

Ready for 14-02-PLAN.md (Wave 2: The Missing AI Brain & Scalability Dial).
No blockers or concerns.
