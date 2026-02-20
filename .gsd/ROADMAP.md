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
**Status:** ✅ Complete
**Dependencies:** Phase 01
**Requirements:** UI-01, UI-02, UI-03, UI-04, UI-05, UI-06, UI-07, UI-08, UI-09

**Success Criteria:**
1. Glass card components render with visible `backdrop-filter: blur()` and frosted border — inspectable in DevTools
2. Navigating between pages shows spring-physics slide/fade transition (Framer Motion AnimatePresence)
3. Dashboard stat cards animate numbers rolling up from 0 on page load
4. Light/dark toggle switches theme with smooth crossfade — no flash of unstyled content
5. All data-loading states show skeleton shimmer screens, never blank white space

**Plans:** 3 plans (3/3 complete)

Plans:
- [x] 03-01-PLAN.md — Glass components + theme polish + skeleton screens (Wave 1)
- [x] 03-02-PLAN.md — Framer Motion integration + page transitions + animated counters (Wave 2)
- [x] 03-03-PLAN.md — Responsive layout + presentation mode (Wave 3)

---

### Phase 04: Map & Route Visualization
**Goal:** Replace Leaflet with MapLibre GL for GPU-accelerated map rendering, then add animated route drawing, energy gradients, and interactive click-to-select — making the core routing domain visually impressive.
**Status:** ✅ Complete
**Dependencies:** Phase 03
**Requirements:** MAP-01, MAP-02, MAP-03, MAP-04, MAP-05, MAP-06, MAP-07

**Success Criteria:**
1. ✅ Map renders via MapLibre GL (WebGL) — Leaflet fully removed from dependencies
2. ✅ Clicking two nodes on the map sets source and destination, triggering route calculation
3. ✅ Route draws progressively on the map with animated polyline trace (not instant appearance)
4. ✅ Energy consumption visualized as color gradient along route (green → yellow → red)
5. ✅ Two or three alternative routes displayed simultaneously with distinguishable colors and legend

**Plans:** 2 plans (2/2 complete)

Plans:
- [x] 04-01-PLAN.md — MapLibre GL foundation: deps, geo utils, MapView component, node interactivity, theme switching
- [x] 04-02-PLAN.md — Route visualization: animated drawing, energy gradient, multi-route comparison, legend

---

### Phase 05: Live Data & Training
**Goal:** Connect frontend to real-time training progress via SSE, showing animated loss/reward curves building live during ML training — the single most impressive demo feature.
**Status:** ✅ Complete
**Dependencies:** Phase 02
**Requirements:** LIVE-01, LIVE-02, LIVE-03, LIVE-04, LIVE-05, LIVE-06, LIVE-07

**Success Criteria:**
1. Starting training from UI opens an SSE connection — loss values stream into animated Recharts line graph in real-time
2. Q-Learning training shows reward curve building live (not loaded after completion)
3. 7-step training pipeline displays current step highlighted with progress indicator
4. Time-of-day traffic slider on dashboard updates heatmap showing SG-GAN temporal patterns
5. If SSE connection drops, frontend auto-reconnects with exponential backoff and falls back to polling

**Plans:** 3 plans (3/3 complete)

Plans:
- [x] 05-01-PLAN.md — Backend training metrics pipeline (ML callbacks + SSE enrichment + temporal endpoint)
- [x] 05-02-PLAN.md — SSE streaming + live training charts (useSSE hook + Zustand + Recharts)
- [x] 05-03-PLAN.md — Traffic slider + dashboard auto-refresh

---

### Phase 06: EV Simulation & Interactivity
**Goal:** Create the "wow moment" — an animated EV icon moving along the planned route on the map with battery depleting, charging station stops, and interactive network exploration.
**Status:** ✅ Complete
**Dependencies:** Phase 04
**Requirements:** SIM-01, SIM-02, SIM-03, SIM-04, SIM-05

**Success Criteria:**
1. ✅ After route calculation, clicking "Simulate" shows an EV icon smoothly moving along the route path on the map
2. ✅ Battery gauge in sidebar depletes in sync with EV position and energy consumption
3. ✅ When EV reaches a charging station, charge animation plays (battery filling up)
4. ✅ Route timeline panel shows distance, estimated time, and energy at each segment
5. ✅ Hovering network nodes shows stats popup; clicking edges reveals weight details

