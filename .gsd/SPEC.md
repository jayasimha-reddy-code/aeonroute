# SPEC.md — Project Specification

> **Status**: `FINALIZED`

## Vision

Build a **premium, production-grade** AI-powered Electric Vehicle Route Optimization platform that combines Graph Neural Networks (GNN), Semi-supervised Generative Adversarial Networks (SG-GAN), and Reinforcement Learning (Q-Learning) to deliver intelligent, energy-aware routing. The system features a **visually stunning** React + Leaflet frontend with fluid animations, real-time training feedback, and a FastAPI backend exposing the full ML pipeline as a REST API — all containerized with Docker.

## Goals

1. **Intelligent Routing Engine** — Generate optimal EV routes considering battery state, charging stations, traffic conditions, and energy consumption using GNN Route GAN + Q-Learning + classical pathfinding (Dijkstra, A*, k-shortest).
2. **Traffic Pattern Synthesis** — Use SG-GAN to generate realistic traffic scenarios with temporal patterns (rush hour, off-peak) for simulation and training.
3. **Premium Web Interface** — Deliver a Dashboard, Route Planner, Training Control, and Analytics suite with dark mode, glassmorphism, micro-animations, and interactive map visualizations.
4. **End-to-End ML Pipeline** — Provide a 7-step training pipeline (network creation → traffic generation → GAN training → GNN GAN training → RL environment → Q-Learning → evaluation) with real-time progress tracking.
5. **Production Readiness** — Ensure the system is containerized (Docker), well-tested, performant, and scalable for academic and demo deployment.

## Non-Goals (Out of Scope)

- Real-time OpenStreetMap (OSM) integration (future milestone)
- Live traffic API integration (TomTom, Google Maps)
- Multi-tenant user authentication / authorization
- Mobile native apps (iOS/Android)
- Payment processing for charging stations
- Fleet management (multi-vehicle coordination)
- Production cloud deployment (AWS/GCP/Azure) — local Docker only

## Users

| User Type | Description | Primary Use Case |
|-----------|-------------|------------------|
| **Researcher** | ML/AI academic studying GAN + RL for routing | Train models, evaluate metrics, analyze results |
| **Student** | CS student learning about routing algorithms | Run demos, explore architecture, study code |
| **Evaluator** | Professor or reviewer assessing the project | View training results, check UI, verify correctness |
| **Demo Viewer** | Conference attendee or portfolio reviewer | Interact with the UI, generate routes, see visualizations |

## Constraints

- **Runtime:** Python 3.9+ (backend), Node.js 18+ (frontend)
- **ML Framework:** TensorFlow/Keras for GAN models, NumPy/NetworkX for graph operations
- **Memory:** 8GB+ RAM recommended for training (default grid 10×10)
- **GPU:** Optional (NVIDIA CUDA for accelerated training)
- **Browser:** Modern browsers (Chrome, Firefox, Edge, Safari — latest 2 versions)
- **Containerization:** Docker + docker-compose for consistent environments
- **Project Type:** Academic / Research — educational and research purposes

---

## Functional Requirements

### FR-01: Road Network Management
- [ ] Create grid-based road networks (3×3 to 50×50 configurable)
- [ ] Support 4 road types: Highway, Arterial, Residential, Charging Access
- [ ] Automatic charging station placement with configurable density
- [ ] 24-hour traffic pattern generation per edge
- [ ] Expose road network topology via `/api/road-network`

### FR-02: Route Generation
- [ ] Shortest path (Dijkstra) with battery constraints
- [ ] Energy-optimal routing considering road type and traffic
- [ ] Time-optimal routing with traffic multipliers
- [ ] K-shortest paths (up to 20 candidates)
- [ ] GNN GAN-guided route generation with discriminator validation
- [ ] Charging-aware routing (automatic charging stop insertion when SoC < 50%)
- [ ] Expose via `POST /api/generate-route` with source, destination, EV state

