# Technology Stack

> Auto-generated codebase map — EV Routing System

---

## Languages & Versions

| Language   | Version        | Usage                                    |
|------------|----------------|------------------------------------------|
| Python     | ≥ 3.10 (3.11 in Docker backend, 3.12 in Docker base) | Backend API, ML pipeline, RL agents |
| TypeScript | ≥ 5.2          | Frontend SPA (strict mode enabled)       |
| Bash       | –              | `setup.sh`, `Makefile` tasks             |

Configured in `pyproject.toml` (`requires-python = ">=3.10"`) and `frontend/tsconfig.json` (`"target": "ES2020"`).

---

## Runtime Environment

| Component      | Runtime                    | Entry point                |
|----------------|----------------------------|----------------------------|
| Backend API    | Uvicorn (ASGI)             | `backend_api.py`           |
| ML Pipeline    | CPython + TensorFlow       | `src/main.py`              |
| Frontend       | Vite dev server / `serve`  | `frontend/src/main.tsx`    |
| Containers     | Docker Compose v3.8        | `docker-compose.yml`, `docker-compose.ui.yml` |
| TensorBoard    | TensorBoard on port 6006   | `docker-compose.yml` (tensorboard service) |

---

## Frameworks

### Backend

| Framework       | Version | Purpose                                            | Config location         |
|-----------------|---------|----------------------------------------------------|-------------------------|
| **FastAPI**     | 0.104.1 | REST API with OpenAPI docs, background tasks       | `backend_api.py`        |
| **Pydantic**    | 2.5.0   | Request/response validation, settings              | `backend_api.py`        |
| **TensorFlow**  | ≥ 2.10 (2.14 in API) | SG-GAN, GNN Route GAN, DQN neural networks | `requirements.txt`, `requirements-api.txt` |
| **Gymnasium**   | ≥ 0.28 (0.29.1 in API) | RL environment (OpenAI Gym successor)       | `src/environment.py`    |
| **NetworkX**    | ≥ 3.0   | Road graph data structure & algorithms             | `src/road_graph.py`     |

### Frontend

| Framework          | Version | Purpose                                  | Config location         |
|--------------------|---------|------------------------------------------|-------------------------|
| **React**          | 18.2    | UI component library                     | `frontend/package.json` |
| **Vite**           | 5.0     | Dev server, HMR, production bundler      | `frontend/vite.config.ts` |
| **Tailwind CSS**   | 3.3.6   | Utility-first CSS framework              | `frontend/tailwind.config.ts` |
| **Zustand**        | 4.4.1   | Lightweight state management (w/ persist)| `frontend/src/store/store.ts` |
| **React-Leaflet**  | 4.2.1   | Interactive map rendering                | `frontend/src/components/NetworkMap*.tsx` |
| **Recharts**       | 2.10    | Data visualization / charting            | `frontend/src/pages/Analytics.tsx` |

---

## Key Dependencies (with purposes)

### Python — Core (`requirements.txt`)

| Package        | Version  | Purpose                                           |
|----------------|----------|---------------------------------------------------|
| `tensorflow`   | ≥ 2.10.0 | Deep learning: SG-GAN generator/discriminator, DQN |
| `networkx`     | ≥ 3.0    | Road network graph representation & pathfinding   |
| `gymnasium`    | ≥ 0.28.0 | RL environment interface (Gymnasium API)          |
| `numpy`        | ≥ 1.23.0 | Numerical operations, array manipulation          |
| `scipy`        | ≥ 1.10.0 | Scientific utilities                              |
| `matplotlib`   | ≥ 3.7.0  | Training plots, road network visualization        |

### Python — API-specific (`requirements-api.txt`)

| Package              | Version  | Purpose                                        |
|----------------------|----------|------------------------------------------------|
| `fastapi`            | 0.104.1  | ASGI web framework                             |
| `uvicorn`            | 0.24.0   | ASGI server                                    |
| `pydantic`           | 2.5.0    | Data validation / serialization                |
| `python-multipart`   | 0.0.6    | Form data parsing                              |
| `slowapi`            | ≥ 0.1.9  | Rate limiting middleware                       |
| `python-json-logger` | ≥ 2.0    | Structured JSON logging                        |
| `scikit-learn`       | 1.3.2    | ML utilities (metrics, preprocessing)          |
| `torch`              | 2.1.0    | PyTorch (GNN-related route generation)         |

### Python — Dev (`requirements-dev.txt`)

