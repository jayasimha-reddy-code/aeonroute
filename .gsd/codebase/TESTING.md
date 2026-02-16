# Testing Patterns

> Auto-generated testing analysis for EV_Routing project.

---

## 1. Test Frameworks

| Layer | Framework | Config File | Runner Command |
|---|---|---|---|
| **Python unit/integration** | pytest >= 7.0 | `pyproject.toml` `[tool.pytest.ini_options]` | `pytest` (from project root) |
| **Python coverage** | pytest-cov >= 4.0 | `pyproject.toml` `[tool.coverage.*]` | `pytest --cov` |
| **Frontend unit** | Vitest 4.x | `frontend/vitest.config.ts` | `cd frontend && npm test` |
| **Frontend E2E** | Playwright 1.58 | `frontend/playwright.config.ts` | `cd frontend && npx playwright test` |

### Python — pytest Configuration

From `pyproject.toml`:
```toml
[tool.pytest.ini_options]
addopts = "-v --tb=short"
testpaths = ["src"]
python_files = ["test_*.py"]
python_classes = ["Test*"]
python_functions = ["test_*"]
markers = [
    "slow: marks tests as slow",
    "gpu: marks tests that may use GPU",
]
```

### Frontend — Vitest Configuration

From `frontend/vitest.config.ts`:
```typescript
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,          // describe/it/expect available without import
    environment: 'jsdom',   // DOM simulation
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.*', 'src/main.tsx'],
    },
  },
});
```

### Frontend — Playwright Configuration

From `frontend/playwright.config.ts`:
```typescript
export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  retries: 1,
  use: {
    baseURL: 'http://localhost:5173',
    headless: true,
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm run dev',
    port: 5173,
    reuseExistingServer: true,
  },
});
```

---

## 2. Test File Organization & Naming

### Python Tests

| File | Location | Tests For |
|---|---|---|
| `src/test_environment.py` | In-source | `EVRoutingEnvironment`, `LegacyEVRoutingEnvironment` |
| `src/test_road_graph.py` | In-source | `RoadGraph`, `EVState`, `ChargingStation`, routing |
| `src/test_route_generator.py` | In-source | `RouteGenerator`, `RouteCandidate`, `EVRoutePlanner` |
| `src/test_traffic_generation.py` | In-source | `create_synthetic_traffic()`, `SGGANTrafficGenerator` |
| `tests/test_api.py` | Top-level `tests/` | FastAPI endpoints via `TestClient` |

**Pattern**: Core module tests live alongside source in `src/` with `test_<module>.py` naming. API integration tests are in `tests/` directory.

### Frontend Tests

| File | Location | Tests For |
|---|---|---|
| `frontend/src/__tests__/Header.test.tsx` | Centralized `__tests__/` | `Header` component rendering |
| `frontend/src/__tests__/Sidebar.test.tsx` | Centralized `__tests__/` | `Sidebar` navigation + ARIA |
| `frontend/src/__tests__/StatCard.test.tsx` | Centralized `__tests__/` | `StatCard` props rendering |
| `frontend/src/__tests__/store.test.ts` | Centralized `__tests__/` | Zustand store actions |
| `frontend/e2e/app.spec.ts` | Separate `e2e/` | Page load, title, skip link, theme toggle |
| `frontend/e2e/navigation.spec.ts` | Separate `e2e/` | Sidebar navigation between tabs |

**Pattern**: Component unit tests use `<Component>.test.tsx` in `src/__tests__/`. E2E specs use `<feature>.spec.ts` in `e2e/`.

### Test Setup Files

- **`frontend/src/__tests__/setup.ts`** — Extends Vitest `expect` with `@testing-library/jest-dom` matchers + logs confirmation.
- **`frontend/src/test-setup.ts`** — Minimal alternative setup (just extends matchers). Referenced by vitest config.

---

## 3. Test Styles & Patterns

### Python — pytest

**Class-based grouping** (dominant in `src/test_road_graph.py`, `src/test_route_generator.py`, `tests/test_api.py`):
```python
class TestRoadGraphCreation:
    """Test RoadGraph initialization."""

    def test_creates_correct_number_of_nodes(self, small_graph):
        assert small_graph.num_nodes == 25

    def test_graph_is_directed(self, small_graph):
        import networkx as nx
        assert isinstance(small_graph.graph, nx.DiGraph)
```

**Function-based** (used in `src/test_environment.py`, `src/test_traffic_generation.py`):
```python
def test_environment_reset():
    """Test that environment can be reset and returns valid state."""
    env = EVRoutingEnvironment(grid_size=5, max_battery=100)
    state = env.reset()
    assert state is not None
```

**Fixtures**: Defined per-file via `@pytest.fixture`:
```python
@pytest.fixture
def small_graph():
    return RoadGraph(grid_size=5, seed=42)

@pytest.fixture
def default_ev():
    return EVState(battery_soc=80.0, battery_capacity_kwh=60.0, current_node=0, time_minutes=480)
```

**Assertion style**: Plain `assert` statements (no `assertEqual`). Uses `pytest.approx()` for float comparisons:
```python
assert default_ev.remaining_energy_kwh == pytest.approx(48.0)
```

