# Codebase Conventions

> Auto-generated codebase analysis for EV_Routing project.

---

## 1. Code Style Patterns

### Python

- **Formatter**: `black` with `line-length = 100`, targets `py310`–`py312` (`pyproject.toml`)
- **Import sorter**: `isort` with `profile = "black"`, trailing comma, parentheses grouping (`pyproject.toml`)
- **Linter**: `flake8 >= 6.0` (dev dependency in `pyproject.toml`)
- **Type checker**: `mypy >= 1.0` with `ignore_missing_imports = true`, `disallow_untyped_defs = false` (lenient — not all functions have annotations)
- **Docstrings**: Module-level and class-level docstrings use the `"""triple-quote"""` style with `=====` underline banners:
  ```python
  """
  Road Graph Module for EV Routing System
  ========================================
  Implements a graph-based road network with: ...
  """
  ```
  Method docstrings use Google-style `Args:` / `Returns:` blocks (see `src/road_graph.py`, `src/route_generator.py`).
- **Line length**: 100 chars max (enforced by black config)
- **Section separators**: Heavy use of commented section banners:
  ```python
  # ============================================================================
  # TABULAR Q-LEARNING AGENT
  # ============================================================================
  ```
  The backend API uses Unicode box-drawing:
  ```python
  # ── Rate Limiting ─────────────────────────────────────
  ```

### TypeScript / React

- **Formatter**: Prettier via `frontend/.prettierrc`:
  - `semi: true`, `singleQuote: true`, `trailingComma: "es5"`, `printWidth: 100`, `tabWidth: 2`, `arrowParens: "always"`
- **Linter**: ESLint via `frontend/.eslintrc.cjs`:
  - Extends `eslint:recommended`, `@typescript-eslint/recommended`, `react-hooks/recommended`
  - Uses `react-refresh/only-export-components` rule (Vite HMR compatibility)
- **TypeScript**: Strict mode enabled (`frontend/tsconfig.json`):
  - `"strict": true`, `"noUnusedLocals": true`, `"noUnusedParameters": true`, `"noFallthroughCasesInSwitch": true`
  - Target: `ES2020`, JSX: `react-jsx`, module resolution: `bundler`
- **Section comments**: TypeScript files use Unicode box-drawing dividers consistent with the backend:
  ```typescript
  // ─── Toast Types ──────────────────────────────────────────
  ```

---

## 2. Naming Conventions

### Python

| Entity | Pattern | Examples |
|---|---|---|
| **Modules** | `snake_case.py` | `road_graph.py`, `traffic_generator.py`, `q_learning_agent.py`, `backend_api.py` |
| **Classes** | `PascalCase` | `RoadGraph`, `EVState`, `QLearningAgent`, `SGGANTrafficGenerator`, `EVRoutingEnvironment`, `RouteCandidate` |
| **Functions / methods** | `snake_case` | `shortest_path()`, `generate_routes()`, `choose_action()`, `calculate_edge_cost()` |
| **Private methods** | `_leading_underscore` | `_build_grid_network()`, `_add_diagonal_roads()`, `_get_observation()`, `_state_to_key()` |
| **Constants** | `UPPER_SNAKE_CASE` | `HAS_TF`, `HAS_GNN_GAN`, `LOG_FORMAT`, `_MAX_BODY_SIZE`, `_ROAD_NET_TTL` |
| **Module-private vars** | `_leading_underscore` | `_handler`, `_request_id_ctx`, `_cors_origins`, `_road_network_cache` |
| **Dataclasses** | `PascalCase` | `EVState`, `ChargingStation`, `EnvironmentConfig`, `RouteCandidate` |
| **Enums** | `PascalCase` class, `UPPER_SNAKE_CASE` members | `RoadType.HIGHWAY`, `RoadType.ARTERIAL` |
| **Test files** | `test_<module>.py` | `test_environment.py`, `test_road_graph.py`, `test_route_generator.py` |
| **Test classes** | `Test<Subject>` | `TestRoadGraphCreation`, `TestChargingStations`, `TestRouteGeneration` |
| **Test functions** | `test_<behavior>` | `test_creates_correct_number_of_nodes`, `test_route_path_valid` |

### TypeScript / React