| Package       | Purpose                        |
|---------------|--------------------------------|
| `pytest`      | Test runner                    |
| `pytest-cov`  | Coverage reporting             |
| `pytest-xdist`| Parallel test execution        |
| `black`       | Code formatter                 |
| `flake8`      | Linter                         |
| `isort`       | Import sorting                 |
| `mypy`        | Static type checker            |
| `pylint`      | Extended linting               |
| `pre-commit`  | Git hook management            |
| `sphinx`      | Documentation generator        |
| `jupyter`     | Interactive notebooks          |

### Frontend — Runtime (`frontend/package.json`)

| Package          | Version | Purpose                                  |
|------------------|---------|------------------------------------------|
| `react`          | 18.2    | UI library                               |
| `react-dom`      | 18.2    | DOM renderer                             |
| `axios`          | 1.6     | HTTP client for API calls                |
| `leaflet`        | 1.9.4   | Map tile rendering engine                |
| `react-leaflet`  | 4.2.1   | React wrapper for Leaflet                |
| `recharts`       | 2.10    | Charting / data viz                      |
| `zustand`        | 4.4.1   | Client-side state management             |
| `lucide-react`   | 0.294   | Icon library                             |
| `clsx`           | 2.0     | Conditional className utility            |

### Frontend — Dev (`frontend/package.json` devDependencies)

| Package                      | Purpose                              |
|------------------------------|--------------------------------------|
| `typescript`                 | Static typing                        |
| `@vitejs/plugin-react`      | Vite React plugin (Fast Refresh)     |
| `tailwindcss` + `postcss` + `autoprefixer` | CSS toolchain            |
| `vitest`                     | Unit test runner (Vite-native)       |
| `@testing-library/react`    | React component testing utilities    |
| `jsdom`                      | DOM simulation for tests             |
| `@playwright/test`          | End-to-end browser testing           |
| `rollup-plugin-visualizer`  | Bundle analysis (`stats.html`)       |

---

## Build Tools & Configuration

### Backend

| Tool           | Config file                 | Purpose                              |
|----------------|-----------------------------|--------------------------------------|
| setuptools     | `pyproject.toml`            | Package build system                 |
| black          | `pyproject.toml` [tool.black] | Code formatting (line-length 100)  |
| isort          | `pyproject.toml` [tool.isort] | Import sorting (black-compatible)  |
| mypy           | `pyproject.toml` [tool.mypy]  | Type checking (Python 3.10 target) |
| pytest         | `pyproject.toml` [tool.pytest.ini_options] | Test discovery & config |
| Make           | `Makefile`                  | Task runner (install, test, lint, docker) |

### Frontend

| Tool           | Config file                        | Purpose                          |
|----------------|------------------------------------|----------------------------------|
| Vite           | `frontend/vite.config.ts`          | Bundler, dev server, proxy to `:8000` |
| TypeScript     | `frontend/tsconfig.json`           | Strict TS compilation            |
| Tailwind CSS   | `frontend/tailwind.config.ts`      | Utility CSS with custom theme    |
| PostCSS        | `frontend/postcss.config.js`       | CSS processing pipeline          |
| ESLint         | `frontend/.eslintrc.cjs`           | Linting                         |
| Prettier       | `frontend/.prettierrc`             | Formatting                       |
| Vitest         | `frontend/vitest.config.ts`        | Unit tests (jsdom, v8 coverage)  |
| Playwright     | `frontend/playwright.config.ts`    | E2E tests against `:5173`        |
| Rollup Visualizer | `frontend/vite.config.ts`       | Bundle size analysis → `stats.html` |

### Docker

| File                         | Base image          | Purpose                          |
|------------------------------|---------------------|----------------------------------|
| `docker/Dockerfile`          | `python:3.12-slim`  | ML pipeline (tests, training)    |
| `docker/Dockerfile.backend`  | `python:3.11-slim`  | Production API (multi-stage, non-root) |
| `docker/Dockerfile.frontend` | `node:18-alpine`    | Frontend build + `serve` static  |

### Vite Build Optimizations

Manual chunk splitting configured in `frontend/vite.config.ts`:
- `vendor-react` → react, react-dom
- `vendor-map` → leaflet, react-leaflet
- `vendor-charts` → recharts
- `vendor-state` → zustand, axios

---

## Package Managers

| Scope    | Manager | Lockfile                       |
|----------|---------|--------------------------------|
| Backend  | pip     | (no lockfile; pinned in `requirements-api.txt`) |
| Frontend | npm     | `frontend/package-lock.json`   |
| Build    | setuptools + wheel | `pyproject.toml`      |
