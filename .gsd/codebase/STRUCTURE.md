# STRUCTURE.md — EV Routing System

> Generated: 2026-02-16
> Scope: Directory tree, file locations, naming conventions, config & artifact paths

---

## 1. Directory Tree

```
EV_Routing/
│
├── backend_api.py                  # FastAPI REST API (single-file, 662 lines)
├── docker-compose.yml              # Docker: tests, training, tensorboard
├── docker-compose.ui.yml           # Docker: backend + frontend dev stack
├── Makefile                        # Dev task runner (install, test, lint, docker)
├── pyproject.toml                  # Python project metadata & tool config
├── requirements.txt                # Core Python deps (TF, NetworkX, Gymnasium, NumPy)
├── requirements-api.txt            # API-specific deps (FastAPI, Uvicorn, slowapi)
├── requirements-dev.txt            # Dev deps (pytest, black, mypy, etc.)
├── setup.sh                        # Setup script
├── package-lock.json               # Root lockfile (not actively used)
│
├── README.md                       # Project readme
├── README.pdf                      # PDF export of readme
├── FRONTEND_README.md              # Frontend-specific documentation
├── INSTALLATION.md                 # Installation instructions
├── LEARNING_BOOK.md                # Educational guide to the ML concepts
├── LEARNING_BOOK.pdf               # PDF export
├── UI_GUIDE.md                     # UI usage guide
├── UI_IMPLEMENTATION_SUMMARY.md    # Frontend implementation notes
│
├── src/                            # ── Python ML modules (core domain) ──
│   ├── main.py                     #   Pipeline orchestrator + CLI entry point (733 lines)
│   ├── road_graph.py               #   Road network graph model (750 lines)
│   ├── traffic_generator.py        #   SG-GAN traffic generation (830 lines)
│   ├── gnn_route_generator.py      #   GNN Route GAN (934 lines)
│   ├── q_learning_agent.py         #   Q-Learning + DQN agent (702 lines)
│   ├── environment.py              #   Gymnasium RL environment (769 lines)
│   ├── route_generator.py          #   Route generation + planner (717 lines)
│   ├── evaluate.py                 #   System evaluator (544 lines)
│   ├── test_road_graph.py          #   Unit tests for road_graph
│   ├── test_route_generator.py     #   Unit tests for route_generator
│   ├── test_traffic_generation.py  #   Unit tests for traffic_generator
│   │
│   ├── data/                       #   Training/generated data (src-local copy)
│   │   ├── generated_traffic/
│   │   │   └── sample_traffic.npy
│   │   ├── historical_routes/
│   │   │   └── routes.npz
│   │   └── training_data/
│   │       └── traffic_data.npy
│   │
│   ├── models/                     #   Trained model artifacts (src-local copy)
│   │   ├── gnn_gan/
│   │   │   ├── gnn_discriminator.weights.h5
│   │   │   └── gnn_generator.weights.h5
│   │   ├── q_learning/
│   │   │   └── trained_agent.pkl
│   │   └── sg_gan/
│   │       ├── traffic_gan_discriminator.keras
│   │       └── traffic_gan_generator.keras
│   │
│   └── results/                    #   Evaluation outputs (src-local copy)
│       ├── metrics/
│       │   ├── evaluation_results.json
│       │   └── training_metrics.npz
│       └── plots/
│           ├── demo_routes.png
│           ├── gan_training.png
│           ├── road_network.png
│           └── training_progress.png
│
├── frontend/                       # ── React SPA ──
│   ├── package.json                #   Dependencies (React 18, Zustand, Axios, Leaflet, Recharts)
│   ├── package-lock.json
│   ├── index.html                  #   HTML entry point
│   ├── vite.config.ts              #   Vite bundler config
│   ├── vitest.config.ts            #   Vitest test config
│   ├── tailwind.config.ts          #   Tailwind CSS config
│   ├── postcss.config.js           #   PostCSS config
│   ├── tsconfig.json               #   TypeScript config
│   ├── tsconfig.node.json          #   TS config for Node tooling
│   ├── .eslintrc.cjs               #   ESLint config
│   ├── .prettierrc                 #   Prettier config
│   ├── playwright.config.ts        #   E2E test config
│   ├── stats.html                  #   Bundle analysis output
│   │
│   ├── public/                     #   Static assets
│   │
│   ├── e2e/                        #   Playwright E2E tests
│   │   ├── app.spec.ts
│   │   └── navigation.spec.ts
│   │
│   └── src/                        #   Application source
│       ├── main.tsx                #     React entry point (ReactDOM.createRoot)
│       ├── App.tsx                 #     Root component (layout, tab routing, data init)
│       ├── index.css               #     Global styles (Tailwind directives)
│       ├── test-setup.ts           #     Test setup file
│       │
│       ├── pages/                  #     Page-level components (lazy-loaded)
│       │   ├── Dashboard.tsx       #       System overview, network map, stats
│       │   ├── RoutePlanner.tsx    #       Route generation UI
│       │   ├── Training.tsx        #       ML training controls
│       │   └── Analytics.tsx       #       Metrics and traffic analysis
│       │
│       ├── components/             #     Reusable UI components
│       │   ├── Header.tsx          #       Top navigation bar
│       │   ├── Sidebar.tsx         #       Left navigation sidebar
│       │   ├── NetworkMap.tsx      #       Leaflet road network visualization
│       │   ├── RouteCard.tsx       #       Route result display card
│       │   ├── StatCard.tsx        #       Metric display card
│       │   ├── PageHeader.tsx      #       Page title/subtitle component
│       │   ├── ToastContainer.tsx  #       Toast notification system
│       │   └── ui/                 #       Design system primitives (Card, Badge, Spinner, etc.)
│       │
│       ├── services/               #     API communication layer
│       │   └── api.ts              #       Axios API client singleton + TypeScript interfaces
│       │
│       ├── store/                  #     State management
│       │   └── store.ts            #       Zustand store (road network, routes, theme, toasts)
│       │
│       ├── hooks/                  #     Custom React hooks
│       │   └── useApi.ts           #       Generic async API call hook with loading/error
│       │
│       ├── lib/                    #     Utility functions
│       │   └── utils.ts            #       `cn()` classname merge utility
│       │
│       └── __tests__/              #     Component unit tests (Vitest + Testing Library)
│           ├── setup.ts
│           ├── Header.test.tsx
│           ├── Sidebar.test.tsx
│           ├── StatCard.test.tsx
│           └── store.test.ts
│
├── models/                         # ── Top-level model artifacts ──
│   ├── gnn_gan/                    #   (empty — weights stored in src/models/gnn_gan/)
│   ├── q_learning/
│   │   └── trained_agent.pkl       #   Trained Q-Learning agent (pickle)
│   └── sg_gan/
│       ├── traffic_gan_discriminator.h5
│       ├── traffic_gan_discriminator.keras
│       ├── traffic_gan_generator.h5
│       └── traffic_gan_generator.keras
│
├── data/                           # ── Top-level training data ──
│   ├── generated_traffic/
│   │   └── sample_traffic.npy      #   GAN-generated traffic samples
│   ├── historical_routes/          #   (empty or populated after GNN training)
│   └── training_data/
│       └── traffic_data.npy        #   Synthetic traffic patterns for GAN training
│
├── results/                        # ── Top-level evaluation results ──
│   ├── metrics/
│   │   ├── evaluation_results.json #   End-to-end evaluation metrics
│   │   └── training_metrics.npz    #   Training reward/length curves
│   └── plots/
│       ├── gan_training.png        #   GAN loss curves
│       ├── road_network.png        #   Network topology visualization
│       └── training_progress.png   #   Q-Learning training curves
│
├── tests/                          # ── Integration tests ──
│   └── test_api.py                 #   FastAPI endpoint tests (TestClient)
│
├── docker/                         # ── Docker configuration ──
│   ├── .dockerignore
│   ├── Dockerfile                  #   General-purpose image (tests/training)
│   ├── Dockerfile.backend          #   Multi-stage slim image for API
│   ├── Dockerfile.frontend         #   Frontend build image (referenced in compose)
│   └── package-lock.json
│
├── .vscode/
│   └── settings.json               #   VS Code workspace settings
│
├── .github/                        # ── GitHub/GSD framework config ──
│   ├── instructions/               #   Copilot instruction files
│   └── skills/                     #   GSD skill definitions
│
├── .gsd/                           # ── GSD project management ──
│   └── codebase/                   #   Codebase mapping documents
│
├── .agent/                         # ── Agent framework ──
│   ├── skills/                     #   Agent skill definitions
│   └── workflows/                  #   Agent workflow definitions
│
└── .gemini/
    └── GEMINI.md                   #   Gemini-specific configuration
```

