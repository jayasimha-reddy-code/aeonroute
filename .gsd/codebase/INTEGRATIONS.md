# External Integrations

> Auto-generated codebase map — EV Routing System

---

## External APIs Used

| API / Service        | Protocol | Used In                        | Purpose                                  |
|----------------------|----------|--------------------------------|------------------------------------------|
| **OpenStreetMap Tiles** | HTTPS (tile server) | `frontend/src/components/NetworkMap*.tsx` via Leaflet | Map tile rendering for road network visualisation |
| **Backend REST API** | HTTP (localhost:8000) | `frontend/src/services/api.ts` via Axios | All frontend↔backend communication      |

The backend API (`backend_api.py`) is **self-contained** — it does not call any external third-party APIs at runtime. All ML inference (routing, traffic generation) happens locally.

### Backend API Endpoints (internal, exposed to frontend)

| Method | Path                  | Tag       | Description                                      |
|--------|-----------------------|-----------|--------------------------------------------------|
| GET    | `/health`             | System    | Health check and initialisation status            |
| GET    | `/api/road-network`   | Routing   | Road network topology (nodes, edges, positions)   |
| POST   | `/api/generate-route` | Routing   | Generate optimal EV routes (source → destination) |
| POST   | `/api/save-route`     | Routing   | Bookmark a route                                  |
| GET    | `/api/traffic-patterns` | Analytics | GAN-generated traffic scenarios                 |
| GET    | `/api/route-metrics`  | Analytics | Aggregate performance metrics over sampled routes |
| GET    | `/api/training-status`| Training  | Current training pipeline progress                |
| POST   | `/api/start-training` | Training  | Kick off full ML pipeline in background           |
| POST   | `/api/stop-training`  | Training  | Gracefully stop running training                  |
| GET    | `/api/system-stats`   | System    | System stats (network size, model readiness)      |

Configuration: CORS origins via `CORS_ORIGINS` env var (default `http://localhost:5173,http://localhost:3000`). Frontend Vite dev proxy rewrites `/api` to `http://localhost:8000` (`frontend/vite.config.ts`).

---

## Databases & Data Stores

This project uses **no external database**. All data is file-system based:

| Store                | Format       | Location                                         | Purpose                              |
|----------------------|--------------|--------------------------------------------------|--------------------------------------|
| Traffic training data | `.npy`      | `data/training_data/traffic_data.npy`            | Synthetic traffic patterns for GAN   |
| Generated traffic    | `.json`      | `data/generated_traffic/sample_traffic.json`     | GAN-generated traffic samples        |
| Historical routes    | `.json`      | `src/data/historical_routes/routes.json`         | Route dataset for GNN-GAN training   |
| Q-Learning agent     | `.pkl`       | `models/q_learning/trained_agent.pkl`            | Serialised Q-table (pickle)          |
| SG-GAN weights       | `.h5` / Keras SavedModel | `models/sg_gan/traffic_gan_generator.*`, `models/sg_gan/traffic_gan_discriminator.*` | GAN model weights |
| GNN-GAN weights      | `.h5` / Keras SavedModel | `models/gnn_gan/gnn_generator.*`, `models/gnn_gan/gnn_discriminator.*` | GNN route GAN weights |
| Evaluation results   | `.json`      | `results/metrics/evaluation_results.json`        | Evaluation metrics                   |
| Training metrics     | `.npz`       | `results/metrics/training_metrics.npz`           | NumPy archive of training history    |
| Visualisation plots  | `.png`       | `results/plots/`                                 | Road network, GAN training, routes   |
| In-memory cache      | Python dict  | `backend_api.py` (`_road_network_cache`, `_system_stats_cache`) | Response caching (TTL-based) |
| Client-side store    | localStorage | `frontend/src/store/store.ts` (Zustand `persist`)| Theme, sidebar state, EV preferences |

---

## Auth Providers

**None.** The API has no authentication or authorization layer. Security is handled via:

- Rate limiting (`slowapi` — 60 req/min default, per-endpoint limits in `backend_api.py`)
- CORS origin allowlist
- Request body size limit (1 MB, configurable via `MAX_BODY_SIZE` env var)
- Security headers (X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, Referrer-Policy)
- Non-root Docker user in production (`docker/Dockerfile.backend`)
- Request correlation IDs (`X-Request-ID` header)

---

## Third-Party Services

| Service         | Integration point                    | Purpose                            |
|-----------------|--------------------------------------|------------------------------------|
| **TensorBoard** | Docker service on port 6006          | Training visualisation dashboard   |
| **OpenStreetMap** | Leaflet tile layer (frontend)      | Base map tiles for network display |
| **npm registry** | `npm install` / `npm ci`            | Frontend dependency resolution     |
| **PyPI**        | `pip install`                        | Python dependency resolution       |

No cloud APIs, payment processors, email services, or external ML inference services are used. The entire ML pipeline runs locally.

---

## Webhooks & Event Systems

**No webhooks or external event systems.** The system uses:

