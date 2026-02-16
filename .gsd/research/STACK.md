# STACK.md — Technology Research for EV Routing Upgrade

> Researched: 2026-02-16  
> Context: Brownfield upgrade — Python 3.10+/FastAPI backend, TF 2.14/Keras ML pipeline, React 18/Vite 5/Tailwind 3/Zustand frontend  
> Goal: Presentation-grade full-stack application with glassmorphism UI, Apple-level animations, improved ML

---

## Current Stack Snapshot

| Layer | Current | Version |
|---|---|---|
| Frontend framework | React | 18.2.0 |
| Bundler | Vite | 5.0.0 |
| CSS | Tailwind CSS | 3.3.6 |
| State management | Zustand | 4.4.1 |
| Charts | Recharts | 2.10.0 |
| Maps | Leaflet + react-leaflet | 1.9.4 / 4.2.1 |
| Icons | lucide-react | 0.294.0 |
| HTTP | Axios | 1.6.0 |
| Unit tests (JS) | Vitest | 4.0.18 |
| E2E tests | Playwright | 1.58.2 |
| Backend | FastAPI | 0.104.1 |
| ML framework | TensorFlow | 2.14.0 |
| RL framework | Gymnasium | 0.29.1 |
| Python tests | pytest | 7.x |

---

## 1. Animation Library

### Recommendation: **Framer Motion 12.x**

```
npm install framer-motion@^12.4
```

| Criterion | Framer Motion | React Spring | GSAP |
|---|---|---|---|
| React integration | Native (`<motion.div>`) | Hook-based, verbose | Imperative, needs refs |
| Spring physics | Built-in, configurable | Core strength | Requires plugin |
| Layout animations | `layoutId` (magic) | Manual | Manual |
| Gesture support | Drag, tap, hover, pan | None | Draggable (paid) |
| Exit animations | `<AnimatePresence>` | Manual unmount | Manual |
| Bundle (tree-shaken) | ~17 KB gzipped | ~12 KB | ~28 KB (core) |
| License | MIT | MIT | **Proprietary** (free tier) |
| SSR / RSC | Supported | Partial | No |

**Why Framer Motion wins for this project:**

1. **Glassmorphism animations** — `backdrop-filter` transitions, opacity/blur spring animations work out of the box with `animate={{ backdropFilter: "blur(20px)" }}`
2. **Layout animations** — Route cards, stat cards, and dashboard panels can animate between states with a single `layout` prop. This is the "Apple feel" shortcut.
3. **`AnimatePresence`** — Page transitions between Dashboard/RoutePlanner/Training/Analytics tabs become trivial with exit animations.
4. **Spring physics** — Natural, non-linear motion (e.g., route card appearing with overshoot) without manually tuning cubic-bezier curves.
5. **Gesture system** — Drag-to-reorder routes, hover-reveal stats, pinch-to-zoom on maps.
6. **Scroll-triggered animations** — `whileInView` for presentation reveal effects.

**What NOT to use:**

| Library | Why not |
|---|---|
| **GSAP** | Proprietary license (cannot use commercially without paid plan). Imperative API creates ref-soup in React. Overkill for UI motion — designed for timeline animation. |
| **React Spring** | No built-in exit animations, no layout animations, no gesture system. You'd need `@use-gesture` as a separate dep. More boilerplate for less capability. |
| **CSS-only (current)** | The tailwind config already has 18 keyframe animations — these are fine for micro-interactions but cannot handle layout animations, spring physics, or exit animations. Keep these for simple hovers/fades. |
| **auto-animate** | Too simple — adds enter/exit but no spring physics or gesture control. |

**Integration strategy:**

- Keep existing Tailwind `animate-*` utilities for simple transitions (shimmer, pulse-glow, fade-in)
- Use Framer Motion for: page transitions, card layout animations, route visualization entrance, stat number counting, modal/drawer spring animations
- Combine: Tailwind handles static states, Framer Motion handles dynamic orchestration

---

## 2. Glassmorphism CSS

### Recommendation: **Tailwind CSS 3.4 (current v3 line) + custom design tokens (no plugin needed)**