---

## 2. Key File Locations — Quick Reference

### Where to find…

| What | Path |
|---|---|
| **API server** | `backend_api.py` |
| **ML pipeline orchestrator** | `src/main.py` → `EVRoutingSystem` class |
| **Road network model** | `src/road_graph.py` → `RoadGraph` class |
| **Traffic GAN** | `src/traffic_generator.py` → `SGGANTrafficGenerator` class |
| **GNN Route GAN** | `src/gnn_route_generator.py` → `GNNRouteGAN` class |
| **Q-Learning agent** | `src/q_learning_agent.py` → `QLearningAgent` class |
| **RL environment** | `src/environment.py` → `EVRoutingEnvironment` class |
| **Route generation** | `src/route_generator.py` → `RouteGenerator`, `EVRoutePlanner` |
| **System evaluation** | `src/evaluate.py` → `SystemEvaluator` class |
| **Frontend entry** | `frontend/src/main.tsx` → `frontend/src/App.tsx` |
| **API client (TS)** | `frontend/src/services/api.ts` → `APIClient` class |
| **Zustand store** | `frontend/src/store/store.ts` → `useSystemStore` |
| **API hook** | `frontend/src/hooks/useApi.ts` → `useApi<T>()` |
| **Page components** | `frontend/src/pages/Dashboard.tsx`, `RoutePlanner.tsx`, `Training.tsx`, `Analytics.tsx` |
| **Network map** | `frontend/src/components/NetworkMap.tsx` |
| **Python tests** | `src/test_*.py` (unit), `tests/test_api.py` (integration) |
| **JS tests** | `frontend/src/__tests__/*.test.tsx` (unit), `frontend/e2e/*.spec.ts` (E2E) |

