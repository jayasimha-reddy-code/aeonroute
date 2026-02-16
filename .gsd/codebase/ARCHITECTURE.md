# ARCHITECTURE.md — EV Routing System

> Generated: 2026-02-16
> Scope: Full-stack AI-powered Electric Vehicle Route Optimization

---

## 1. Architectural Pattern

**Monolith with separate frontend SPA.**

- **Backend**: A single Python FastAPI application (`backend_api.py`) that embeds all ML modules, exposes REST endpoints, and optionally serves the built frontend as static files.
- **Frontend**: A standalone React 18 + TypeScript SPA (`frontend/`) communicating with the backend over HTTP/JSON.
- **ML Pipeline**: A set of Python modules under `src/` that can run standalone via CLI (`python src/main.py`) or be orchestrated through the API's background training pipeline.

There is no message bus, database, or microservice boundary. All state lives in-process (global Python objects) or on the filesystem (model artifacts, numpy data files).

---

## 2. Layers & Responsibilities

### 2.1 Presentation Layer — React SPA (`frontend/`)

| Concern | Implementation |
|---|---|
| UI framework | React 18, Vite 5, TypeScript, Tailwind CSS 3 |
| State management | Zustand store (`frontend/src/store/store.ts`) with persist middleware |
| HTTP client | Axios-based singleton (`frontend/src/services/api.ts`) with envelope unwrapping |
| API hooks | Generic `useApi<T>` hook (`frontend/src/hooks/useApi.ts`) for loading/error states |
| Routing (in-app) | Tab-based navigation (`AppTab`: dashboard, route-planner, training, analytics) via Zustand — no React Router |
| Map rendering | Leaflet + react-leaflet for road network visualization |
| Charts | Recharts for analytics |
| Code splitting | `React.lazy()` on page-level components |

**Pages:**

| Page | File | Purpose |
|---|---|---|
| Dashboard | `frontend/src/pages/Dashboard.tsx` | System stats, road network map, model status |
| Route Planner | `frontend/src/pages/RoutePlanner.tsx` | Source/dest selection, route generation, route comparison |
| Training | `frontend/src/pages/Training.tsx` | Start/stop ML training, monitor progress |
| Analytics | `frontend/src/pages/Analytics.tsx` | Route metrics, traffic patterns |

### 2.2 API Layer — FastAPI (`backend_api.py`)

Single-file FastAPI application (662 lines). Responsibilities:

- **REST endpoints** for the frontend (see §5 below)
- **CORS** — configurable via `CORS_ORIGINS` env var (default `localhost:5173,localhost:3000`)
- **Rate limiting** — `slowapi` (60/min default, per-endpoint overrides)
- **Structured logging** — JSON-format logs with correlation IDs (`X-Request-ID`)
- **Security headers** — `X-Content-Type-Options`, `X-Frame-Options`, etc.
- **Request validation** — Pydantic v2 models with field validators
- **Response envelope** — `{"ok": true, "message": "...", "data": {...}}`
- **Response caching** — in-memory TTL caches for road network (5 min) and system stats (10 s)
- **Background training** — `BackgroundTasks` for the full ML pipeline
- **Static file serving** — mounts `frontend/dist/` at `/` when the build exists
- **Global exception handler** — catches unhandled errors, never leaks tracebacks

### 2.3 ML Pipeline Layer — Python modules (`src/`)

Core domain logic. Each module is independently importable.

| Module | File | Responsibility |
|---|---|---|
| Road Graph | `src/road_graph.py` (750 lines) | NetworkX directed graph with grid topology, edge costs (distance, time, energy), charging stations, traffic patterns, pathfinding (Dijkstra, A*, energy-optimal) |
| Traffic Generator | `src/traffic_generator.py` (830 lines) | SG-GAN (Stochastic Graph GAN): Generator + Discriminator for traffic pattern generation. Includes `GraphAttentionLayer`, synthetic traffic data creation, and GAN training loop |
| GNN Route Generator | `src/gnn_route_generator.py` (934 lines) | GNN-based Route GAN with `GraphConvLayer`, `GraphAttentionLayerV2`, route encoder/decoder. Trains on historical routes to generate new candidate routes |
| Q-Learning Agent | `src/q_learning_agent.py` (702 lines) | Tabular Q-Learning with epsilon-greedy exploration. Also includes Deep Q-Network (DQN) variant. Bellman update, model save/load (pickle) |
| Environment | `src/environment.py` (769 lines) | Gymnasium-compatible RL environment. `EVRoutingEnvironment` (graph-based) and `LegacyEVRoutingEnvironment` (grid-based, simpler). State: battery SoC, position, time, traffic |
| Route Generator | `src/route_generator.py` (717 lines) | Classical + GAN-guided route generation: shortest path, energy-optimal, time-optimal, via-charging, K-shortest paths. `EVRoutePlanner` wraps it with RL agent selection |
| Evaluator | `src/evaluate.py` (544 lines) | `SystemEvaluator` for GAN quality metrics, agent performance, route generation effectiveness, with matplotlib plotting |
| Main | `src/main.py` (733 lines) | `EVRoutingSystem` orchestrator class. 7-step pipeline + CLI entry point (`--mode train|evaluate|demo|test`) |