### FR-03: Traffic Synthesis (SG-GAN)
- [ ] Train SG-GAN on synthetic traffic data
- [ ] Generate configurable number of traffic scenarios
- [ ] Multi-task discriminator: validates realism, temporal consistency, and distribution
- [ ] Expose generated patterns via `/api/traffic-patterns`

### FR-04: GNN Route GAN
- [ ] Graph Convolutional Layers (GCN) for route feature extraction
- [ ] Graph Attention Layers (GAT) for node importance weighting
- [ ] Multi-task discriminator: validity, energy feasibility, traffic realism, graph connectivity
- [ ] Train on historical routes with EV state conditioning
- [ ] Greedy decode with heuristics for route sequence generation

### FR-05: Reinforcement Learning Agent
- [ ] Gymnasium-compatible EV routing environment
- [ ] Tabular Q-Learning with ε-greedy exploration
- [ ] Deep Q-Network (DQN) agent option
- [ ] Configurable episodes, max steps, reward function

### FR-06: Training Pipeline
- [ ] 7-step sequential pipeline with progress tracking
- [ ] Background training via `POST /api/start-training`
- [ ] Real-time progress polling via `GET /api/training-status`
- [ ] Graceful stop via `POST /api/stop-training`
- [ ] Model persistence (`.keras`, `.weights.h5`, `.pkl`)

### FR-07: Evaluation & Analytics
- [ ] Route generation success rate measurement
- [ ] Agent performance evaluation (success %, avg reward)
- [ ] End-to-end system evaluation with metrics export
- [ ] Aggregate route metrics via `/api/route-metrics`
- [ ] TensorBoard integration for ML training visualization

---

## Non-Functional Requirements

### NFR-01: Performance

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Route generation latency** | < 500ms for grid ≤ 15×15 | Server-side timing via `X-Response-Time` header |
| **API cold start** | < 5s (network initialization) | Time from `uvicorn` start to first `200 OK` on `/health` |
| **Frontend initial load** | < 3s (LCP on 4G) | Lighthouse audit |
| **Frontend interaction delay** | < 100ms (input → visual feedback) | Manual + automated testing |
| **Map rendering** | < 1s for 100-node network | Browser performance profiling |
| **Training throughput** | Progress updates every 2s during training | `/api/training-status` polling |
| **Bundle size** | < 500KB gzipped (JS + CSS) | Vite build output analysis |

### NFR-02: UI/UX Polish

| Aspect | Requirement |
|--------|-------------|
| **Color System** | Curated HSL palette with vibrant accents; surface scale (50–950) for light/dark modes |
| **Typography** | Modern font stack (Inter or system UI); hierarchy with `text-xs` through `text-3xl` |
| **Dark Mode** | Full dark mode with `dark:` Tailwind variants; smooth 300ms transition on toggle |
| **Glassmorphism** | Frosted glass cards with `backdrop-blur-xl` + subtle border on key panels |
| **Icons** | Consistent `lucide-react` icon set; 20px default size; semantic icon usage |
| **Spacing** | 4px grid system; consistent `p-4`/`p-6` padding; breathing room between sections |
| **Responsive** | Sidebar collapses at `md` breakpoint; cards stack vertically on mobile |
| **Skeleton States** | Animated skeleton placeholders during data loading (never show empty states) |
| **Empty States** | Meaningful illustrations + CTAs when no data exists |
| **Error States** | Toast notifications with type-based coloring (error=red, success=green, info=blue) |

### NFR-03: Animation System