**Console output**: Some tests print emoji-prefixed status (`✅`, `📊`, `🏗️`) for visual feedback when run directly.

**`__main__` runner**: Several test files include:
```python
if __name__ == '__main__':
    pytest.main([__file__, '-v'])
```

### Frontend — Vitest

**describe/it blocks** with `@testing-library/react`:
```typescript
describe('Header', () => {
    it('renders without crashing', async () => {
        await act(async () => { render(<Header />); });
        expect(document.querySelector('header')).toBeTruthy();
    });
});
```

**Store tests** use `useSystemStore.getState()` / `useSystemStore.setState()` directly (no rendering):
```typescript
beforeEach(() => {
    useSystemStore.setState({ activeTab: 'dashboard', ... });
});

it('should set active tab and close mobile sidebar', () => {
    const store = useSystemStore.getState();
    store.setActiveTab('training');
    expect(useSystemStore.getState().activeTab).toBe('training');
});
```

**Assertion style**: `expect(...).toBeTruthy()`, `expect(...).toBe(...)`, `expect(...).toEqual(...)`, `expect(...).toHaveLength(...)`.

### Frontend — Playwright E2E

**test.describe blocks** with page object pattern:
```typescript
test.describe('Navigation', () => {
    test('clicking sidebar items changes active view', async ({ page }) => {
        await page.goto('/');
        await page.getByText(/Route Planner/i).click();
        await expect(page.locator('main')).toBeVisible();
    });
});
```

**Locator strategies**: `page.getByText()`, `page.getByRole()`, `page.locator()`. Uses regex matchers (`/Route Planner/i`).

---

## 4. Mocking Strategies

### Python

- **No mocking framework used**: The Python tests create real objects rather than mocks. Tests use small configurations (grid_size=5) for speed:
  ```python
  @pytest.fixture
  def small_graph():
      return RoadGraph(grid_size=5, seed=42)
  ```
- **API tests use TestClient**: `fastapi.testclient.TestClient` wraps the real app, exercises actual middleware and lifespan:
  ```python
  @pytest.fixture
  def client():
      with TestClient(app) as c:
          yield c
  ```
- **GAN tests train with tiny datasets**: `n_samples=20-30`, `epochs=1`, `batch_size=8` for fast validation without mocking TensorFlow.

### Frontend — Vitest

- **`vi.mock()` for API modules**: Components that call APIs have the API module mocked at module level:
  ```typescript
  vi.mock('../services/api', () => ({
      default: {
          healthCheck: vi.fn().mockResolvedValue({ status: 'ok' }),
          getSystemStats: vi.fn().mockResolvedValue({}),
      },
  }));
  ```
- **`vi.useFakeTimers()` / `vi.useRealTimers()`**: Used to control `setInterval` in `Header` (health polling):
  ```typescript
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });
  ```
- **Store state reset**: `useSystemStore.setState({...})` in `beforeEach` to ensure test isolation.
- **No HTTP interception**: No MSW or `nock`; API is fully mocked at module level.

### Frontend — Playwright

- **No mocking**: E2E tests run against the live dev server. The `webServer` config starts `npm run dev` automatically.
- **Implicit dependency on backend**: Tests assume the backend is running (or the frontend handles errors gracefully).

---

## 5. Test Coverage Configuration

### Python

From `pyproject.toml`:
```toml
[tool.coverage.run]
source = ["src"]
omit = ["*/tests/*", "*/__main__.py", "*/site-packages/*"]

[tool.coverage.report]
exclude_lines = [
    "pragma: no cover",
    "def __repr__",
    "raise AssertionError",
    "raise NotImplementedError",
    "if __name__ == .__main__.:",
    "if TYPE_CHECKING:",
    "@abstractmethod",
]
```

A `.coverage` file exists at the project root, indicating coverage has been run.

### Frontend

From `frontend/vitest.config.ts`:
- Provider: `v8`
- Reporters: `text` + `lcov`
- Includes: `src/**/*.{ts,tsx}`
- Excludes: test files + `src/main.tsx`

---

## 6. E2E Test Setup

### Playwright (`frontend/playwright.config.ts`)

- **Test directory**: `frontend/e2e/`
- **Timeout**: 30 seconds per test
- **Retries**: 1 (auto-retry on failure)
- **Headless**: true (CI-friendly)
- **Screenshots**: Only on failure
- **Web server**: Auto-starts `npm run dev` on port 5173, reuses existing server if already running
- **Base URL**: `http://localhost:5173`

### Current E2E Test Coverage

| Spec File | Tests |
|---|---|
| `frontend/e2e/app.spec.ts` | Page title, default view, skip link visibility on Tab, theme toggle cycling |
| `frontend/e2e/navigation.spec.ts` | Sidebar navigation to Route Planner, Training, Analytics tabs |

### E2E Limitations

- Tests verify **visibility** (`toBeVisible()`) but don't check rendered content deeply.
- No route generation E2E (would require running backend).
- No network interception/stubbing for offline E2E.

---

## 7. What's Tested vs. What's Not

### Python — Well Tested