```
npm install tailwindcss@^3.4
```

**Do NOT install a Tailwind plugin for glassmorphism.** The project's tailwind.config.ts already has 90% of the design token infrastructure. Tailwind 3.4 ships native `backdrop-blur-*`, `bg-*/opacity`, and `border-*/opacity` utilities — the three pillars of glassmorphism.

### Glassmorphism Design Token System

Add these to the existing `tailwind.config.ts` under `theme.extend`:

```typescript
// Glass surface tokens
backdropBlur: {
  'glass-sm': '8px',     // Subtle frost
  'glass': '16px',       // Standard glass
  'glass-lg': '24px',    // Heavy frost
  'glass-xl': '40px',    // Maximum blur (modals)
},
// Glass-specific background colors (use with bg-opacity)
backgroundColor: {
  'glass-light': 'rgba(255, 255, 255, 0.08)',
  'glass': 'rgba(255, 255, 255, 0.12)',
  'glass-heavy': 'rgba(255, 255, 255, 0.18)',
  'glass-dark': 'rgba(15, 23, 42, 0.75)',      // Dark mode panels
  'glass-dark-heavy': 'rgba(15, 23, 42, 0.85)', // Dark mode modals
},
// Glass border colors
borderColor: {
  'glass': 'rgba(255, 255, 255, 0.12)',
  'glass-light': 'rgba(255, 255, 255, 0.06)',
  'glass-heavy': 'rgba(255, 255, 255, 0.20)',
},
```

### Reusable Glass Component Classes

Add to `frontend/src/index.css`:

```css
@layer components {
  .glass {
    @apply bg-glass backdrop-blur-glass border border-glass shadow-card;
  }
  .glass-heavy {
    @apply bg-glass-heavy backdrop-blur-glass-lg border border-glass-heavy shadow-elevated;
  }
  .glass-card {
    @apply glass rounded-2xl p-6 transition-all duration-300
           hover:shadow-card-hover hover:border-glass-heavy;
  }
  .glass-modal {
    @apply bg-glass-dark-heavy backdrop-blur-glass-xl border border-glass
           rounded-3xl shadow-2xl;
  }
}
```

**Why NOT Tailwind v4:**

| Factor | Tailwind v3.4 | Tailwind v4 |
|---|---|---|
| Stability | Production-proven | Released Feb 2025, still maturing |
| Config format | `tailwind.config.ts` (existing) | CSS-based `@theme` (full rewrite) |
| Plugin ecosystem | All plugins work | Many plugins incompatible |
| Migration effort | Zero | Rewrite 273-line config + all component classes |
| Risk for presentation | None | Breaking changes likely |

**Verdict:** Stay on Tailwind 3.4. The existing 273-line config is a sophisticated design system — migrating to v4 syntax is wasted effort with zero visual payoff.

**What NOT to use:**

| Library | Why not |
|---|---|
| **tailwindcss-glassmorphism** (npm) | Abandoned (last update 2022), only adds 2 utility classes you can write yourself |
| **daisyUI** | Opinionated component library that would conflict with existing design tokens |
| **Tailwind v4** | Config migration cost with no visual benefit for presentation timeline |
| **CSS Modules** | Would fragment the existing Tailwind utility approach |

---

## 3. Chart Library Upgrade

### Recommendation: **Recharts 2.15+ (keep and upgrade)**

```
npm install recharts@^2.15
```

| Criterion | Recharts 2.15 | Nivo | Victory | Tremor |
|---|---|---|---|---|
| React-native feel | Declarative components | Declarative | Declarative | Declarative |
| Animation support | Built-in, customizable | Built-in | Built-in | Limited (wrapper) |
| Real-time updates | Smooth with key management | Smooth | Stutters on frequent updates | Poor |
| Customization | Full SVG access | Theme-based | Verbose | Minimal |
| Bundle size | ~45 KB | ~90 KB (per chart type!) | ~65 KB | ~180 KB (ships Recharts internally!) |
| Learning curve | Already known (in codebase) | Medium | High | Low |
| Glassmorphism styling | Full SVG/CSS control | Theme tokens | CSS override | Hard — opinionated |