**Plans:** 2 plans (2/2 complete)

Plans:
- [x] 06-01-PLAN.md — EV simulation engine + map animation (EVMarker, BatteryGauge, ChargingOverlay)
- [x] 06-02-PLAN.md — Route timeline + network interactivity (edge weights, node stats, segment breakdown)

---

### Phase 07: ML Pipeline Upgrade
**Goal:** Improve model training stability and output quality — spectral normalization on GAN discriminator, reward shaping for RL, .keras format, and demo-mode fast training from checkpoints.
**Status:** ✅ Complete
**Dependencies:** Phase 01
**Requirements:** ML-01, ML-02, ML-03, ML-04, ML-05, ML-06

**Success Criteria:**
1. ✅ SG-GAN training completes 100 epochs without NaN loss or mode collapse (spectral normalization active)
2. ✅ Q-Learning agent converges to stable policy in fewer episodes than before (reward shaping improved)
3. ✅ All saved models use `.keras` format — no `.h5` files in `models/` directory
4. ✅ Demo-mode training starts from checkpoint and completes 5–10 epochs in under 60 seconds
5. ✅ Analytics page shows comprehensive evaluation metrics (loss curves, accuracy, sample outputs)

**Plans:** 4 plans (4/4 complete)

Plans:
- [x] 07-01-PLAN.md — SG-GAN training stability & .h5 format cleanup
- [x] 07-02-PLAN.md — GNN hyperparameter config & RL reward shaping
- [x] 07-03-PLAN.md — Demo-mode training from checkpoints
- [x] 07-04-PLAN.md — Comprehensive evaluation metrics & Analytics page

---

### Phase 08: Testing & Demo Hardening
**Goal:** Final hardening pass — ensure test isolation, visual regression coverage, presentation mode toggle, and full offline capability so the demo survives any environment.
**Status:** ✅ Complete
**Dependencies:** Phase 02, Phase 03, Phase 04, Phase 05, Phase 06, Phase 07
**Requirements:** TEST-01, TEST-02, TEST-03, TEST-04, TEST-05, TEST-06

**Success Criteria:**
1. ✅ Backend tests use DI mock overrides — no test touches global state or real file system
2. ✅ Pressing `Ctrl+Shift+P` activates presentation mode (higher contrast, thicker borders, simpler animations)
3. ✅ Playwright visual regression tests capture key pages and detect unintended layout changes
4. ✅ App works fully offline — map tiles cached, all data bundled, no external fetch calls
5. ✅ Pre-trained model checkpoints included in repo — `git clone` + `docker compose up` → working demo

**Plans:** 3 plans (3/3 complete)

Plans:
- [x] 08-01-PLAN.md — Test infrastructure & isolation (backend DI mocks, frontend FM/MapLibre mocks)
- [x] 08-02-PLAN.md — Playwright visual regression for key pages
- [x] 08-03-PLAN.md — Offline demo & model checkpoints

---