| Entity | Pattern | Examples |
|---|---|---|
| **Component files** | `PascalCase.tsx` | `Header.tsx`, `StatCard.tsx`, `RouteCard.tsx`, `EmptyState.tsx` |
| **Page files** | `PascalCase.tsx` in `pages/` | `Dashboard.tsx`, `RoutePlanner.tsx`, `Training.tsx`, `Analytics.tsx` |
| **Utility files** | `camelCase.ts` | `utils.ts`, `api.ts`, `store.ts` |
| **Hook files** | `camelCase.ts` (use-prefix) | `useApi.ts` |
| **Test files** | `<Component>.test.tsx` | `Header.test.tsx`, `Sidebar.test.tsx`, `StatCard.test.tsx`, `store.test.ts` |
| **Interfaces** | `PascalCase` (no `I` prefix) | `Toast`, `SystemState`, `StatCardProps`, `ButtonProps`, `RoadNetworkData` |
| **Type aliases** | `PascalCase` | `AppTab`, `ThemeMode`, `ButtonVariant`, `CardVariant` |
| **Hooks** | `use<Name>` (camelCase) | `useApi`, `useRoadNetwork`, `useActiveTab`, `useTheme`, `useSidebar` |
| **Store selectors** | `use<Slice>` | `useRoadNetwork()`, `useSetRoadNetwork()`, `useTheme()`, `useLoading()` |
| **Constants** | `camelCase` (local), `UPPER_SNAKE_CASE` (env) | `menuItems`, `variantStyles`, `BASE_URL` |

---

## 3. Error Handling Patterns

### Python — Backend API (`backend_api.py`)

- **Structured error envelope**: All API errors use `{"ok": false, "message": "...", "detail": ...}` shape.
- **Helper functions**: `ok()` and `fail()` wrap responses uniformly:
  ```python
  def fail(message: str, code: int = 400, detail: Any = None):
      content = {"ok": False, "message": message}
      if detail is not None: content["detail"] = detail
      raise HTTPException(status_code=code, detail=content)
  ```
- **Guard functions**: `require_system()` and `require_route_gen()` raise 503 if subsystems aren't initialized.
- **Global exception handler**: Catches all unhandled exceptions, logs full traceback, returns generic 500 to prevent leaking internals.
- **Pydantic validation**: Request models use `Field(..., ge=, le=)` constraints and `@field_validator` for cross-field checks (e.g., source ≠ destination).
- **Try/except in endpoints**: Each endpoint wraps its core logic in try/except, re-raises `HTTPException`, catches `Exception` and calls `fail()`.

### Python — Core Modules

- **Graceful imports**: All modules use try/except for cross-module imports to support both `from road_graph import ...` (when run from `src/`) and `from src.road_graph import ...` (when run from project root).
- **Optional dependency checks**: `HAS_TF`, `HAS_MATPLOTLIB`, `HAS_GNN_GAN` flags for optional features.
- **Warnings suppression**: `warnings.filterwarnings('ignore')` in ML modules to silence TensorFlow/numpy deprecations.

### TypeScript — Frontend

- **Axios interceptors** (`frontend/src/services/api.ts`):
  - Response interceptor unwraps the `{ok, data}` envelope automatically.
  - Error interceptor normalizes all errors into `ApiError` shape: `{message, status, detail}`.
  - Console error logging in dev mode only (`import.meta.env.DEV`).
- **Component-level try/catch**: Pages use async/await with try/catch and toast notifications:
  ```typescript
  try { ... } catch (error: any) {
    addToast({ type: 'error', title: 'Failed', message: error?.message });
  } finally { setLoading(false); }
  ```
- **useApi hook** (`frontend/src/hooks/useApi.ts`): Generic hook wrapping `{data, loading, error}` state machine for any API call.
- **Mounted guards**: `useEffect` cleanup patterns to prevent state updates on unmounted components:
  ```typescript
  let mounted = true;
  // ...
  return () => { mounted = false; };
  ```

---

## 4. Import Organization

### Python

Typical order observed across all modules (matches `isort` "black" profile):

1. **Standard library**: `os`, `sys`, `json`, `time`, `logging`, `uuid`, `pathlib`, `typing`, `functools`, `collections`, `dataclasses`, `enum`
2. **Third-party**: `numpy`, `networkx`, `tensorflow`, `keras`, `gymnasium`, `fastapi`, `pydantic`, `slowapi`
3. **Local/project**: `from src.road_graph import ...`, `from src.route_generator import ...`

The `backend_api.py` adds `sys.path.insert(0, ...)` before local imports to ensure `src/` is importable.

Core modules use a defensive import pattern:
```python
try:
    from road_graph import RoadGraph, EVState
except ImportError:
    from src.road_graph import RoadGraph, EVState
```