**Why keep Recharts:**

1. **Already integrated** — all four pages (Dashboard, Training, Analytics, RoutePlanner) use Recharts. Replacing means rewriting every chart.
2. **Recharts 2.15** adds improved animation system with configurable easing, `animationDuration`, `animationEasing` on every component.
3. **SVG base** — you can apply glassmorphism effects directly: `<defs><filter>` for blur, transparent fills, gradient strokes matching your cyan/amber palette.
4. **Custom tooltip** — glassmorphic tooltip: `<Tooltip content={<GlassTooltip />} />` with backdrop-blur is easy.
5. **Responsive** — `<ResponsiveContainer>` already handles resize.

**Upgrade additions for presentation quality:**

```
npm install recharts@^2.15 d3-ease@^3.0
```

- Use `d3-ease` timing functions in Recharts' `animationEasing` prop for spring-like chart entrances
- Custom `<GlassTooltip>` component with `backdrop-filter: blur(16px)` and frosted border
- Animated number transitions using Framer Motion's `useMotionValue` + `useTransform` for stat counters

**What NOT to use:**

| Library | Why not |
|---|---|
| **Tremor** | Ships Recharts internally (doubles bundle size). Opinionated styling conflicts with custom glassmorphism design system. |
| **Nivo** | Each chart type is a separate package (~90 KB each). Importing 4 chart types = ~360 KB. Overkill. |
| **Victory** | Verbose API, weaker animation, no significant advantage over Recharts for this use case. |
| **Chart.js / react-chartjs-2** | Canvas-based — cannot apply CSS backdrop-filter for glassmorphism. |
| **Apache ECharts** | Extremely heavy (~800 KB), imperative API, poor React integration. |
| **Visx** | Low-level D3 wrapper — you'd rebuild every chart from primitives. |

---

## 4. Map Library

### Recommendation: **MapLibre GL JS 5.x + react-map-gl 8.x**

```
npm install maplibre-gl@^5.1 react-map-gl@^8.0 @maplibre/maplibre-gl-style-spec
```

| Criterion | Leaflet (current) | MapLibre GL JS 5 | Deck.gl |
|---|---|---|---|
| Rendering | SVG/DOM | **WebGL/GPU** | WebGL |
| Performance (1000+ routes) | Sluggish | Smooth 60fps | Smooth 60fps |
| Vector tiles | No (raster only) | Yes (free) | Yes |
| 3D terrain | No | Yes | Yes |
| Animated routes | Manual polyline | Native line-gradient animation | Native |
| Custom styling | CSS hacks | Full JSON style spec | Programmatic |
| Dark mode map | Tile swap (flicker) | Instant style switch | Programmatic |
| Bundle size | ~40 KB | ~280 KB | ~400 KB + MapLibre |
| Learning curve | Low | Medium | High |
| React wrapper | react-leaflet | **react-map-gl** (Uber) | react-map-gl (same) |

**Why MapLibre GL wins for this project:**

1. **GPU-accelerated route rendering** — The EV system visualizes routes with traffic overlays. Leaflet chokes on 50+ animated polylines; MapLibre handles thousands via WebGL.
2. **Animated route drawing** — Native `line-dasharray` animation creates "route being drawn" effect. Combined with `line-gradient`, routes can show energy consumption as color gradient (green → red).
3. **Dark mode maps** — Switch between light/dark map styles instantly without re-downloading tiles. Matches your `surface-950` dark background.
4. **Free vector tiles** — Use OpenFreeMap, Protomaps, or MapTiler free tier. No API key needed for basic tiles.
5. **3D building extrusion** — For presentation wow factor: show EV routing through a 3D city view with terrain.
6. **`react-map-gl`** — Same wrapper used by Uber, Airbnb. Clean declarative API: `<Map>`, `<Source>`, `<Layer>`, `<Marker>`.

**Route animation technique:**