| Module | Coverage | Notes |
|---|---|---|
| `road_graph.py` | **Good** | Node creation, edges, road types, charging stations, EVState properties, routing, edge costs, traffic shapes |
| `route_generator.py` | **Good** | Candidate generation, path validity, energy/distance assertions, best route by criteria, EVRoutePlanner |
| `environment.py` | **Basic** | Reset, step with random actions, legacy environment compatibility |
| `traffic_generator.py` | **Good** | Synthetic data shape/dtype/range, GAN init, training (1 epoch), generation output shape |
| `backend_api.py` | **Good** | Health, road network (structure, clamping, caching), system stats, training status/stop, error handling (422, 404, 409) |

### Python — Gaps

| Area | Status | Risk |
|---|---|---|
| `q_learning_agent.py` | **No dedicated test file** | Agent training, Q-table updates, exploration decay, save/load untested in isolation |
| `main.py` (EVRoutingSystem) | **No dedicated test file** | Full pipeline orchestration untested |
| `gnn_route_generator.py` | **No dedicated test file** | GNN Route GAN untested |
| GAN training quality | **Minimal** | Only 1-epoch smoke tests; no discriminator/generator quality assertions |
| Edge cases in environment | **Minimal** | Battery depletion, charging decisions, destination reaching not tested |
| `evaluate.py` | **No test file** | Evaluation module untested |
| Concurrency / background training | **Not tested** | The async training pipeline has no integration test |
| Rate limiting | **Not tested** | Slowapi limits not exercised in test suite |

### Frontend — Well Tested

| Area | Coverage | Notes |
|---|---|---|
| Zustand store | **Strong** | Navigation, theme cycling, sidebar toggle, toasts (add/remove/multiple), EV state, routes, loading state |
| Header component | **Good** | Renders, element structure, title text, theme toggle button, mobile menu button |
| Sidebar component | **Good** | Renders nav, ARIA labels, all 4 menu items, `aria-current` on active tab |
| StatCard component | **Basic** | Renders, shows title + value |

### Frontend — Gaps

| Area | Status | Risk |
|---|---|---|
| `Dashboard.tsx` page | **No unit test** | Data loading, stats display, network map integration |
| `RoutePlanner.tsx` page | **No unit test** | Form interactions, route generation, map overlay |
| `Training.tsx` page | **No unit test** | Training start/stop, progress display |
| `Analytics.tsx` page | **No unit test** | Charts, metrics display |
| `NetworkMap.tsx` | **No unit test** | Leaflet map rendering, node/edge visualization |
| `RouteCard.tsx` | **No unit test** | Route detail display |
| `ToastContainer.tsx` | **No unit test** | Toast rendering, auto-dismiss |
| `useApi` hook | **No unit test** | Loading/error state transitions |
| `api.ts` service | **No unit test** | Interceptors, envelope unwrapping, error normalization |
| `utils.ts` | **No unit test** | `formatNumber`, `formatDuration`, `formatEnergy`, `formatDistance`, `getScoreColor` |
| UI primitives | **No unit tests** | `Button`, `Card`, `Badge`, `Input`, `Spinner`, `Skeleton`, `ProgressBar`, `EmptyState` (except StatCard) |
| E2E route generation | **Not tested** | Full flow from input to map rendering |
| E2E error states | **Not tested** | Backend offline scenarios, invalid inputs |
| E2E mobile responsive | **Not tested** | Mobile sidebar, responsive layout |
| Accessibility audits | **Not tested** | No axe-core or similar automated a11y testing |

---

## 8. Running Tests

### Python
```bash
# All tests (from project root)
pytest

# With coverage
pytest --cov=src --cov-report=term

# Specific test file
pytest src/test_road_graph.py -v

# API tests only
pytest tests/test_api.py -v

# Skip slow/GPU tests
pytest -m "not slow and not gpu"
```

### Frontend Unit Tests
```bash
cd frontend

# Run once
npx vitest run

# Watch mode
npm test

# With coverage
npx vitest run --coverage
```

### Frontend E2E Tests
```bash
cd frontend

# Install browsers (first time)
npx playwright install

# Run E2E tests
npx playwright test

# Run with UI (headed)
npx playwright test --headed

# Specific spec
npx playwright test e2e/navigation.spec.ts
```

---

## 9. Test Quality Summary

| Dimension | Python | Frontend Unit | Frontend E2E |
|---|---|---|---|
| **Framework** | pytest | Vitest + RTL | Playwright |
| **Test count** | ~30+ | ~25+ | ~8 |
| **Fixture quality** | Good (small configs, seed=42) | Good (store reset, API mocks) | Basic (page.goto) |
| **Isolation** | Good (independent objects) | Good (store reset per test) | Adequate (dev server) |
| **Mocking depth** | None (real objects) | Module-level vi.mock | None |
| **Async handling** | N/A | act() wrapper | Playwright auto-wait |
| **Coverage config** | Configured | Configured (v8+lcov) | N/A |
| **CI integration** | Not observed | Not observed | Headless-ready |
| **Biggest gap** | Q-learning agent, GNN module | Page components, API service | Route gen flow, error states |
