# Requirements: EV Routing System

**Defined:** 2026-02-16
**Core Value:** When an evaluator sees this app, they immediately understand this is production-grade AI engineering — the route planner works live, the ML training is visible, and every interaction feels polished and intentional.

## v1 Requirements

Requirements for presentation-ready release. Each maps to roadmap phases.

### Stability & Bug Fixes

- [ ] **STAB-01**: All Python tests pass reliably on Windows (fix asyncio ProactorEventLoop crash)
- [ ] **STAB-02**: All TypeScript compiles with zero errors in strict mode (tsc --noEmit passes)
- [ ] **STAB-03**: All Vitest unit tests pass with zero failures
- [ ] **STAB-04**: All Playwright E2E tests pass
- [ ] **STAB-05**: Duplicate data/models/results directories consolidated to root-level canonical locations
- [ ] **STAB-06**: All hardcoded paths replaced with Pydantic Settings configuration
- [ ] **STAB-07**: Python dependencies pinned with exact versions in requirements-lock.txt

### Backend Architecture

- [ ] **BACK-01**: FastAPI monolith split into routers (health, routing, training, analytics)
- [ ] **BACK-02**: Global mutable state replaced with AppState class + dependency injection
- [ ] **BACK-03**: Pydantic Settings for all configuration (paths, env vars, limits)
- [ ] **BACK-04**: SSE endpoint for real-time training progress streaming
- [ ] **BACK-05**: Proper input validation on all route planning endpoints (node existence, battery range)
- [ ] **BACK-06**: ML training runs in ThreadPoolExecutor (non-blocking event loop)
- [ ] **BACK-07**: TTL cache cleanup with proper invalidation
- [ ] **BACK-08**: Security headers and rate limiting preserved after refactor

### Design System & UI

- [ ] **UI-01**: Glassmorphism design tokens in Tailwind (backdrop-blur, glass bg/border, noise texture)
- [ ] **UI-02**: Glass card, glass button, glass input components in ui/ directory
- [ ] **UI-03**: Light/dark mode toggle with smooth animated transition
- [ ] **UI-04**: Framer Motion spring-physics page transitions (AnimatePresence)
- [ ] **UI-05**: Staggered entrance animations on dashboard cards and list items
- [ ] **UI-06**: Animated number counters on stat cards (rolling number effect)
- [ ] **UI-07**: Skeleton loading screens for all data-dependent views
- [ ] **UI-08**: Responsive layout optimized for laptop + projector presentation
- [ ] **UI-09**: Presentation mode toggle (higher contrast, thicker borders, simpler animations)

### Map & Route Visualization

- [ ] **MAP-01**: MapLibre GL replaces Leaflet for GPU-accelerated map rendering
- [ ] **MAP-02**: Dark mode map style that switches with app theme
- [ ] **MAP-03**: Animated route drawing (polyline traces with progressive reveal)
- [ ] **MAP-04**: Energy consumption color gradient along route (green → yellow → red)
- [ ] **MAP-05**: Click-to-select source and destination on map
- [ ] **MAP-06**: Route comparison: 2-3 alternatives displayed simultaneously with legend
- [ ] **MAP-07**: Interactive network nodes (hover shows details, click selects)

### Live Data & Training

- [ ] **LIVE-01**: SSE-powered real-time training progress in frontend (EventSource hook)
- [ ] **LIVE-02**: Animated loss curves that build in real-time during training (generator + discriminator)
- [ ] **LIVE-03**: Animated reward curve for Q-Learning/RL training
- [ ] **LIVE-04**: Training pipeline step visualization (7-step progress with current step highlighted)
- [ ] **LIVE-05**: Time-of-day traffic pattern slider (shows SG-GAN temporal patterns)
- [ ] **LIVE-06**: Dashboard auto-refresh with polling (30s interval)
- [ ] **LIVE-07**: Polling fallback when SSE connection drops (auto-reconnect with backoff)

### EV Simulation & Interactivity

- [ ] **SIM-01**: Animated EV icon moving along planned route on map
- [ ] **SIM-02**: Battery level indicator depleting as EV travels (animated gauge)
- [ ] **SIM-03**: Charging station stops with charge animation (battery filling)
- [ ] **SIM-04**: Route timeline showing distance, time, energy at each segment
- [ ] **SIM-05**: Interactive network topology (hover nodes for stats, click edges for weights)

### ML Pipeline Improvements

- [ ] **ML-01**: SG-GAN training stability improved (spectral normalization on discriminator, gradient clipping)
- [ ] **ML-02**: GNN route generation accuracy improved with hyperparameter tuning
- [ ] **ML-03**: Q-Learning convergence improved with reward shaping
- [ ] **ML-04**: All models saved in .keras format (drop legacy .h5)
- [ ] **ML-05**: Demo-mode training (5-10 epochs from checkpoint, not from scratch)
- [ ] **ML-06**: Comprehensive evaluation metrics displayed in Analytics page