```tsx
// Animated route with energy gradient
<Source type="geojson" data={routeGeoJSON}>
  <Layer
    type="line"
    paint={{
      'line-color': ['interpolate', ['linear'], ['line-progress'],
        0, '#10B981',  // success-500 (full charge)
        0.5, '#FBBF24', // accent-400 (mid charge)
        1, '#EF4444'   // danger-500 (low charge)
      ],
      'line-width': 4,
      'line-opacity': 0.85,
    }}
    layout={{ 'line-cap': 'round' }}
  />
</Source>
```

**Migration from Leaflet:**

- `NetworkMap.tsx` is the only map component — single-file migration
- `react-map-gl` API is similar: `<Map>` replaces `<MapContainer>`, `<Marker>` stays the same
- GeoJSON sources work identically

**What NOT to use:**

| Library | Why not |
|---|---|
| **Leaflet (current)** | DOM-based rendering cannot handle animated route visualization at scale. No dark mode map support. No vector tiles. Feels dated for a 2026 presentation. |
| **Deck.gl** | Requires MapLibre underneath anyway (adds ~400 KB on top). Designed for big-data geospatial (millions of points). Overkill for route visualization. Complex layer system. |
| **Mapbox GL JS** | Proprietary license since v2.0. Requires paid API key. MapLibre is the open-source fork with identical API. |
| **Google Maps** | API key required, expensive, limited styling, no glassmorphism overlay control. |
| **OpenLayers** | Enterprise GIS tool, extremely complex API, poor React integration. |

**Free tile sources (no API key):**

| Provider | URL | Style |
|---|---|---|
| OpenFreeMap | `https://tiles.openfreemap.org/styles/liberty` | Clean, neutral |
| Protomaps (free tier) | `https://api.protomaps.com/tiles/v4.json` | Customizable |
| MapTiler (free tier) | Requires key but free up to 100K tiles/month | Premium styles |

---

## 5. Glassmorphism Design Token System

### Recommendation: **Extend existing Tailwind config (no new library)**

The project's `tailwind.config.ts` is already 273 lines with a production-grade design token system: custom color scales (primary/accent/surface/semantic), multi-layered shadows, glow effects, spring-like timing functions, and 18 keyframe animations. This is an unusually mature setup.

### Token Architecture

```
Design Tokens (tailwind.config.ts)
├── Color tokens ✅ EXISTS: primary (cyan), accent (amber), surface (slate), semantic
├── Shadow tokens ✅ EXISTS: card, elevated, glow-sm/glow/glow-lg, btn-primary
├── Animation tokens ✅ EXISTS: 18 keyframes, spring timing functions
├── Radius tokens ✅ EXISTS: 4xl, 5xl  
├── Glass tokens ❌ ADD: backdrop-blur scale, glass bg/border colors
├── Spacing tokens ✅ EXISTS: default Tailwind scale
└── Typography tokens ✅ EXISTS: Inter + JetBrains Mono
```

### What to add (minimal diff):

**1. Glass-specific backdrop blur scale** — extend `backdropBlur`  
**2. Glass background colors** — semi-transparent white/dark fills  
**3. Glass border colors** — subtle white borders at low opacity  
**4. Noise texture** — SVG noise overlay for realistic frosted glass  

### Noise texture implementation:

```css
/* In index.css — adds subtle grain to glass surfaces */
.glass-noise::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");
  pointer-events: none;
  mix-blend-mode: overlay;
}
```

### Color psychology for EV routing glassmorphism:

| Element | Token | Rationale |
|---|---|---|
| Card backgrounds | `glass` (white 12% opacity) | Depth without obscuring dark surface |
| Active route card | `glass-heavy` + `glow-sm` (primary) | Cyan glow = electricity, energy |
| Charging station markers | `accent-400` glow | Amber = energy, warmth |
| Training progress | `surface-850` + `glass` overlay | Subtle layering shows depth |
| Modals/drawers | `glass-dark-heavy` + `backdrop-blur-glass-xl` | Maximum blur for focus isolation |

---

## 6. ML Stack Improvements

### 6a. TensorFlow / Keras Upgrade