### 2.4 Infrastructure Layer

| Concern | Files |
|---|---|
| Docker (general) | `docker/Dockerfile` — multi-purpose image for tests/training |
| Docker (backend) | `docker/Dockerfile.backend` — multi-stage slim image for API |
| Docker (frontend) | `docker/Dockerfile.frontend` — referenced in compose |
| Compose (ML) | `docker-compose.yml` — services: `ev-routing` (tests), `training`, `tensorboard` |
| Compose (UI) | `docker-compose.ui.yml` — services: `backend` (port 8000) + `frontend` (port 5173) |
| Makefile | `Makefile` — `install`, `test`, `lint`, `format`, `docker-*`, `tensorboard` |

---

## 3. Data Flow

### 3.1 Frontend → Backend → ML Pipeline

```
┌───────────────┐    HTTP/JSON    ┌──────────────────┐    Python imports    ┌─────────────────────┐
│  React SPA    │ ──────────────▶ │  FastAPI Backend  │ ──────────────────▶ │  src/ ML Modules    │
│  (port 5173)  │ ◀────────────── │  (port 8000)      │ ◀────────────────── │                     │
└───────────────┘  JSON envelope  └──────────────────┘  Python objects      └─────────────────────┘
```

1. **SPA boot** — `App.tsx` calls `GET /api/road-network` → backend returns graph topology → Zustand store → Leaflet map renders.
2. **Route generation** — User fills route planner form → `POST /api/generate-route` with `{source, destination, ev_state, num_candidates}` → backend creates `EVState`, calls `RouteGenerator.generate_routes()` → returns sorted `RouteCandidate[]` as JSON.
3. **Training** — User clicks Start Training → `POST /api/start-training` with config → backend spawns `BackgroundTasks.run_training_pipeline()` → frontend polls `GET /api/training-status` for progress.
4. **Analytics** — `GET /api/route-metrics` triggers random route sampling → `GET /api/traffic-patterns` generates GAN traffic scenarios → `GET /api/system-stats` returns model readiness.

### 3.2 ML Training Pipeline (7 Steps)

Orchestrated by `EVRoutingSystem` in `src/main.py`:

```
Step 1: Create Road Network
    RoadGraph(grid_size) → NetworkX DiGraph
        ↓
Step 2: Generate Traffic Data
    create_synthetic_traffic() → (n_samples, num_roads, 24) ndarray
        ↓
Step 3: Train SG-GAN
    SGGANTrafficGenerator.train(traffic_data) → Generator + Discriminator
    → saves to models/sg_gan/traffic_gan_*.keras
        ↓
Step 3b: Train GNN Route GAN (optional)
    generate_historical_routes() → GNNRouteGAN.train()
    → saves to models/gnn_gan/*.weights.h5
        ↓
Step 4: Create RL Environment
    EVRoutingEnvironment(config, traffic_data=GAN_traffic)
        ↓
Step 5: Train Q-Learning Agent
    train_q_learning_agent(env, agent, episodes)
    → saves to models/q_learning/trained_agent.pkl
        ↓
Step 6: Create Route Generator
    RouteGenerator(road_graph, gan) + EVRoutePlanner(road_graph, route_gen, agent)
        ↓
Step 7: Evaluate System
    SystemEvaluator → route_generation, agent_performance, end_to_end metrics
    → saves to results/metrics/evaluation_results.json
```

### 3.3 Route Generation Data Flow (Runtime)