### TypeScript

Typical order observed:

1. **React/library**: `react`, `zustand`, `axios`
2. **Store/services**: `../store/store`, `../services/api`
3. **Components**: `../components/Header`, `../components/ui`
4. **Icons**: `lucide-react` (always last among imports)
5. **Utilities**: `../lib/utils`

Named imports are preferred. The UI component barrel file (`frontend/src/components/ui/index.ts`) re-exports all primitives:
```typescript
export { default as Button } from './Button';
export { default as Card } from './Card';
// ...
```

---

## 5. Component Patterns (React)

### Component Architecture

- **Function components only** — no class components anywhere in the codebase.
- **Default exports**: Every component uses `export default` (not named exports), consistent with Vite lazy-loading via `lazy(() => import(...))`.
- **Code-splitting**: Page-level components are lazily loaded in `App.tsx`:
  ```typescript
  const DashboardView = lazy(() => import('./pages/Dashboard'));
  ```
- **Memoization**: Performance-critical components use `React.memo()`:
  ```typescript
  const StatCard = memo(function StatCard({ ... }: StatCardProps) { ... });
  StatCard.displayName = 'StatCard';
  ```

### Props Patterns

- **Interface-based props**: Every component defines a `<Name>Props` interface directly above the component.
- **Variant pattern**: UI primitives use `Record<Variant, string>` lookup tables for styling:
  ```typescript
  type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent';
  const variantStyles: Record<ButtonVariant, string> = { primary: '...', ... };
  ```
- **LucideIcon as prop**: Icons passed via `icon: LucideIcon` prop type, rendered inline.
- **`cn()` utility**: Used pervasively for conditional class merging (wrapper around `clsx`).

### File Structure

```
frontend/src/
├── components/           # Shared components (PascalCase)
│   ├── ui/               # Generic UI primitives (Button, Card, Badge, etc.)
│   │   └── index.ts      # Barrel re-exports
│   ├── Header.tsx         # App-level layout
│   ├── Sidebar.tsx
│   ├── StatCard.tsx       # Domain-specific widgets
│   ├── RouteCard.tsx
│   ├── NetworkMap.tsx
│   └── ToastContainer.tsx
├── pages/                # Route-level page views
│   ├── Dashboard.tsx
│   ├── RoutePlanner.tsx
│   ├── Training.tsx
│   └── Analytics.tsx
├── hooks/                # Custom hooks
│   └── useApi.ts
├── services/             # API client
│   └── api.ts
├── store/                # State management
│   └── store.ts
├── lib/                  # Utilities
│   └── utils.ts
├── App.tsx               # Root component
├── main.tsx              # Entry point
└── index.css             # Global styles (Tailwind)
```

### Accessibility

- **ARIA labels**: All interactive elements have proper `aria-label` attributes (`aria-label="Open navigation"`, `aria-label="Theme: ${themeMode}. Click to switch"`).
- **`aria-current="page"`**: Active sidebar item uses `aria-current` for screen readers.
- **Skip link**: `<a href="#main-content" className="skip-link">Skip to main content</a>` in `App.tsx`.
- **Keyboard navigation**: Sidebar supports `ArrowDown`/`ArrowUp` keyboard nav via `useRef` array.
- **Roles**: Interactive Cards get `role="button"` and `tabIndex={0}` when `onClick` is provided.

---

## 6. State Management Patterns

### Zustand Store (`frontend/src/store/store.ts`)

- **Single store**: One monolithic `useSystemStore` with all application state using `create<SystemState>()`.
- **Persist middleware**: Only user preferences (`themeMode`, `sidebarCollapsed`) are persisted to `localStorage` via `partialize`:
  ```typescript
  persist((...) => ({...}), {
    name: 'ev-routing-preferences',
    partialize: (state) => ({ themeMode: state.themeMode, sidebarCollapsed: state.sidebarCollapsed }),
  })
  ```
- **Granular selector hooks**: Exported hooks subscribe to individual slices to prevent unnecessary re-renders:
  ```typescript
  export const useRoadNetwork = () => useSystemStore((s) => s.roadNetwork);
  export const useTheme = () => useSystemStore((s) => ({ themeMode: s.themeMode, isDarkMode: s.isDarkMode, ... }));
  ```