#### Recommendation: **TensorFlow 2.18.0 + Keras 3.8**

```
tensorflow==2.18.0
keras==3.8.0
```

| Criterion | TF 2.14 (current) | TF 2.18 + Keras 3.8 |
|---|---|---|
| Keras version | Keras 2 (bundled) | **Keras 3** (standalone, multi-backend) |
| Mixed precision | Manual | `keras.mixed_precision.set_global_policy("mixed_float16")` |
| XLA compilation | Opt-in | Default for supported ops |
| Apple Silicon (M-series) | Poor | **Native Metal acceleration** |
| Windows GPU | CUDA only | CUDA + DirectML |
| Model format | `.h5` / `.keras` | **`.keras` only** (standardized) |
| GAN training | Manual loop | `keras.Model` with custom `train_step` |
| Determinism | `tf.random.set_seed` | `keras.utils.set_random_seed` (global) |

**Migration impact on ML pipeline:**

| File | Changes needed |
|---|---|
| `src/traffic_generator.py` (SG-GAN) | Update `import keras` → standalone keras. Update `.h5` saves to `.keras`. |
| `src/gnn_route_generator.py` (GNN-GAN) | Same import migration. Weight files: `.weights.h5` stays (Keras 3 supports this). |
| `src/q_learning_agent.py` (DQN) | Update `keras` imports. DQN model uses Sequential — API unchanged. |
| `src/environment.py` | No changes (Gymnasium, no TF). |
| `requirements-api.txt` | `tensorflow==2.18.0` (replaces 2.14.0) |
| `requirements.txt` | `tensorflow>=2.18.0` |

**Keras 3 migration checklist:**

1. Replace `from tensorflow import keras` → `import keras`
2. Replace `from tensorflow.keras.X` → `from keras.X`
3. All models save as `.keras` format (not `.h5`)
4. `model.compile(jit_compile=True)` for XLA speed boost
5. Set `keras.config.set_backend("tensorflow")` explicitly

### 6b. GAN Training Improvements

#### Recommendation: **Spectral Normalization + Gradient Penalty + Progressive Training**

These are the three highest-impact, lowest-effort improvements for the SG-GAN and GNN Route GAN:

| Technique | What it does | Implementation effort |
|---|---|---|
| **Spectral Normalization** | Stabilizes discriminator by constraining Lipschitz constant | `keras.layers.SpectralNormalization(layer)` — wrap existing Dense/Conv layers |
| **Gradient Penalty (WGAN-GP)** | Replaces weight clipping, better convergence | ~20 lines in custom `train_step` |
| **Learning Rate Scheduling** | Cosine decay prevents late-training oscillation | `keras.optimizers.schedules.CosineDecay` |
| **EMA Generator Weights** | Smooths generator output over training | `keras.callbacks.BackupAndRestore` + manual EMA |

**Why NOT these fancier techniques:**

| Technique | Why skip |
|---|---|
| **Diffusion models** | Would replace entire GAN architecture — too much work, not better for structured traffic data |
| **StyleGAN3** | Designed for images, not tabular/graph traffic data |
| **Wasserstein distance** | Already effectively achieved via gradient penalty (WGAN-GP) |
| **Progressive growing** | Only useful for high-resolution image GANs, not traffic tensors |

### 6c. Reinforcement Learning

#### Recommendation: **Gymnasium 1.1.0 + Stable-Baselines3 2.4**

```
gymnasium==1.1.0
stable-baselines3==2.4.0
```

| Current | Upgraded | Benefit |
|---|---|---|
| Gymnasium 0.29.1 | **1.1.0** | New API stability, better `VectorEnv`, truncation/termination separation |
| Custom DQN (manual) | **SB3 DQN** | Proven implementation, automatic replay buffer, target network, logging |
| Manual Q-table | **SB3 PPO** | Better sample efficiency than DQN for continuous-ish routing |

**Why Stable-Baselines3:**

