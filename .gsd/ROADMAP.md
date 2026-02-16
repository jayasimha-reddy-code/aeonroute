# Roadmap: EV Routing System

## v1 — Presentation Release

> **Core Value:** When an evaluator sees this app, they immediately understand this is production-grade AI engineering — the route planner works live, the ML training is visible, and every interaction feels polished and intentional.

**Phases:** 8 | **Requirements:** 50 | **Status:** Not Started

### Phase Dependency Diagram

```
Phase 01 ──→ Phase 02 ──→ Phase 05 (Live Data & Training)
                │              │
                │              ▼
                └────────→ Phase 08 (Testing & Hardening) ← LAST
                
Phase 01 ──→ Phase 03 ──→ Phase 04 ──→ Phase 06 (EV Simulation)

Phase 01 ──→ Phase 07 (ML Pipeline — semi-independent)
```

- **01 → 02 → 05** — Critical path for live training visualization
- **01 → 03 → 04 → 06** — Critical path for EV simulation
- **07** — Semi-independent after Phase 01 (can parallel with UI phases)
- **08** — Must be last (final hardening before demo)

---

### Phase 01: Foundation & Stability
**Goal:** Establish a stable, tested, properly configured codebase that all subsequent phases can build on without fighting broken tests, duplicate files, or hardcoded paths.
**Status:** ✅ Complete
**Dependencies:** None
**Requirements:** STAB-01, STAB-02, STAB-03, STAB-04, STAB-05, STAB-06, STAB-07

**Success Criteria:**
1. ✅ `pytest` runs on Windows without asyncio ProactorEventLoop crash — 52 tests green
2. ✅ `tsc --noEmit` (0 errors), `vitest run` (24/24), Playwright (8/8)
3. ✅ Only one canonical `data/`, `models/`, `results/` at project root — src/ duplicates deleted
4. ✅ All paths from Pydantic Settings — zero sys.path hacks, zero hardcoded paths
5. ✅ `requirements-lock.txt` created with pinned dependencies

**Plans:** 3 plans (3/3 complete)

Plans:
- [x] 01-01-PLAN.md — Python test infrastructure (deps + asyncio fix)
- [x] 01-02-PLAN.md — Frontend fixes (TS errors + Vitest + Playwright)
- [x] 01-03-PLAN.md — Directory consolidation & Pydantic Settings

---

### Phase 02: Backend Restructure
**Goal:** Break the 662-line FastAPI monolith into clean routers, services, and dependency injection so that SSE streaming, test isolation, and all backend features become possible.
**Status:** ✅ Complete
**Dependencies:** Phase 01
**Requirements:** BACK-01, BACK-02, BACK-03, BACK-04, BACK-05, BACK-06, BACK-07, BACK-08

**Success Criteria:**
1. ✅ `backend/app/` contains separate router files (health, routing, training, analytics) — no route definitions in `main.py`
2. ✅ `AppState` class injected via `Depends()` — zero `global` keywords in backend code
3. ✅ ML training endpoint responds immediately and streams progress via SSE (`/api/training/stream`)
4. ✅ All existing API endpoints return identical responses (regression test passes — 31/31)
5. ✅ Security headers and rate limiting still present in response headers after refactor

**Plans:** 4 plans (4/4 complete)

Plans:
- [x] 02-01-PLAN.md — Scaffold backend/app/ + AppState + models + middleware + deps
- [x] 02-02-PLAN.md — Health, routing, analytics routers + service layer
- [x] 02-03-PLAN.md — Training router + SSE streaming + ThreadPoolExecutor
- [x] 02-04-PLAN.md — Proxy rewrite + regression tests + security verification

---

### Phase 03: Design System & UI Polish
**Goal:** Transform the frontend from functional prototype to glassmorphism-styled, animation-rich application that makes evaluators say "this looks professional" within three seconds.
**Status:** Not Started
**Dependencies:** Phase 01
**Requirements:** UI-01, UI-02, UI-03, UI-04, UI-05, UI-06, UI-07, UI-08, UI-09

**Success Criteria:**
1. Glass card components render with visible `backdrop-filter: blur()` and frosted border — inspectable in DevTools
2. Navigating between pages shows spring-physics slide/fade transition (Framer Motion AnimatePresence)
3. Dashboard stat cards animate numbers rolling up from 0 on page load
4. Light/dark toggle switches theme with smooth crossfade — no flash of unstyled content
5. All data-loading states show skeleton shimmer screens, never blank white space

**Estimated Plans:** 2–3 | **Complexity:** Medium

---

### Phase 04: Map & Route Visualization
**Goal:** Replace Leaflet with MapLibre GL for GPU-accelerated map rendering, then add animated route drawing, energy gradients, and interactive click-to-select — making the core routing domain visually impressive.
**Status:** Not Started
**Dependencies:** Phase 03
**Requirements:** MAP-01, MAP-02, MAP-03, MAP-04, MAP-05, MAP-06, MAP-07