| Pattern                      | Implementation                              | Location               |
|------------------------------|---------------------------------------------|------------------------|
| Background task queue        | FastAPI `BackgroundTasks`                   | `backend_api.py` (`run_training_pipeline`) |
| Global state mutation        | Module-level `training_status` dict         | `backend_api.py`       |
| Frontend polling             | Axios requests to `/api/training-status`    | `frontend/src/services/api.ts` |
| Client-side state reactivity | Zustand store with selector hooks           | `frontend/src/store/store.ts` |
| ASGI lifespan events         | `@asynccontextmanager` startup/shutdown     | `backend_api.py` (`lifespan`) |

Training progress is communicated via polling (frontend periodically calls `/api/training-status`), not via WebSocket or SSE.

---

## ML Model Formats & Libraries

### Model Architectures

| Model              | Type                          | Framework    | Source file                   |
|--------------------|-------------------------------|-------------|-------------------------------|
| **SG-GAN Generator** | Feedforward neural network (noise → traffic) | TensorFlow/Keras | `src/traffic_generator.py` |
| **SG-GAN Discriminator** | Feedforward classifier (real vs fake traffic) | TensorFlow/Keras | `src/traffic_generator.py` |
| **GNN Route Generator** | Graph Neural Network (adjacency + features → routes) | TensorFlow/Keras | `src/gnn_route_generator.py` |
| **GNN Route Discriminator** | Graph Neural Network (route validity classifier) | TensorFlow/Keras | `src/gnn_route_generator.py` |
| **Q-Learning Agent** | Tabular Q-Learning (state-action Q-table) | Pure NumPy | `src/q_learning_agent.py` |
| **DQN Agent** (optional) | Deep Q-Network | TensorFlow/Keras | `src/q_learning_agent.py` |

### Serialisation Formats

| Format           | Used for                              | Files                                  |
|------------------|---------------------------------------|----------------------------------------|
| Keras `.h5`      | SG-GAN and GNN-GAN model weights     | `models/sg_gan/*.h5`, `models/gnn_gan/*.h5` |
| Keras SavedModel | Full model architecture + weights     | `models/sg_gan/*/`, `models/gnn_gan/*/` |
| Python `pickle`  | Q-Learning agent Q-table             | `models/q_learning/trained_agent.pkl`  |
| NumPy `.npy`     | Training data arrays                 | `data/training_data/traffic_data.npy`  |
| NumPy `.npz`     | Training metrics archive             | `results/metrics/training_metrics.npz` |

### ML Library Versions

| Library        | Version (API req) | Purpose                                          |
|----------------|-------------------|--------------------------------------------------|
| TensorFlow     | 2.14.0            | GAN training, neural network layers, Keras API   |
| PyTorch        | 2.1.0             | GNN-related route generation                     |
| scikit-learn   | 1.3.2             | Evaluation metrics, data preprocessing           |
| NumPy          | 1.24.3            | Array ops, Q-table storage, data manipulation    |
| Gymnasium      | 0.29.1            | RL environment interface (state/action/reward)   |

### Training Pipeline (7 steps)

Defined in `src/main.py` (`EVRoutingSystem` class):

1. **Create road network** — NetworkX grid graph with charging stations
2. **Generate traffic data** — Synthetic time-of-day traffic patterns
3. **Train SG-GAN** — Generator learns to produce realistic traffic scenarios
4. **Create RL environment** — Gymnasium env with graph-based state/action space
5. **Train Q-Learning agent** — Tabular Q-Learning on the routing environment
6. **Create route generator** — Combine pathfinding + GAN traffic prediction
7. **Evaluate system** — Metrics: distance, energy, time, feasibility

Optional step: **Train GNN Route GAN** — Graph Neural Network for advanced route generation (`src/gnn_route_generator.py`), enabled via `use_gnn_gan: True` config flag.

---

## Environment Variables

| Variable           | Default                            | Used in                | Purpose                        |
|--------------------|------------------------------------|------------------------|--------------------------------|
| `CORS_ORIGINS`     | `http://localhost:5173,http://localhost:3000` | `backend_api.py` | Allowed CORS origins   |
| `LOG_FORMAT`       | `json`                             | `backend_api.py`       | Log output format (json/text)  |
| `MAX_BODY_SIZE`    | `1048576` (1 MB)                   | `backend_api.py`       | Max request body size          |
| `TF_CPP_MIN_LOG_LEVEL` | `2`                           | `docker-compose.yml`   | Suppress TensorFlow info logs  |
| `PYTHONUNBUFFERED`  | `1`                               | `docker-compose.yml`   | Unbuffered Python output       |
| `VITE_API_URL`     | `http://localhost:8000`            | `frontend/.env.example`| Backend API base URL           |
| `VITE_ENABLE_DARK_MODE` | `true`                        | `frontend/.env.example`| Feature flag                   |
| `VITE_ENABLE_ANIMATIONS`| `true`                        | `frontend/.env.example`| Feature flag                   |
| `VITE_ENABLE_CHARTS`    | `true`                        | `frontend/.env.example`| Feature flag                   |