---

## 3. Naming Conventions

### 3.1 Python (`src/`)

| Pattern | Convention | Examples |
|---|---|---|
| Modules | `snake_case.py` | `road_graph.py`, `traffic_generator.py`, `q_learning_agent.py` |
| Classes | `PascalCase` | `RoadGraph`, `EVState`, `SGGANTrafficGenerator`, `QLearningAgent` |
| Functions | `snake_case` | `create_synthetic_traffic()`, `train_q_learning_agent()` |
| Constants | `UPPER_SNAKE_CASE` | `HAS_GNN_GAN`, `HAS_MATPLOTLIB`, `HAS_TF` |
| Test files | `test_*.py` | `test_road_graph.py`, `test_api.py` |
| Private methods | `_prefix` | `_build_grid_network()`, `_evaluate_route_generation()` |
| Pipeline steps | `stepN_name()` | `step1_create_road_network()`, `step5_train_agent()` |

### 3.2 TypeScript (`frontend/src/`)

| Pattern | Convention | Examples |
|---|---|---|
| Components | `PascalCase.tsx` | `Header.tsx`, `NetworkMap.tsx`, `StatCard.tsx` |
| Pages | `PascalCase.tsx` in `pages/` | `Dashboard.tsx`, `RoutePlanner.tsx` |
| Services | `camelCase.ts` | `api.ts` |
| Hooks | `use*.ts` | `useApi.ts` |
| Store | `store.ts` | `store.ts` |
| Tests | `*.test.tsx` | `Header.test.tsx`, `store.test.ts` |
| E2E tests | `*.spec.ts` | `app.spec.ts`, `navigation.spec.ts` |
| Interfaces | `PascalCase` | `RoadNetworkData`, `RouteRequest`, `SystemStats` |

### 3.3 Model Artifacts