### Testing & Demo Hardening

- [ ] **TEST-01**: Backend test isolation via DI mock overrides (no global state in tests)
- [ ] **TEST-02**: Frontend animation tests with Framer Motion mocks
- [ ] **TEST-03**: Playwright visual regression tests for key pages
- [ ] **TEST-04**: Presentation mode keyboard shortcut (Ctrl+Shift+P)
- [ ] **TEST-05**: App works fully offline (cached map tiles, bundled data)
- [ ] **TEST-06**: Pre-trained model checkpoints included in repo for instant demo

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Advanced Features

- **ADV-01**: Multi-stop waypoint routing (3+ stops)
- **ADV-02**: Route export/sharing (URL or PDF)
- **ADV-03**: ML architecture diagram with animated data flow overlay
- **ADV-04**: Model versioning (save/load multiple training runs)
- **ADV-05**: Charging station optimization algorithm
- **ADV-06**: Real-time external traffic API integration (TOMTOM/HERE)

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| User authentication/login | Zero demo value — single-user presentation app |
| Database (PostgreSQL/MongoDB) | File-system sufficient for demo; adds complexity with no visible benefit |
| Mobile responsive | Presenting on laptop/projector only |
| CI/CD pipeline | Invisible in demo; nice for eng but not for presentation |
| Kubernetes/cloud deployment | Runs locally for demo |
| GraphQL API | REST is familiar to evaluators, simpler to debug |
| Microservices architecture | Monolith is correct for this scope |
| Payment/billing | Not a commercial product |
| Multi-vehicle fleet routing | Single EV focus keeps scope manageable |
| i18n/localization | English-only demo |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| STAB-01 | Phase 1 | Pending |
| STAB-02 | Phase 1 | Pending |
| STAB-03 | Phase 1 | Pending |
| STAB-04 | Phase 1 | Pending |
| STAB-05 | Phase 1 | Pending |
| STAB-06 | Phase 1 | Pending |
| STAB-07 | Phase 1 | Pending |
| BACK-01 | Phase 2 | Pending |
| BACK-02 | Phase 2 | Pending |
| BACK-03 | Phase 2 | Pending |
| BACK-04 | Phase 2 | Pending |
| BACK-05 | Phase 2 | Pending |
| BACK-06 | Phase 2 | Pending |
| BACK-07 | Phase 2 | Pending |
| BACK-08 | Phase 2 | Pending |
| UI-01 | Phase 3 | Pending |
| UI-02 | Phase 3 | Pending |
| UI-03 | Phase 3 | Pending |
| UI-04 | Phase 3 | Pending |
| UI-05 | Phase 3 | Pending |
| UI-06 | Phase 3 | Pending |
| UI-07 | Phase 3 | Pending |
| UI-08 | Phase 3 | Pending |
| UI-09 | Phase 3 | Pending |
| MAP-01 | Phase 4 | Pending |
| MAP-02 | Phase 4 | Pending |
| MAP-03 | Phase 4 | Pending |
| MAP-04 | Phase 4 | Pending |
| MAP-05 | Phase 4 | Pending |
| MAP-06 | Phase 4 | Pending |
| MAP-07 | Phase 4 | Pending |
| LIVE-01 | Phase 5 | Pending |
| LIVE-02 | Phase 5 | Pending |
| LIVE-03 | Phase 5 | Pending |
| LIVE-04 | Phase 5 | Pending |
| LIVE-05 | Phase 5 | Pending |
| LIVE-06 | Phase 5 | Pending |
| LIVE-07 | Phase 5 | Pending |
| SIM-01 | Phase 6 | Pending |
| SIM-02 | Phase 6 | Pending |
| SIM-03 | Phase 6 | Pending |
| SIM-04 | Phase 6 | Pending |
| SIM-05 | Phase 6 | Pending |
| ML-01 | Phase 7 | Pending |
| ML-02 | Phase 7 | Pending |
| ML-03 | Phase 7 | Pending |
| ML-04 | Phase 7 | Pending |
| ML-05 | Phase 7 | Pending |
| ML-06 | Phase 7 | Pending |
| TEST-01 | Phase 8 | Pending |
| TEST-02 | Phase 8 | Pending |
| TEST-03 | Phase 8 | Pending |
| TEST-04 | Phase 8 | Pending |
| TEST-05 | Phase 8 | Pending |
| TEST-06 | Phase 8 | Pending |

**Coverage:**

- v1 requirements: 50 total
- Mapped to phases: 50
- Unmapped: 0 ✓

---

_Requirements defined: 2026-02-16_
_Last updated: 2026-02-16 after initialization_