- Your `q_learning_agent.py` (702 lines) reimplements DQN from scratch. SB3 provides battle-tested DQN/PPO/A2C with TensorBoard logging, checkpointing, and evaluation callbacks.
- Keeps PyTorch for RL (already in `requirements-api.txt` as `torch==2.1.0`). No conflict with TF for GANs.
- `SB3` integrates directly with your `EVRoutingEnvironment(gymnasium.Env)`.

**What NOT to use:**

| Library | Why not |
|---|---|
| **RLlib (Ray)** | Massive dependency tree (~500 MB). Designed for distributed training. Overkill for single-agent EV routing. |
| **CleanRL** | Educational, single-file implementations. Less maintained than SB3. |
| **TF-Agents** | TensorFlow-based RL. Would fight with PyTorch DQN. Deprecated priority at Google. |

---

## 7. Testing Stack

### 7a. Python Testing

#### Recommendation: **pytest 8.3 + pytest-asyncio 0.25 + httpx**

```
pytest==8.3.4
pytest-asyncio==0.25.3
httpx==0.28.1
anyio==4.8.0
```

| Issue | Solution |
|---|---|
| **Windows `asyncio` event loop** | `pytest-asyncio` 0.25+ defaults to `asyncio_mode = "auto"` — no more `SelectorEventLoop` vs `ProactorEventLoop` issues |
| **FastAPI async testing** | Use `httpx.AsyncClient` + `ASGITransport` instead of `TestClient` (sync). Current `tests/test_api.py` uses sync `TestClient` — still works but async tests are faster. |
| **Fixture scoping** | `@pytest.fixture(scope="session")` for expensive ML model loading |

**pytest configuration** (add to `pyproject.toml`):

```toml
[tool.pytest.ini_options]
asyncio_mode = "auto"
testpaths = ["tests", "src"]
python_files = ["test_*.py"]
markers = [
    "slow: marks tests as slow (deselect with '-m \"not slow\"')",
    "gpu: marks tests requiring GPU",
]
filterwarnings = [
    "ignore::DeprecationWarning:tensorflow.*",
]
```

**Windows-specific fix:**  
pytest-asyncio 0.25+ on Windows automatically uses `ProactorEventLoop`. No manual `event_loop_policy` fixture needed. If issues persist:

```python
# conftest.py
import sys
if sys.platform == "win32":
    import asyncio
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
```

### 7b. Frontend Testing

#### Recommendation: **Vitest 4.x (keep current) + @testing-library/react 16.x**

Already at Vitest 4.0.18 — this is current. No changes needed.

| Tool | Version | Purpose |
|---|---|---|
| Vitest | 4.0.18 ✅ | Test runner (already installed) |
| @testing-library/react | 16.3.2 ✅ | Component testing (already installed) |
| @testing-library/user-event | 14.6.1 ✅ | User interaction simulation (already installed) |
| jsdom | 28.0.0 ✅ | DOM environment (already installed) |
| Playwright | 1.58.2 ✅ | E2E testing (already installed) |

**Vitest best practices for this project:**

1. **Mock MapLibre GL** — After migrating from Leaflet, add `vi.mock('maplibre-gl')` in test setup (WebGL not available in jsdom)
2. **Mock Framer Motion** — `vi.mock('framer-motion', () => ({ motion: { div: 'div' }, AnimatePresence: ({ children }) => children }))` for unit tests that don't need animation
3. **Snapshot tests** — Use `toMatchInlineSnapshot()` for glassmorphism component class strings
4. **Coverage threshold** — Add to `vitest.config.ts`: `coverage: { thresholds: { lines: 70 } }`

**What NOT to use:**

| Tool | Why not |
|---|---|
| **Jest** | Vitest is already installed and configured. Jest would be a downgrade (slower, needs more config). |
| **Cypress** | Playwright already handles E2E. Cypress has worse multi-tab and iframe support. |
| **Happy DOM** | jsdom is already configured and more battle-tested. |

---

## 8. Consolidated Upgrade Plan

### Package changes summary

#### Frontend (`package.json`)

