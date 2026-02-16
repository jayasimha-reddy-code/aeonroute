# Research Synthesis — EV Routing Upgrade

> **Synthesized:** 2026-02-16  
> **Sources:** STACK.md, FEATURES.md, ARCHITECTURE.md, PITFALLS.md  
> **Purpose:** Actionable decisions feeding into ROADMAP.md and phase planning

---

## 1. Stack Decisions

### Use (Prescriptive Picks)

| Area | Decision | Why |
|------|----------|-----|
| **Animation** | Framer Motion 12.x | Spring physics, `AnimatePresence` exit animations, `layout` prop for card transitions. Only library that handles glassmorphism + page transitions + gestures in one dep. |
| **Maps** | MapLibre GL 5.x + react-map-gl 8.x | WebGL GPU-rendering for route animation at 60fps. Native line-gradient for energy consumption coloring. Instant dark mode map style switching. |
| **Charts** | Recharts 2.15 (upgrade in place) | Already integrated across 4 pages. Upgrade adds better animation easing. Pair with `d3-ease` for spring-like chart entrances. |
| **Glassmorphism** | Custom Tailwind 3.4 tokens (no plugin) | Existing 273-line config is 90% there. Add `backdropBlur`, `glass` bg/border color tokens, noise texture overlay. Zero new deps. |
| **ML framework** | TensorFlow 2.18 + Keras 3.8 (standalone) | Mixed precision, XLA compilation, Apple Silicon support. Mechanical migration: `from tensorflow.keras` → `from keras`. |
| **RL framework** | Stable-Baselines3 2.4 + Gymnasium 1.1 | Replaces 702-line manual DQN with battle-tested implementation. TensorBoard logging, checkpointing, eval callbacks included. |
| **Training stream** | SSE (Server-Sent Events) | One-way server→client — purpose-built for training progress. Lower complexity than WebSocket. Keep polling as fallback. |
| **Python testing** | pytest 8.3 + pytest-asyncio 0.25 + httpx 0.28 | Direct fix for Windows `asyncio` crash (`code 0x80000003`). Async test support without threading bugs. |
| **JS testing** | Vitest 4.x (keep current) | Already installed and configured. No change needed. |

### Avoid (Anti-Picks)

| Library | Why Not |
|---------|---------|
| GSAP | Proprietary license, imperative ref-soup in React |
| React Spring | No exit animations, no layout animations, needs separate gesture lib |
| Tailwind v4 | Full config rewrite (273 lines), plugin ecosystem incompatible, zero visual payoff |
| Leaflet | DOM-based, chokes on 50+ animated polylines, no dark mode maps, no vector tiles |
| Deck.gl | Requires MapLibre underneath (+400 KB), overkill for route visualization |
| Mapbox GL | Proprietary since v2.0, requires paid API key |
| Tremor | Ships Recharts internally (doubles bundle), opinionated styling conflicts |
| Nivo | ~90 KB per chart type (4 types = 360 KB) |
| Chart.js | Canvas-based — can't apply CSS `backdrop-filter` |
| RLlib (Ray) | ~500 MB deps, distributed training overkill |
| TF-Agents | Deprecated priority at Google, would fight PyTorch for RL |
| Celery + Redis | Overkill for single-server demo |

### Bundle Impact

| Change | Size Delta |
|--------|-----------|
| +MapLibre GL | +280 KB |
| +Framer Motion | +17 KB |
| −Leaflet | −40 KB |
| +d3-ease | ~3 KB |
| **Net** | **+~260 KB** (offset by WebGL perf gains) |

---

## 2. Feature Priorities

Ranked by presentation impact relative to implementation complexity.

### Tier 1 — Non-Negotiable (Prevents Disqualification)