| Animation | Specification |
|-----------|---------------|
| **Page Transitions** | `animate-fade-in` on tab switch (opacity 0→1, 300ms ease-out) |
| **Card Hover** | `hover:scale-[1.02]` + `hover:shadow-lg` with 200ms transition |
| **Sidebar Toggle** | Smooth width transition (240px ↔ 64px) over 300ms |
| **Toast Enter/Exit** | Slide-in from right (translateX: 100%→0) + fade; auto-dismiss after 4–6s |
| **Loading Spinners** | CSS animated gradient ring; consistent across all loading states |
| **Progress Bars** | Smooth width transition with gradient fill; training status uses stepped progress |
| **Map Markers** | Bounce-in animation for route waypoints; pulse animation for active charging stations |
| **Route Drawing** | Animated polyline stroke (SVG dash-offset animation) for route visualization |
| **Button Press** | `active:scale-95` micro-interaction; 150ms duration |
| **Data Refresh** | Subtle flash/highlight animation when stats update |
| **Chart Animations** | Recharts animated bars/lines on data load with 500ms duration |

### NFR-04: Scalability

| Dimension | Current Target | Growth Path |
|-----------|---------------|-------------|
| **Grid Size** | Up to 50×50 (2,500 nodes) | Support via graph partitioning |
| **Concurrent Users** | 1–5 (demo/research) | FastAPI async handles concurrent requests |
| **Training Data** | 500 traffic samples, 300 historical routes | Configurable via `TrainingConfig` |
| **Model Storage** | Local `models/` directory | Future: model registry (MLflow) |
| **API Rate** | No limit (dev mode) | Future: rate limiting middleware |

### NFR-05: Testing

| Test Type | Requirement | Tool |
|-----------|-------------|------|
| **Unit Tests** | Core modules: `road_graph`, `environment`, `route_generator`, `traffic_generator` | `pytest` |
| **Integration Tests** | API endpoints: health, road-network, generate-route, training lifecycle | `pytest` + `httpx` |
| **ML Model Tests** | GAN training convergence, Q-agent learning curve validation | Custom assertions |
| **Frontend Tests** | Component rendering, store state transitions, API mocking | Vitest + React Testing Library |
| **E2E Tests** | Full user flow: load → select route → generate → view results | Playwright or Cypress |
| **Performance Tests** | Route generation latency under load (10 concurrent requests) | `locust` or `k6` |
| **Coverage Target** | ≥ 70% line coverage for `src/` Python modules | `pytest-cov` |
| **CI Pipeline** | Tests run on every push; block merge on failure | GitHub Actions (`.github/`) |

### NFR-06: Accessibility

| Aspect | Requirement |
|--------|-------------|
| **Keyboard Navigation** | All interactive elements focusable; tab order logical |
| **ARIA Labels** | Map markers, buttons, and form controls have descriptive labels |
| **Color Contrast** | WCAG AA compliant (4.5:1 for text, 3:1 for large text) |
| **Screen Reader** | Route results announced; training progress narrated |
| **Reduced Motion** | Respect `prefers-reduced-motion` media query; disable non-essential animations |

### NFR-07: Code Quality

| Aspect | Standard |
|--------|----------|
| **Python Style** | PEP 8 + type hints on all public functions |
| **TypeScript** | Strict mode; no `any` types in components |
| **Linting** | ESLint for frontend; `flake8` or `ruff` for backend |
| **Documentation** | Docstrings on all classes and public methods |
| **Git Hygiene** | Conventional commits; `.gitignore` for artifacts |

---

## Success Criteria

- [ ] Route generation returns ≥ 3 valid candidates in < 500ms for 10×10 grid
- [ ] SG-GAN training converges (D loss stabilizes, G loss decreases) within configured epochs
- [ ] GNN Route GAN generates graph-valid routes with ≥ 80% connectivity score
- [ ] Q-Learning agent achieves ≥ 70% destination reach rate after training
- [ ] Frontend loads in < 3s, all 4 views render correctly with dark/light mode
- [ ] All animations run at 60fps without jank (no dropped frames)
- [ ] Docker compose spins up all services with `docker-compose up` in < 60s
- [ ] Core Python test suite passes with ≥ 70% coverage
- [ ] API returns structured error responses (never raw tracebacks)
- [ ] Training pipeline completes end-to-end and saves models to `models/`