| Model | Naming Pattern | Location |
|---|---|---|
| SG-GAN Generator | `traffic_gan_generator.keras` (or `.h5`) | `models/sg_gan/` |
| SG-GAN Discriminator | `traffic_gan_discriminator.keras` (or `.h5`) | `models/sg_gan/` |
| GNN Generator | `gnn_generator.weights.h5` | `models/gnn_gan/` (or `src/models/gnn_gan/`) |
| GNN Discriminator | `gnn_discriminator.weights.h5` | `models/gnn_gan/` (or `src/models/gnn_gan/`) |
| Q-Learning Agent | `trained_agent.pkl` | `models/q_learning/` |

### 3.4 Data Files

| Data | Format | Location |
|---|---|---|
| Training traffic | `.npy` (NumPy array) | `data/training_data/traffic_data.npy` |
| Generated traffic | `.npy` | `data/generated_traffic/sample_traffic.npy` |
| Historical routes | `.npz` (NumPy archive) | `data/historical_routes/routes.npz` (inside `src/data/`) |
| Evaluation results | `.json` | `results/metrics/evaluation_results.json` |
| Training metrics | `.npz` | `results/metrics/training_metrics.npz` |
| Plots | `.png` | `results/plots/*.png` |

---

## 4. Configuration File Locations

| Config | Path | Purpose |
|---|---|---|
| Python project | `pyproject.toml` | Package metadata, black/isort/mypy config |
| Python deps (core) | `requirements.txt` | TF, NetworkX, Gymnasium, NumPy, SciPy, matplotlib |
| Python deps (API) | `requirements-api.txt` | FastAPI, Uvicorn, slowapi, pydantic, torch |
| Python deps (dev) | `requirements-dev.txt` | pytest, black, flake8, mypy, pre-commit |
| Docker (general) | `docker/Dockerfile` | Multi-purpose Python image |
| Docker (backend) | `docker/Dockerfile.backend` | Slim multi-stage API image |
| Docker Compose (ML) | `docker-compose.yml` | Test, training, tensorboard services |
| Docker Compose (UI) | `docker-compose.ui.yml` | Backend + frontend dev stack |
| Makefile | `Makefile` | Dev task automation |
| VS Code | `.vscode/settings.json` | Workspace-level editor settings |
| Frontend package | `frontend/package.json` | npm scripts (dev, build, test, lint) |
| Vite bundler | `frontend/vite.config.ts` | Dev server, build config |
| Vitest | `frontend/vitest.config.ts` | Test runner config |
| TypeScript | `frontend/tsconfig.json` | Compiler options |
| Tailwind | `frontend/tailwind.config.ts` | Design token customization |
| PostCSS | `frontend/postcss.config.js` | Tailwind + autoprefixer plugins |
| ESLint | `frontend/.eslintrc.cjs` | Linting rules |
| Prettier | `frontend/.prettierrc` | Code formatting |
| Playwright | `frontend/playwright.config.ts` | E2E test config |

---

## 5. Environment Variables

| Variable | Default | Where Used |
|---|---|---|
| `CORS_ORIGINS` | `http://localhost:5173,http://localhost:3000` | `backend_api.py` — CORS allowed origins |
| `LOG_FORMAT` | `json` | `backend_api.py` — `json` or `text` log format |
| `MAX_BODY_SIZE` | `1048576` (1 MB) | `backend_api.py` — request body limit |
| `VITE_API_URL` | `http://localhost:8000` | `frontend/src/services/api.ts` — backend base URL |
| `TF_CPP_MIN_LOG_LEVEL` | `2` | Docker compose — suppress TF warnings |
| `PYTHONUNBUFFERED` | `1` | Docker compose — unbuffered stdout |

---

## 6. Duplicate Directory Note

The project has **two parallel copies** of data, models, and results:

| Root-level | Src-level | Notes |
|---|---|---|
| `models/` | `src/models/` | Both contain trained artifacts. `EVRoutingSystem` defaults to writing to `models/` (configurable via `model_dir` config key) |
| `data/` | `src/data/` | Both contain training data. Default write target is `data/` |
| `results/` | `src/results/` | Both contain plots/metrics. Default write target is `results/` |

The `src/` copies appear to be from running the pipeline with the working directory set to `src/`. When running from the project root (the standard path), artifacts land in the root-level directories.