| # | Feature | Complexity | Why |
|---|---------|-----------|-----|
| 1 | Fix all tests (Python + JS) | Medium | Evaluators check code quality |
| 2 | Zero TypeScript errors | Medium | DevTools open → errors visible |
| 3 | Glassmorphism design system | Medium | First impression defines perception |
| 4 | Spring-physics page transitions | Easy | Instant "real app" feel via Framer Motion |
| 5 | Animated stat cards with number rollup | Easy | Makes dashboard feel alive |
| 6 | Skeleton loading screens | Easy | Prevents blank states |
| 7 | Route comparison side-by-side | Medium | Makes optimization tangible |

### Tier 2 — Differentiators (Wins the Demo)

| # | Feature | Complexity | Impact |
|---|---------|-----------|--------|
| 8 | **Live training visualization (SSE + animated charts)** | Medium-Hard | **Very High** — single most impressive feature |
| 9 | **Live EV simulation (car moving along route)** | Hard | **Very High** — most memorable visual moment |
| 10 | Animated route drawing on map | Medium | High — cinematic route tracing |
| 11 | Time-of-day traffic slider | Medium | High — proves SG-GAN captures temporal patterns |
| 12 | Interactive network nodes (hover/click) | Medium | High — makes GNN architecture visible |
| 13 | Click-to-select source/dest on map | Medium | High — intuitive UX |

### Tier 3 — Nice-to-Have

| # | Feature | Complexity | Impact |
|---|---------|-----------|--------|
| 14 | ML architecture diagram with animated data flow | Medium | Medium-High |
| 15 | Charging station optimization display | Medium | Medium |
| 16 | Model versioning | Medium | Low-Medium |

### Explicitly Do NOT Build

- User authentication/login (zero demo value)
- External API integration (failure points in live demo)
- Mobile responsive (presenting on laptop/projector)
- Database (PostgreSQL/MongoDB) — filesystem is fine for demo
- Kubernetes/cloud deployment (invisible in demo)
- Microservices (monolith is correct for this scope)
- GraphQL (REST is familiar to evaluators)
- CI/CD pipeline (nice for eng, invisible in demo)
- PDF reports, i18n, RBAC, admin panel

---

## 3. Architecture Plan

### Backend: Break Up the 662-Line Monolith

**Target structure:**

```
backend/app/
├── main.py              # App factory + lifespan
├── config.py            # Pydantic Settings (all env vars, paths)
├── dependencies.py      # AppState class + Depends() providers
├── middleware/           # CORS, logging, security headers
├── models/              # Pydantic request/response schemas
├── routers/             # health, routing, training, analytics
├── services/            # Business logic (routing, training, analytics)
└── cache.py             # Generic TTLCache class
```

**Key patterns:**
- `AppState` dataclass replaces `global system` / `global training_status`
- FastAPI `Depends()` injects state → enables mock overrides in tests
- `Pydantic Settings` centralizes all paths, env vars, magic numbers
- `asyncio.create_task()` + `ThreadPoolExecutor` for CPU-bound ML training (not `BackgroundTasks`)
- SSE endpoint streams training progress; polling endpoint as fallback

### Frontend: Animation + Glassmorphism Layer

**Component hierarchy:**

```
components/
├── ui/          # GlassCard, GlassButton, AnimatedNumber, Skeleton
├── layout/      # Header, Sidebar, PageTransition (AnimatePresence)
├── domain/      # NetworkMap, RouteCard, StatCard, TrainingPipeline
└── composed/    # Dashboard, RoutePlanner, Training, Analytics
```

**Animation tokens:** Staggered entrance, spring-physics cards, animated number counters, training pipeline step animations — all via Framer Motion `variants`.

### Data Flow

```
Training: Backend thread → AppState → SSE endpoint → EventSource hook → Zustand → UI
Routing:  User click → API call → Service → ML pipeline → Response → Zustand → Map
Stats:    30s polling → API → Zustand → Dashboard auto-refresh
```

### File Deduplication

Delete `src/data/`, `src/models/`, `src/results/` — keep canonical dirs at project root. Update `main.py` paths to use Pydantic Settings config.