```
User Request (source, dest, ev_state)
        │
        ▼
┌─────────────────────────────────────────┐
│           RouteGenerator                │
│  1. Shortest path (Dijkstra)            │
│  2. Energy-optimal path (custom Dijkstra)│
│  3. Time-optimal path                  │
│  4. Routes via charging stations        │
│  5. K-shortest paths                    │
│  6. GAN-guided variations              │
│     └─ SG-GAN predicts traffic →       │
│        adjusts edge weights             │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│  Score & rank by energy efficiency      │
│  Return top N RouteCandidate objects    │
└─────────────────────────────────────────┘
```

---

## 4. Key Abstractions & Interfaces

### 4.1 Data Classes

| Class | Module | Fields |
|---|---|---|
| `EVState` | `road_graph.py` | `battery_soc`, `battery_capacity_kwh`, `energy_rate`, `current_node`, `time_minutes`, `total_distance_km`, `total_energy_kwh` + computed properties |
| `ChargingStation` | `road_graph.py` | `node_id`, `charging_power_kw`, `num_ports`, `price_per_kwh` |
| `RouteCandidate` | `route_generator.py` | `path`, `source`, `destination`, `total_energy_kwh`, `total_time_minutes`, `total_distance_km`, `feasibility_score`, `realism_score`, `charging_stops` |
| `EncodedRoute` | `gnn_route_generator.py` | `node_sequence`, `adjacency_matrix`, `node_features`, `edge_features`, `ev_state`, `total_energy`, `total_time`, `is_valid` |
| `EnvironmentConfig` | `environment.py` | `grid_size`, `max_battery`, `battery_capacity_kwh`, `energy_cost_base`, `max_steps`, reward/penalty constants |

### 4.2 Core Classes

| Class | Purpose |
|---|---|
| `RoadGraph` | Graph model. Wraps NetworkX `DiGraph`. Grid topology + diagonal roads. Provides `shortest_path()`, `energy_optimal_path()`, `calculate_edge_cost()`, `update_traffic_from_gan()` |
| `SGGANTrafficGenerator` | GAN wrapper. Contains `SGGANGenerator` + `SGGANDiscriminator` Keras models. `train()`, `generate_traffic_scenarios()`, `save()`/`load()` |
| `GNNRouteGAN` | Advanced GNN-based GAN. `GNNGenerator` + `GNNDiscriminator` with graph convolution layers. Operates on encoded route graphs |
| `RouteGenerator` | Multi-strategy route finder. Combines classical algorithms with GAN-guided generation |
| `EVRoutePlanner` | High-level planner. Wraps `RouteGenerator` + optional RL agent for route selection |
| `QLearningAgent` | Tabular Q-Learning. `q_table: Dict[Tuple, ndarray]`, `choose_action()`, `learn()`, `save_model()`/`load_model()` |
| `EVRoutingEnvironment` | Gymnasium `gym.Env`. Graph-based environment with `reset()`, `step()`, observation/action spaces |
| `LegacyEVRoutingEnvironment` | Simpler grid-based RL environment for faster training |
| `EVRoutingSystem` | Pipeline orchestrator. Holds all components, runs 7-step training pipeline |
| `SystemEvaluator` | Evaluation harness. Evaluates GAN, agent, route generation, end-to-end |

### 4.3 Pydantic Request/Response Models (API)

| Model | Fields |
|---|---|
| `EVStateRequest` | `battery_soc` (0–100), `current_node`, `battery_capacity_kwh`, `time_minutes` |
| `RouteRequest` | `source`, `destination`, `ev_state: EVStateRequest`, `num_candidates` (1–20) |
| `TrainingConfig` | `grid_size`, `gan_epochs`, `rl_episodes`, `traffic_samples`, `gan_batch_size`, `rl_max_steps` |

### 4.4 Frontend Types (TypeScript)

Mirrored interfaces in `frontend/src/services/api.ts`: `RoadNetworkData`, `EVState`, `RouteRequest`, `Route`, `TrainingConfig`, `TrainingStatus`, `SystemStats`, `RouteMetrics`, `HealthCheck`.

---

## 5. Entry Points

### 5.1 API Endpoints (`backend_api.py`)