| Action | Package | Version | Reason |
|---|---|---|---|
| **ADD** | `framer-motion` | `^12.4` | Animation system |
| **ADD** | `maplibre-gl` | `^5.1` | GPU-accelerated maps |
| **ADD** | `react-map-gl` | `^8.0` | React wrapper for MapLibre |
| **ADD** | `d3-ease` | `^3.0` | Chart animation easing |
| **UPGRADE** | `recharts` | `^2.15` | Improved animations |
| **UPGRADE** | `tailwindcss` | `^3.4` | Latest v3 utilities |
| **UPGRADE** | `zustand` | `^5.0` | Improved TS types, smaller bundle |
| **REMOVE** | `leaflet` | — | Replaced by MapLibre |
| **REMOVE** | `react-leaflet` | — | Replaced by react-map-gl |
| **REMOVE** | `@types/leaflet` | — | No longer needed |

**Estimated frontend bundle impact:** +~300 KB (MapLibre) + ~17 KB (Framer Motion) − ~40 KB (Leaflet) = **+~277 KB** (acceptable for presentation app, offset by WebGL performance gains)

#### Backend (`requirements-api.txt`)

| Action | Package | Version | Reason |
|---|---|---|---|
| **UPGRADE** | `tensorflow` | `2.18.0` | Keras 3, XLA, mixed precision |
| **ADD** | `keras` | `3.8.0` | Standalone Keras 3 |
| **UPGRADE** | `gymnasium` | `1.1.0` | Stable API, truncation fix |
| **ADD** | `stable-baselines3` | `2.4.0` | Battle-tested DQN/PPO |
| **UPGRADE** | `fastapi` | `0.115.8` | Latest with Pydantic v2 optimizations |
| **UPGRADE** | `uvicorn` | `0.34.0` | HTTP/2, performance |
| **UPGRADE** | `torch` | `2.5.1` | Latest stable for SB3 |

#### Dev dependencies (`requirements-dev.txt`)

| Action | Package | Version | Reason |
|---|---|---|---|
| **UPGRADE** | `pytest` | `8.3.4` | Latest stable |
| **ADD** | `pytest-asyncio` | `0.25.3` | Windows async fix |
| **ADD** | `httpx` | `0.28.1` | Async FastAPI testing |

---

## 9. Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| MapLibre migration breaks NetworkMap.tsx | Medium | Single component, clean replacement. Keep Leaflet branch as fallback. |
| TF 2.14 → 2.18 breaks model loading | Low | `.keras` format backward-compatible. `.h5` weights still loadable. Test with `model.load_weights()` first. |
| Keras 3 import changes | Low | Mechanical find-replace: `from tensorflow.keras` → `from keras`. Run tests. |
| Framer Motion + Tailwind animation conflict | Very Low | They operate at different levels (JS orchestration vs CSS keyframes). No conflict. |
| SB3 replaces custom DQN behavior | Medium | Keep `q_learning_agent.py` as reference. SB3 DQN is a superset. Test reward convergence. |
| Tailwind v4 pressure | Low | v3.4 is LTS-equivalent. No forced upgrade before presentation. |

---

## 10. Decision Summary

| Area | Decision | Confidence |
|---|---|---|
| Animation | **Framer Motion 12** | ★★★★★ — Industry standard for React motion |
| Glassmorphism | **Custom Tailwind tokens (no plugin)** | ★★★★★ — Config already 90% there |
| Charts | **Recharts 2.15 (keep + upgrade)** | ★★★★☆ — Migration cost of alternatives not justified |
| Maps | **MapLibre GL 5 + react-map-gl 8** | ★★★★★ — WebGL is non-negotiable for route animation |
| Design system | **Extend existing tailwind.config.ts** | ★★★★★ — Already has premium token architecture |
| ML framework | **TF 2.18 + Keras 3.8** | ★★★★☆ — Breaking import changes worth perf gains |
| RL framework | **SB3 2.4 + Gymnasium 1.1** | ★★★★☆ — Replaces 700 lines of manual DQN |
| Python testing | **pytest 8.3 + pytest-asyncio 0.25** | ★★★★★ — Direct Windows fix |
| JS testing | **Vitest 4 (keep)** | ★★★★★ — Already current |