**Success Criteria:**
1. Map renders via MapLibre GL (WebGL) — Leaflet fully removed from dependencies
2. Clicking two nodes on the map sets source and destination, triggering route calculation
3. Route draws progressively on the map with animated polyline trace (not instant appearance)
4. Energy consumption visualized as color gradient along route (green → yellow → red)
5. Two or three alternative routes displayed simultaneously with distinguishable colors and legend

**Estimated Plans:** 2–3 | **Complexity:** Medium-Heavy

---

### Phase 05: Live Data & Training
**Goal:** Connect frontend to real-time training progress via SSE, showing animated loss/reward curves building live during ML training — the single most impressive demo feature.
**Status:** Not Started
**Dependencies:** Phase 02
**Requirements:** LIVE-01, LIVE-02, LIVE-03, LIVE-04, LIVE-05, LIVE-06, LIVE-07

**Success Criteria:**
1. Starting training from UI opens an SSE connection — loss values stream into animated Recharts line graph in real-time
2. Q-Learning training shows reward curve building live (not loaded after completion)
3. 7-step training pipeline displays current step highlighted with progress indicator
4. Time-of-day traffic slider on dashboard updates heatmap showing SG-GAN temporal patterns
5. If SSE connection drops, frontend auto-reconnects with exponential backoff and falls back to polling

**Estimated Plans:** 2–3 | **Complexity:** Medium-Heavy

---

### Phase 06: EV Simulation & Interactivity
**Goal:** Create the "wow moment" — an animated EV icon moving along the planned route on the map with battery depleting, charging station stops, and interactive network exploration.
**Status:** Not Started
**Dependencies:** Phase 04
**Requirements:** SIM-01, SIM-02, SIM-03, SIM-04, SIM-05

**Success Criteria:**
1. After route calculation, clicking "Simulate" shows an EV icon smoothly moving along the route path on the map
2. Battery gauge in sidebar depletes in sync with EV position and energy consumption
3. When EV reaches a charging station, charge animation plays (battery filling up)
4. Route timeline panel shows distance, estimated time, and energy at each segment
5. Hovering network nodes shows stats popup; clicking edges reveals weight details

**Estimated Plans:** 2 | **Complexity:** Hard

---

### Phase 07: ML Pipeline Upgrade
**Goal:** Improve model training stability and output quality — spectral normalization on GAN discriminator, SB3 for RL, .keras format, and demo-mode fast training from checkpoints.
**Status:** Not Started
**Dependencies:** Phase 01
**Requirements:** ML-01, ML-02, ML-03, ML-04, ML-05, ML-06

**Success Criteria:**
1. SG-GAN training completes 100 epochs without NaN loss or mode collapse (spectral normalization active)
2. Q-Learning agent converges to stable policy in fewer episodes than before (reward shaping improved)
3. All saved models use `.keras` format — no `.h5` files in `models/` directory
4. Demo-mode training starts from checkpoint and completes 5–10 epochs in under 60 seconds
5. Analytics page shows comprehensive evaluation metrics (loss curves, accuracy, sample outputs)

**Estimated Plans:** 2–3 | **Complexity:** Medium

---

### Phase 08: Testing & Demo Hardening
**Goal:** Final hardening pass — ensure test isolation, visual regression coverage, presentation mode toggle, and full offline capability so the demo survives any environment.
**Status:** Not Started
**Dependencies:** Phase 02, Phase 03, Phase 04, Phase 05, Phase 06, Phase 07
**Requirements:** TEST-01, TEST-02, TEST-03, TEST-04, TEST-05, TEST-06

**Success Criteria:**
1. Backend tests use DI mock overrides — no test touches global state or real file system
2. Pressing `Ctrl+Shift+P` activates presentation mode (higher contrast, thicker borders, simpler animations)
3. Playwright visual regression tests capture key pages and detect unintended layout changes
4. App works fully offline — map tiles cached, all data bundled, no external fetch calls
5. Pre-trained model checkpoints included in repo — `git clone` + `docker compose up` → working demo

**Estimated Plans:** 2 | **Complexity:** Light-Medium

---

### Phase Sizing Summary

| Phase | Name | Plans | Complexity | Dependencies |
|-------|------|-------|------------|--------------|
| 01 | Foundation & Stability | 2–3 | Light | None |
| 02 | Backend Restructure | 4 | Heavy | 01 |
| 03 | Design System & UI Polish | 2–3 | Medium | 01 |
| 04 | Map & Route Visualization | 2–3 | Medium-Heavy | 03 |
| 05 | Live Data & Training | 2–3 | Medium-Heavy | 02 |
| 06 | EV Simulation & Interactivity | 2 | Hard | 04 |
| 07 | ML Pipeline Upgrade | 2–3 | Medium | 01 |
| 08 | Testing & Demo Hardening | 2 | Light-Medium | 02, 03, 04, 05, 06, 07 |

**Parallel Opportunities (mode: yolo, parallelization: true):**
- Phase 02 + Phase 03 can execute in parallel (both depend only on Phase 01)
- Phase 07 can run alongside Phase 03/04/05 (semi-independent after Phase 01)
- Phase 04 + Phase 05 can overlap if Phase 02 and Phase 03 are both complete

---

_Roadmap created: 2026-02-16_
_Last updated: 2026-02-16_