| Method | Path | Tag | Purpose |
|---|---|---|---|
| GET | `/health` | System | Health check, init status |
| GET | `/api/road-network` | Routing | Graph topology (nodes, edges, charging stations) |
| POST | `/api/generate-route` | Routing | Generate optimal EV routes |
| POST | `/api/save-route` | Routing | Bookmark a route (stub) |
| GET | `/api/traffic-patterns` | Analytics | GAN-generated traffic scenarios |
| GET | `/api/training-status` | Training | Current training pipeline status |
| POST | `/api/start-training` | Training | Start background training pipeline |
| POST | `/api/stop-training` | Training | Graceful training stop |
| GET | `/api/route-metrics` | Analytics | Aggregate route performance metrics |
| GET | `/api/system-stats` | System | Model readiness, network info |

**Start the API:**
```bash
python backend_api.py                  # Direct (port 8000)
uvicorn backend_api:app --port 8000    # Via uvicorn
docker-compose -f docker-compose.ui.yml up  # Docker
```

### 5.2 CLI Entry Point (`src/main.py`)

```bash
python src/main.py --mode train --episodes 500 --grid-size 10 --gan-epochs 100
python src/main.py --mode evaluate
python src/main.py --mode demo
python src/main.py --mode test
```

### 5.3 Makefile Targets

`make install`, `make test`, `make lint`, `make format`, `make docker-build`, `make docker-train`, `make tensorboard`

### 5.4 Docker Compose Services

| Service | Compose File | Port | Purpose |
|---|---|---|---|
| `backend` | `docker-compose.ui.yml` | 8000 | FastAPI backend |
| `frontend` | `docker-compose.ui.yml` | 5173 | Vite dev server |
| `ev-routing` | `docker-compose.yml` | — | Run tests |
| `training` | `docker-compose.yml` | — | Run training pipeline |
| `tensorboard` | `docker-compose.yml` | 6006 | Training visualization |

---

## 6. ML Pipeline Architecture

### 6.1 SG-GAN (Traffic Generation)

```
Input:  noise(z) + EV state features + condition vector
        ↓
Generator (Dense → BN → ReLU → Dense → Reshape)
        ↓
Output: Traffic pattern matrix (num_roads × 24 hours)
        ↕  adversarial training
Discriminator (Dense → LeakyReLU → Dropout → Dense → sigmoid)
        ↓
Output: Real/fake probability
```

- Architecture: Conditional GAN with `GraphAttentionLayer` for graph-structured generation
- Training data: Synthetic traffic with realistic rush-hour patterns (morning 7–9, evening 17–19)
- Model format: Keras `.keras` files

### 6.2 GNN Route GAN (Route Generation)

```
Historical Routes → RouteEncoder (adjacency + node/edge features)
        ↓
GNN Generator: noise + ev_state → GraphConv layers → route probability matrix
        ↕  adversarial training
GNN Discriminator: route features → GraphConv + Attention → valid/fake
```

- Architecture: Graph convolutional network with `GraphConvLayer` and `GraphAttentionLayerV2`
- Encodes routes as graph-structured data (adjacency matrices + node features)
- Model format: Keras `.weights.h5` files

### 6.3 Q-Learning Agent (Route Selection)

- **Tabular Q-Learning**: `Q(s,a) ← Q(s,a) + α[r + γ·max(Q(s',a')) − Q(s,a)]`
- State discretization: `EVState.to_array()` → rounded tuple key
- Exploration: ε-greedy with decay (1.0 → 0.01, decay rate 0.995)
- Optional DQN variant with TensorFlow neural network
- Model format: Pickle `.pkl` file

### 6.4 RL Environment

- **Gymnasium-compatible** (`gym.Env` subclass)
- State space: `Box` — [battery_soc, distance_to_dest, x_pos, y_pos, time, traffic, at_charging] (7 dims)
- Action space: `Discrete(max_neighbors + 1)` — move to neighbor or charge
- Reward shaping: progress toward destination, energy penalty, charging time penalty, destination bonus, battery-empty penalty

---

## 7. Technology Stack Summary

| Layer | Technologies |
|---|---|
| Frontend | React 18, TypeScript, Vite 5, Tailwind CSS 3, Zustand, Axios, Leaflet, Recharts |
| Backend | Python 3.10+, FastAPI, Pydantic v2, Uvicorn, slowapi |
| ML/AI | TensorFlow/Keras (GAN, GNN), NumPy, Gymnasium, NetworkX |
| Testing | pytest (Python), Vitest + Testing Library (JS), Playwright (E2E) |
| Infrastructure | Docker, Docker Compose, Makefile |
| Code Quality | Black, isort, flake8, mypy, ESLint, Prettier |