- **Actions colocated with state**: Setter functions live inside the store, not external action creators.
- **Toast auto-removal**: `addToast()` sets a `setTimeout` for auto-cleanup inside the store itself.
- **Theme cycling**: `cycleTheme()` rotates `light → dark → system → light`, computing `isDarkMode` from `window.matchMedia` when in system mode.

---

## 7. API Patterns (FastAPI)

### Architecture (`backend_api.py`)

- **Lifespan handler**: Modern `@asynccontextmanager` lifespan (not deprecated `on_event`). Initializes `EVRoutingSystem` on startup.
- **OpenAPI metadata**: Full API docs with `tags_metadata`, `contact`, `license_info`, and per-endpoint `summary` + `description`.
- **Rate limiting**: `slowapi` with per-endpoint limits (`120/minute` health, `30/minute` routing, `5/minute` training start).
- **CORS**: Configurable via `CORS_ORIGINS` environment variable, defaults to `localhost:5173,localhost:3000`.
- **Response envelope**: All responses wrapped in `{"ok": true, "message": "success", "data": ...}` via `ok()` helper.
- **Pydantic models**: Request validation with `BaseModel`, `Field` constraints, and custom validators.
- **Background tasks**: Training pipeline runs via `BackgroundTasks.add_task()`.
- **Caching**: Manual TTL-based caching for road network (5 min) and system stats (10 sec).

### Middleware Stack

1. **CORS** — `CORSMiddleware` (allow credentials, specific methods/origins)
2. **Security headers** — `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `X-XSS-Protection`
3. **Request logger** — Correlation ID (`X-Request-ID`), response timing (`X-Response-Time`), body size check (1 MB max), structured JSON logging

### Logging

- **Structured JSON**: Default format is JSON with `timestamp`, `level`, `logger`, `message`, `request_id`, and optionally `method`, `path`, `status`, `duration_ms`.
- **Correlation ID**: `ContextVar`-based `request_id` propagated through all log messages for request tracing.
- **Configurable**: `LOG_FORMAT=json` (default) or plain text via environment variable.

### API Client (Frontend — `frontend/src/services/api.ts`)

- **Class-based singleton**: `APIClient` class instantiated once, exported as `api`.
- **Axios interceptors**: Automatic envelope unwrapping and error normalization.
- **Base URL**: `import.meta.env.VITE_API_URL || 'http://localhost:8000'`.
- **Timeout**: 30 seconds.
- **Method naming**: Matches backend endpoints — `healthCheck()`, `getRoadNetwork()`, `generateRoute()`, `startTraining()`, etc.

---

## 8. Styling Conventions

### Tailwind CSS

- **Config**: `frontend/tailwind.config.ts` with custom design system:
  - Custom color scales: `primary` (teal/cyan), `accent` (amber/gold), `surface`, `success`, `danger`, `warning`, `info`
  - Custom font families: `Inter` (sans), `JetBrains Mono` (mono)
  - Dark mode: `class` strategy (toggled via `document.documentElement.classList.toggle('dark', isDarkMode)`)
- **PostCSS**: `tailwindcss` + `autoprefixer` (`frontend/postcss.config.js`)
- **Utility-first**: Components use Tailwind classes directly; no CSS modules or styled-components.
- **`cn()` helper**: `clsx`-based utility in `frontend/src/lib/utils.ts` for conditional class composition.
- **Common patterns**:
  - Dark mode variants: `text-surface-900 dark:text-surface-50`
  - Responsive: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`
  - Transitions: `transition-all duration-300`, `transition-colors`
  - Glass morphism: `.glass` utility class in CSS

---

## 9. Project Build & Tooling

### Python

- **Build system**: `setuptools >= 65.0` + `wheel` (`pyproject.toml`)
- **Python version**: `>= 3.10`
- **Core deps**: `tensorflow`, `numpy`, `scipy`, `matplotlib`, `networkx`, `gymnasium`
- **Dev deps**: `pytest`, `pytest-cov`, `black`, `flake8`, `mypy`, `isort`, `pre-commit`
- **API deps**: FastAPI, uvicorn, slowapi, pydantic (in `requirements-api.txt`)

### Frontend

- **Bundler**: Vite 5 (`frontend/vite.config.ts`)
- **Framework**: React 18 + TypeScript 5
- **Package manager**: npm (lockfile present)
- **Key deps**: `zustand` (state), `axios` (HTTP), `lucide-react` (icons), `react-leaflet` (maps), `recharts` (charts)
- **Scripts**: `dev`, `build`, `preview`, `lint`, `type-check`, `test`