### Phase 10: Nuclear UI Rebuild
**Goal:** Nuke the conflicting CSS variable system and grey-washed styling from Phase 09. Rebuild from scratch with a locked deep-dark midnight background (#0b0f19), semi-opaque glass surfaces (rgba(17,21,28,0.85)), and neon-green (#2ecc71) / neon-gold (#f1c40f) / neon-cyan (#1abc9c) accent palette. Permanent dark mode — no theme toggle.
**Status:** ⊘ Superseded by Phase 11
**Dependencies:** Phase 09
**Requirements:** UI-01, UI-03

_Superseded: Phase 10 was deemed too basic. Replaced by Phase 11 (Ultra-Premium Bento UI Rebuild) with higher visual fidelity, CSS Grid bento layouts, advanced primitives, and reference-image-matched page compositions._

---

### Phase 11: Ultra-Premium Bento UI Rebuild
**Goal:** Rebuild the entire frontend UI to ultra-premium bento-box cockpit quality matching 4-panel reference images. Replace all CSS variable systems with flat design tokens, implement CSS Grid 12-column bento layouts, next-gen glassmorphism (bg-white/[0.02], backdrop-blur-2xl), fluid micro-interactions (500ms ease-out), advanced map visuals (glowing polylines, pulse markers), rich analytics (gradient charts, hidden gridlines, dark tooltips), and complex UI primitives (custom toggles, sliders, progress rings, circular gauges). Permanent dark mode on midnight slate (#0a0f16).
**Status:** ✅ Complete
**Dependencies:** Phase 09 (codebase state)
**Requirements:** UI-01, UI-03

**Success Criteria:**
1. Bento-Box Grid Architecture — CSS Grid `grid-cols-12` layouts on every page, variable `col-span` cards creating mosaic compositions. No flexbox column hacks.
2. Next-Gen Glassmorphism — Cards: `bg-white/[0.02] backdrop-blur-2xl border border-white/[0.05] rounded-2xl`. Background: `#0a0f16` with radial emerald gradient overlay.
3. Fluid Micro-Interactions — All interactive elements: `transition-all duration-500 ease-out`. Hover lift `-translate-y-1`, emerald glow border, press `active:scale-[0.97]`.
4. Typography — Inter font, `text-slate-400` labels, `text-white` values, massive contrast ratio.
5. Advanced Map — Borderless `rounded-3xl`, glowing neon polyline routes (emerald-to-cyan gradient), pulse CSS keyframes on markers, dark CartoDB tiles.
6. Rich Analytics — Gradient area chart fills, hidden gridlines, dark glass tooltips `rgba(10,15,22,0.95)`, emerald/amber/cyan/red data palette.
7. Complex UI Primitives — Custom toggle switches, custom sliders with accent-glow thumbs, SVG progress rings, circular gauges, pipeline flow diagrams, real-time logs terminal.
8. `index.css` under 200 lines. All color authority in `tailwind.config.ts`.
9. Zero `var(--color-*)`, zero `dark:` prefixes, zero theme toggling.
10. Dashboard matches reference: 4 stat cards → large map (8/12) + AI Status panel (4/12) → Recent Activity.
11. Route Planner: tab pills + left controls (3/12) + map (9/12) + 4 bottom result cards.
12. Training: config panel (3/12) + pipeline flow diagram (9/12) + real-time logs terminal.
13. Analytics: date range → heatmap (6/12) + charts (6/12) → AI Insights full-width.

**Plans:** 5 plans (5 waves, sequential)

Plans:
- [x] 11-01-PLAN.md — Core CSS/Tokens & Bento Grid Setup: Nuke index.css + tailwind.config.ts, flat token system, dark mode lock, purge dark:/var(-- from codebase (Wave 1)
- [x] 11-02-PLAN.md — App Shell & Navigation: Rebuild App.tsx, 224px Sidebar with branding + user status, transparent Header with page title + actions (Wave 2)
- [x] 11-03-PLAN.md — Interactive Primitives & Micro-Animations: Rebuild Card, Button, Input, Badge, Spinner, Skeleton + new ToggleSwitch, Slider, ProgressRing, StatCard (Wave 3)
- [x] 11-04-PLAN.md — Map Overhaul: Borderless rounded-3xl container, glowing neon routes, pulse markers, dark-only tiles, glass popups (Wave 4)
- [x] 11-05-PLAN.md — Dashboard, Analytics & All Page Rebuilds: Bento grid page compositions matching reference images, chart restyling, Training pipeline flow, logs terminal (Wave 5)

---

### Phase 12: Hyper-Fidelity UI & Functional Replication
**Goal:** Eliminate every dead click, broken button, and missing interaction in the UI. Add react-router-dom routing, wire overflow menus, upgrade charts with gradient fills and glow effects, apply material-physics glass cards with directional bevels, and inject Framer Motion micro-interactions on every interactive element.
**Status:** ✅ Complete
**Dependencies:** Phase 11 (ultra-premium bento UI)
**Requirements:** UI-01, UI-03

**Success Criteria:**
1. ✅ react-router-dom URL-based routing with lazy-loaded pages — zero Zustand tab switcher usage
2. ✅ Sidebar collapse/expand toggle with persistent state and NavLink active indicators
3. ✅ Every `...` overflow button opens a glass dropdown with actions (Export, Refresh, Details)
4. ✅ Pill toggles (Fast/Eco/Scenic, Grid/List) physically swap rendered content
5. ✅ Charts upgraded with gradient fills, animated glow, dark glass tooltips
6. ✅ Glass cards with directional bevels, specular highlights, edge glow on hover
7. ✅ Framer Motion spring-physics hover/tap/stagger on every interactive element
8. ✅ Zero dead clicks remain in the entire UI

**Plans:** 5 plans (5 waves, sequential)

Plans:
- [x] 12-01-PLAN.md — Routing, Missing Pages & Shell State: react-router-dom, Stations/Settings pages, sidebar collapse, NavLink, studio lighting (Wave 1)
- [x] 12-02-PLAN.md — Component Interactivity & Dead Clicks Fix: OverflowMenu, ViewToggle, pill toggles, header toggles, date range picker (Wave 2)
- [x] 12-03-PLAN.md — Chart Upgrades & Data Visualization: gradient fills, animated glow filters, dark glass tooltips, axis cleanup (Wave 3)
- [x] 12-04-PLAN.md — Glass Material Physics & Card Upgrades: directional bevels, specular highlights, edge glow, depth-aware shadows (Wave 4)
- [x] 12-05-PLAN.md — Framer Motion Micro-Interactions & Polish: spring-physics hover/tap, stagger animations, page transitions, scroll reveal (Wave 5)

---

### Phase 13: Production Transition — Real Data & AI
**Goal:** Replace the entire synthetic backend (fake 10×10 grids, mock 503 endpoints, CUDA-crashing TensorFlow) with a production-grade system powered by real Hyderabad map data from OpenStreetMap (free Overpass API), real EV charging stations from OpenChargeMap (free public API), and a functioning Q-Learning agent trained over the real road graph. Wire the frontend to render real streets, generate real routes, and display real training metrics.
**Status:** ✅ Complete
**Dependencies:** Phase 12
**Requirements:** PROD-01 (Container Stability), PROD-02 (Real Map Data), PROD-03 (Real Stations), PROD-04 (Real AI), PROD-05 (Live Endpoints), PROD-06 (Frontend Integration), PROD-07 (UI Fidelity)

**Success Criteria:**
1. Docker container boots to `healthy` status — no CUDA crashes, no 503s
2. `/api/road-network` returns real Hyderabad streets (lat 17.3–17.5, lon 78.3–78.6, >1000 nodes)
3. `/api/stations` returns >10 real EV charging stations with real operator names
4. `/api/generate-route` returns GeoJSON LineString routes over Hyderabad streets
5. Q-Learning trains end-to-end via SSE streaming with real reward curves
6. Frontend map renders Hyderabad streets with real station markers
7. All glass cards match reference images (smoked glass, directional borders, heavy shadows)
8. Zero operating costs — all APIs are free and public

**Plans:** 2 plans (2 waves, sequential — backend first, frontend second)

**Public APIs:**
| API | Cost | Purpose |
|-----|------|---------|
| Overpass API (via OSMnx) | Free | Hyderabad street network |
| OpenChargeMap API | Free | Real EV charging station locations |

Plans:
- [x] 13-01-PLAN.md — Wave 1: Backend Reality (container fix, OSMnx graph, OpenChargeMap stations, Q-Learning, live endpoints)
- [x] 13-02-PLAN.md — Wave 2: Frontend Wiring & UI Polish (real map rendering, interactive routing, live training, glass audit)

---

### Phase 14: Critical System Reset — Nuke, Consolidate & Rebuild
**Goal:** Eliminate AI spaghetti accumulated over 13 phases. Delete duplicate Docker/config files, fix fatal MapLibre crash, write real Q-Learning training logic, make routes follow actual streets (not fly through buildings), and enforce true smoked-glass glassmorphism across the entire UI.
**Status:** ◆ In Progress (2/6 plans complete)
**Dependencies:** Phase 13
**Requirements:** STAB-01, BACK-01, MAP-01, UI-01

**Success Criteria:**
1. Exactly 1 `docker-compose.yml`, 1 `backend/Dockerfile`, 1 `frontend/Dockerfile` — zero duplicates
2. `npm run build` succeeds with zero MapLibre/WebGL errors — map loads without crash
3. All analytics endpoints return 200 (zero 503s) — real computed data, not mocks
4. "Start Training" button triggers real Q-Learning that streams live loss/reward via SSE
5. Routes render as glowing neon polylines following actual street geometry — zero straight-line cuts through buildings
6. All EV stations render as interactive markers with popups on the map
7. Every panel uses `bg-[#0a0f16]/40 backdrop-blur-2xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5)]`
8. All charts use gradient-filled AreaCharts with dark glass tooltips
9. RadarChart, stacked BarChart, demand heatmap, elevation profile, SVG gauges, live terminal, sparklines, weather widget — all rendering real content
10. Multi-stop waypoint list with drag-and-drop reordering
11. Zero placeholder empty divs in the entire UI
12. Node-based pipeline flowchart with animated SVG dash-flow paths on Training page
13. Estimated Carbon Saved SVG progress ring with sub-metrics on Route Planner
14. Segment-by-Segment breakdown list with glowing colored dots
15. Custom neon emerald CSS sliders (no default browser styling)
16. AI Insights panel with glowing 4-point star (✦) bullet icons on Analytics page

**Plans:** 6 plans (6 waves, sequential)

Plans:
- [x] 14-01-PLAN.md — Wave 1: Architecture Consolidation & Cleanup (Docker nuke, requirements merge, Vite/MapLibre fix)
- [x] 14-02-PLAN.md — Wave 2: The Missing AI Brain & Scalability Dial (fix 503s, Q-Learning training, Start Training button)
- [ ] 14-03-PLAN.md — Wave 3: True GeoJSON Routing (street-geometry LineStrings, neon polylines, station markers, simulation fix)
- [ ] 14-04-PLAN.md — Wave 4: Strict Target UI Enforcement (smoked-glass audit, gradient AreaCharts, reference image match)
- [ ] 14-05-PLAN.md — Wave 5: Complex UI Primitives & Bespoke Charts (RadarChart, stacked bars, heatmap, waypoint list, elevation profile, SVG gauges, live terminal, sparklines, weather widget)
- [ ] 14-06-PLAN.md — Wave 6: Flowcharts, Metrics & Micro-Polish (pipeline flowchart with animated SVG paths, carbon saved ring, segment list, neon sliders, AI Insights panel)

---

### Phase Sizing Summary

| Phase | Name | Plans | Complexity | Dependencies |
|-------|------|-------|------------|--------------|
| 01 | Foundation & Stability | 2–3 | Light | None |
| 02 | Backend Restructure | 4 | Heavy | 01 |
| 03 | Design System & UI Polish | 2–3 | Medium | 01 |
| 04 | Map & Route Visualization | 2 | Medium-Heavy | 03 |
| 05 | Live Data & Training | 2–3 | Medium-Heavy | 02 |
| 06 | EV Simulation & Interactivity | 2 | Hard | 04 |
| 07 | ML Pipeline Upgrade | 2–3 | Medium | 01 |
| 08 | Testing & Demo Hardening | 2 | Light-Medium | 02, 03, 04, 05, 06, 07 |
| 09 | UI Polish & Bug Fixes | 7 | Medium-Heavy | 03, 04, 05, 08 |
| 10 | Nuclear UI Rebuild | 3 | Medium | 09 | ⊘ Superseded |
| 11 | Ultra-Premium Bento UI Rebuild | 5 | Heavy | 09 |
| 12 | Hyper-Fidelity UI & Functional Replication | 5 | Heavy | 11 |
| 13 | Production Transition — Real Data & AI | 2 | Heavy | 12 |
| 14 | Critical System Reset: Nuke & Rebuild | 6 | Heavy | 13 |

---

_Roadmap created: 2026-02-16_
_Last updated: 2026-02-19 (Phase 13 complete — all phases done)_