### Recommended Build Order

1. **Foundation** — Config (Pydantic Settings), fix Windows test crash, deduplicate dirs
2. **Backend Structure** — AppState + DI, extract models/middleware, split routers, create services
3. **Data Flow** — TTLCache cleanup, SSE training endpoint, frontend SSE/polling hooks
4. **Frontend Polish** — Framer Motion install, glassmorphism tokens, page transitions, staggered grids, animated numbers
5. **Map Migration** — Leaflet → MapLibre GL (single component: `NetworkMap.tsx`)
6. **Hero Features** — Animated route drawing, live training viz, EV simulation, traffic slider
7. **Testing Maturity** — Backend DI test isolation, Framer Motion mocks, Playwright visual snapshots

---

## 4. Risk Mitigation — Top 5

| # | Risk | Severity | Prevention | Recovery |
|---|------|----------|-----------|----------|
| 1 | **GAN training instability (NaN/mode collapse) during live demo** | Critical | Pre-train all models. Demo shows only 5-10 epoch fine-tune. Set fixed seeds. Add spectral normalization + gradient clipping. Test exact loop 5+ times on demo machine. | Load pre-trained checkpoint. "Skip to results" button. Show pre-saved outputs. |
| 2 | **Glassmorphism performance (backdrop-filter frame drops on projector/integrated GPU)** | High | Limit blur to 10-12px. Apply glass to small elements only (cards, tooltips), not full-width surfaces. Test at 30Hz to simulate projector. | CSS toggle to `perf-mode` (solid backgrounds, no blur) via keyboard shortcut `Ctrl+Shift+P`. |
| 3 | **TF version mismatch breaks model loading after upgrade** | High | Pin exact versions (`tensorflow==2.18.0`, `numpy==1.26.4`). Test in separate branch. Save models in `.keras` AND `.weights.h5`. Verify load in clean venv. **Do NOT upgrade TF within 2 weeks of demo.** | `requirements-lock.txt` rollback. Archive dir with models in multiple formats. Rebuild architecture + load weights only. |
| 4 | **SSE/WebSocket connection drops during long training** | Medium | Send heartbeats every 15s. Auto-reconnect with 3s backoff on frontend. Keep polling endpoint as fallback. | "Check Status" button for one-shot fetch. Refresh page. Narrate terminal output if all else fails. |
| 5 | **Demo day environment failure (WiFi, ports, paths, Docker)** | Medium | Use `127.0.0.1` everywhere. Cache all external data (map tiles) locally. Test with WiFi disabled. Use relative paths (audit for hardcoded absolute paths). Pre-build Docker images. Bring own laptop + HDMI adapter + mobile hotspot. | Kill port conflicts (`taskkill`). Non-Docker fallback scripts. USB drive with full project. Pre-recorded 3-min video as absolute last resort. |

### Code Freeze Protocol

| Timeline | Allowed Changes |
|----------|----------------|
| >72h before demo | Features, refactoring, experiments |
| 72h–24h before | Bug fixes only, no structural changes |
| <24h before | **Critical** bug fixes only |
| Demo day | **NOTHING** |

---

## 5. Key Insights — Cross-Cutting Themes

### 1. The 80/20 Rule for Presentation Impact

**80% of demo impact comes from 4 features:** glassmorphism UI, animated route drawing, live training visualization, and EV simulation. Everything else is supporting cast. Prioritize these ruthlessly.

### 2. Pre-Compute Everything, Visualize the Last Mile

Every research dimension converges on the same insight: **never compute from scratch during a live demo.** Pre-train models, pre-cache routes, pre-generate traffic patterns. The demo shows the last 5-10% of work with beautiful visualization.

### 3. Backend Refactoring Enables Everything

The 662-line single-file backend is the bottleneck. SSE streaming, test isolation, configuration management, and service extraction all require breaking up this monolith first. It's the critical path for both hero features (live training viz) and test reliability.

### 4. Projector-Hostile Design Is a Real Threat

Dark mode + glassmorphism + subtle animations = beautiful on a monitor, invisible on a projector. Every visual decision must be tested at 30Hz, low brightness, with washed-out blacks. Build a "presentation mode" toggle that bumps contrast, thickens borders, increases font sizes, and simplifies animations.

### 5. The Demo Is a Story, Not a Feature Tour

The optimal demo flow is a 12-15 minute narrative arc: **Hook** (polished dashboard) → **Intelligence** (route planning + comparison) → **Simulation** (EV moving along route) → **ML Depth** (live training) → **Metrics** (analytics) → **Close** (confidence). Features that don't serve this narrative arc should be deprioritized.

---

## 6. Recommendations for Roadmap

### Suggested Phase Ordering

| Phase | Name | Focus | Rationale |
|-------|------|-------|-----------|
| **01** | **Foundation & Stability** | Fix tests, Pydantic config, deduplicate dirs, pin deps | Everything depends on a stable base. Test crashes block all QA. |
| **02** | **Backend Restructure** | Split monolith into routers/services/DI, AppState, middleware | Unblocks SSE streaming, test isolation, and all backend features. Critical path. |
| **03** | **Design System & UI Polish** | Glassmorphism tokens, Framer Motion, page transitions, glass components, skeletons | First impression is formed in 3 seconds. This phase transforms the app from "homework" to "product." |
| **04** | **Map & Route Visualization** | Leaflet → MapLibre migration, animated route drawing, route comparison, click-to-select | Core domain is routing — the map must be impressive. MapLibre enables all Tier 2 map features. |
| **05** | **Live Data & Training** | SSE training stream, live training viz, training pipeline animation, traffic slider | The "hero feature" — live ML training visualization. Depends on backend restructure (Phase 02). |
| **06** | **EV Simulation & Interactivity** | Moving EV on route, battery depletion, charging stops, interactive network topology | "Wow moment" — the most memorable visual. Builds on map (Phase 04) and data flow (Phase 05). |
| **07** | **ML Pipeline Upgrade** | TF 2.18 + Keras 3, SB3 for RL, spectral norm on GANs, demo-mode training | ML improvements that produce better outputs. Deferred because current ML works — this optimizes it. |
| **08** | **Testing & Demo Hardening** | Backend DI test isolation, animation mocks, Playwright visual tests, presentation mode toggle, code freeze | Final hardening. Ensures everything survives demo day. Includes projector mode. |

### Key Dependencies Between Phases

```
Phase 01 ──→ Phase 02 ──→ Phase 05
                │              │
                ▼              ▼
           Phase 08       Phase 06
                
Phase 01 ──→ Phase 03 ──→ Phase 04 ──→ Phase 06

Phase 01 ──→ Phase 07 (independent of UI phases)
```

- **01 → 02 → 05** is the critical path for live training visualization
- **01 → 03 → 04 → 06** is the critical path for EV simulation
- **07** (ML upgrade) is semi-independent — can run in parallel with UI phases, but do it before code freeze
- **08** (hardening) must be last

### Phase Sizing Estimate

| Phase | Estimated Plans | Complexity |
|-------|----------------|------------|
| 01 | 2-3 plans | Light |
| 02 | 3-4 plans | Heavy (most code changes) |
| 03 | 2-3 plans | Medium |
| 04 | 2-3 plans | Medium-Heavy (MapLibre migration) |
| 05 | 2-3 plans | Medium-Heavy (SSE + real-time charts) |
| 06 | 2 plans | Hard (animation state management) |
| 07 | 2-3 plans | Medium (mechanical migration + GAN improvements) |
| 08 | 2 plans | Light-Medium |

---

*This synthesis feeds directly into PROJECT.md requirements and ROADMAP.md phase definitions. No additional research needed — proceed to planning.*
