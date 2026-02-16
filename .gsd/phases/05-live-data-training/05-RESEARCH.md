# Phase 05: Live Data & Training - Research

**Researched:** 2026-02-16
**Domain:** Real-time SSE streaming, animated charts, Zustand state management, React hooks
**Confidence:** HIGH (based on direct codebase analysis + established library patterns)

## Summary

Phase 05 connects the already-built backend SSE streaming (`/api/training/stream`) and training pipeline to a rich frontend experience: animated loss/reward curves that build live during ML training, a 7-step pipeline stepper, a time-of-day traffic slider, and auto-reconnect with exponential backoff.

The backend SSE infrastructure is **already complete** (Phase 02) — the async generator in `training.py` polls `AppState.training_status` every 500ms and yields `progress`/`complete`/`stopped` events. However, it currently only emits `{is_training, progress, current_step, metrics}` — it does **NOT** stream per-epoch loss values or per-episode reward values. This is the **critical gap**: the backend pipeline runs GAN training and Q-learning in a ThreadPoolExecutor thread, and the loss/reward data stays inside the Python objects (`gan.history`, `episode_rewards`). Phase 05 must bridge this gap.

The frontend Training page (Phase 03) already renders a 7-step pipeline stepper and polling-based progress. Phase 05 replaces polling with SSE, adds animated Recharts curves, and introduces the time-of-day traffic slider.

**Primary recommendation:** Extend `AppState.training_status` to include `loss_history` and `reward_history` arrays that the sync pipeline thread appends to as training progresses. The SSE generator already polls this dict — no new endpoint needed. Frontend consumes via a `useSSE` hook that streams into Zustand, and Recharts `<LineChart>` renders incrementally.

## Standard Stack

### Core (Already Installed)

| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| `recharts` | ^2.10.0 | React charting library | ✅ Installed, used in Analytics.tsx |
| `zustand` | ^4.4.1 | State management | ✅ Installed, store exists |
| `framer-motion` | ^11.18.2 | Animation | ✅ Installed, used throughout |
| `sse-starlette` | >=2.0 | Backend SSE | ✅ Installed, used in training.py |
| `react` | ^18.2.0 | UI framework | ✅ Installed |

### Supporting (No New Dependencies Needed)

| Library | Purpose | Notes |
|---------|---------|-------|
| Browser `EventSource` API | SSE client | Built into all modern browsers, no npm package needed |
| `lucide-react` | Icons | ✅ Already installed |
| Tailwind CSS | Styling | ✅ Already configured |

### Alternatives Considered

| Instead of | Could Use | Why NOT |
|------------|-----------|---------|
| Browser `EventSource` | `eventsource` npm polyfill | Not needed — native API sufficient for modern browsers; project targets modern Chrome/Firefox |
| Browser `EventSource` | `fetch` + `ReadableStream` | EventSource is simpler for SSE, handles reconnect natively; ReadableStream only needed for custom headers (not our case) |
| Custom SSE hook | `use-sse` npm package | Tiny package with low maintenance; trivial to write ourselves (~30 lines) |
| Recharts | `visx`, `d3` | Recharts already installed and used in Analytics; switching adds risk for no gain |

**Installation:** No new packages needed. Zero dependency additions.

## Architecture Patterns

### Recommended File Structure

```
frontend/src/
├── hooks/
│   ├── useSSE.ts                  # NEW: EventSource hook with reconnect
│   └── useTrainingStream.ts       # NEW: Training-specific SSE → Zustand bridge
├── store/
│   └── store.ts                   # MODIFY: Add training stream slice
├── pages/
│   └── Training.tsx               # MODIFY: Replace polling with SSE, add charts
├── components/
│   ├── training/                  # NEW: Training sub-components
│   │   ├── LossCurveChart.tsx     # Animated GAN loss curves (Recharts)
│   │   ├── RewardCurveChart.tsx   # Animated RL reward curve (Recharts)
│   │   ├── PipelineStepper.tsx    # Extracted 7-step pipeline (already exists inline)
│   │   └── TrafficSlider.tsx      # Time-of-day traffic heatmap with slider
│   └── dashboard/
│       └── AutoRefresh.tsx        # NEW: 30s polling wrapper for dashboard

backend/app/
├── routers/
│   └── training.py                # MODIFY: Enrich SSE event data
├── services/
│   └── training_service.py        # MODIFY: Capture per-epoch/episode metrics
├── state.py                       # MODIFY: Extend training_status schema
└── routers/
    └── analytics.py               # MODIFY: Add temporal traffic endpoint
```

### Pattern 1: useSSE Hook with Auto-Reconnect

**What:** A reusable React hook that wraps the browser `EventSource` API with exponential backoff reconnection and Zustand integration.

**When to use:** Any component that needs to consume SSE events from the backend.

**Key design decisions:**
- Use native `EventSource` (not fetch+ReadableStream) because our SSE endpoint doesn't require custom headers (no auth on training stream)
- `EventSource` has **built-in reconnection** with configurable `retry` field from server, but we add our own exponential backoff for more control
- The hook should NOT store data in local state — it should push directly into Zustand so any component can subscribe to training data

**Example:**
```typescript
// hooks/useSSE.ts
import { useEffect, useRef, useCallback } from 'react';

interface UseSSEOptions {
  url: string;
  onMessage: (event: MessageEvent) => void;
  onError?: (event: Event) => void;
  onOpen?: () => void;
  enabled?: boolean;
  maxRetries?: number;
  baseDelay?: number;  // ms, default 1000
  maxDelay?: number;   // ms, default 30000
}

export function useSSE({
  url, onMessage, onError, onOpen,
  enabled = true, maxRetries = 10,
  baseDelay = 1000, maxDelay = 30000,
}: UseSSEOptions) {
  const esRef = useRef<EventSource | null>(null);
  const retriesRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const connect = useCallback(() => {
    if (esRef.current) esRef.current.close();

    const es = new EventSource(url);
    esRef.current = es;

    es.onopen = () => {
      retriesRef.current = 0; // reset on success
      onOpen?.();
    };

    es.onmessage = onMessage;

    // Listen for named events too
    es.addEventListener('progress', onMessage);
    es.addEventListener('complete', onMessage);
    es.addEventListener('stopped', onMessage);

    es.onerror = (evt) => {
      onError?.(evt);
      es.close();

      if (retriesRef.current < maxRetries) {
        const delay = Math.min(
          baseDelay * Math.pow(2, retriesRef.current),
          maxDelay
        );
        retriesRef.current++;
        timerRef.current = setTimeout(connect, delay);
      }
    };
  }, [url, onMessage, onError, onOpen, maxRetries, baseDelay, maxDelay]);

  useEffect(() => {
    if (!enabled) return;
    connect();
    return () => {
      esRef.current?.close();
      clearTimeout(timerRef.current);
    };
  }, [enabled, connect]);

  const close = useCallback(() => {
    esRef.current?.close();
    clearTimeout(timerRef.current);
  }, []);

  return { close };
}
```

### Pattern 2: Streaming SSE Events into Zustand

**What:** The `useTrainingStream` hook bridges SSE events to a Zustand training slice, so Recharts components re-render reactively.

**Key insight:** Zustand's `set()` is synchronous and batched in React 18 — calling it from an SSE `onmessage` handler triggers a single re-render per event, which is efficient enough at 2 events/second (the SSE polls every 500ms).

**Example:**
```typescript
// hooks/useTrainingStream.ts
import { useCallback } from 'react';
import { useSSE } from './useSSE';
import { useSystemStore } from '../store/store';

const SSE_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/training/stream`;

export function useTrainingStream(enabled: boolean) {
  const updateTraining = useSystemStore((s) => s.updateTrainingFromSSE);
  const setSSEConnected = useSystemStore((s) => s.setSSEConnected);

  const onMessage = useCallback((event: MessageEvent) => {
    const data = JSON.parse(event.data);
    updateTraining(data);
  }, [updateTraining]);

  const onOpen = useCallback(() => setSSEConnected(true), [setSSEConnected]);
  const onError = useCallback(() => setSSEConnected(false), [setSSEConnected]);

  return useSSE({
    url: SSE_URL,
    onMessage,
    onOpen,
    onError,
    enabled,
    maxRetries: 10,
    baseDelay: 1000,
    maxDelay: 30000,
  });
}
```

### Pattern 3: Recharts Real-Time Streaming

**What:** Efficiently append data points to Recharts `<LineChart>` without full re-render.

**Key insight:** Recharts re-renders the entire chart when data changes (it's declarative, not imperative like D3). However, with React 18 batching and `isAnimationActive={false}` on old points, performance is acceptable up to ~1000 data points. For our use case (100 GAN epochs + 500 RL episodes), this is well within bounds.

**Optimization strategies:**
1. **Don't disable animation entirely** — use `animationDuration={300}` for the "building live" effect
2. **Use `isAnimationActive` per-line** — animate only the newest segment
3. **Downsample if needed** — for RL with 500+ episodes, show every 5th point in the chart
4. **`useMemo` the data array** — avoid creating new arrays on every render unless data length changed

**Example:**
```typescript
// components/training/LossCurveChart.tsx
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useMemo } from 'react';

interface LossPoint {
  epoch: number;
  g_loss: number;
  d_loss_real: number;
  d_loss_fake: number;
}

export function LossCurveChart({ data }: { data: LossPoint[] }) {
  // Only recalculate when data length changes
  const chartData = useMemo(() => data, [data.length]);

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" strokeOpacity={0.2} />
        <XAxis dataKey="epoch" tick={{ fontSize: 11, fill: '#64748b' }} />
        <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
        <Tooltip />
        <Legend />
        <Line
          type="monotone"
          dataKey="g_loss"
          stroke="#F59E0B"
          strokeWidth={2}
          dot={false}
          name="Generator Loss"
          animationDuration={300}
          isAnimationActive={true}
        />
        <Line
          type="monotone"
          dataKey="d_loss_real"
          stroke="#14A8C0"
          strokeWidth={2}
          dot={false}
          name="Disc. Real"
          animationDuration={300}
        />
        <Line
          type="monotone"
          dataKey="d_loss_fake"
          stroke="#EF4444"
          strokeWidth={2}
          dot={false}
          name="Disc. Fake"
          animationDuration={300}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
```

### Pattern 4: Backend Metrics Enrichment

**What:** Extend `AppState.training_status` to include per-epoch loss and per-episode reward arrays.

**Critical insight:** The training pipeline runs in a `ThreadPoolExecutor` thread (sync Python). The `_run_pipeline` method calls `sys.step3_train_gan(traffic_data)` which internally runs `self.gan.train(...)`. After that call returns, `self.gan.history` contains `{'g_loss': [...], 'd_loss_real': [...], 'd_loss_fake': [...]}`. Similarly, `sys.step5_train_agent()` returns `episode_rewards, episode_lengths`.

**The approach:** After each training step completes, copy the metrics arrays into `AppState.training_status["loss_history"]` and `AppState.training_status["reward_history"]`. The SSE generator already polls this dict.

**For LIVE per-epoch streaming (not just post-completion):** We need to either:
1. **Option A (recommended):** Add a callback mechanism to `SGGANTrafficGenerator.train()` that fires after each epoch
2. **Option B:** Have the pipeline thread periodically copy `self.gan.history` into AppState during training

Option A is cleaner and gives true per-epoch granularity.

**Example (Option A — callback in GAN training):**
```python
# In traffic_generator.py SGGANTrafficGenerator.train():
def train(self, real_data, epochs=100, batch_size=32, verbose=True, epoch_callback=None):
    ...
    for epoch in range(epochs):
        ...
        # Record history
        self.history['d_loss_real'].append(np.mean(epoch_d_loss_real))
        self.history['d_loss_fake'].append(np.mean(epoch_d_loss_fake))
        self.history['g_loss'].append(np.mean(epoch_g_loss))

        # NEW: fire callback with current history
        if epoch_callback:
            epoch_callback(epoch + 1, epochs, dict(self.history))
    ...

# In training_service.py:
def _run_pipeline(self, sys):
    ...
    def on_gan_epoch(epoch, total, history):
        self.state.training_status["loss_history"] = {
            "g_loss": history["g_loss"],
            "d_loss_real": history["d_loss_real"],
            "d_loss_fake": history["d_loss_fake"],
        }
        self.state.training_status["gan_epoch"] = epoch
        self.state.training_status["gan_total_epochs"] = total

    sys.step3_train_gan(traffic_data, epoch_callback=on_gan_epoch)
```

**Similarly for Q-Learning** — add a callback to `train_q_learning_agent()` that fires after each episode.

### Pattern 5: Time-of-Day Traffic Slider

**What:** A range slider (0-23 hours) that requests traffic data for a specific hour and renders it as a heatmap overlay.

**Backend analysis:** The current `/api/traffic-patterns?time_step=12` endpoint generates 5 random traffic scenarios using `gan.generate_traffic_scenarios()`. The generated data shape is `(n_samples, num_roads, time_steps=24)` — meaning it already has 24 time-step columns. The frontend needs to:
1. Call the endpoint once to get full 24h data
2. Use the slider to select which time_step column to visualize
3. Render as a grid heatmap (color intensity = traffic level)

**Backend modification needed:** The current endpoint returns flattened values (`t.flatten().tolist()[:20]`). For a proper heatmap, it should return the full grid-shaped data:
```python
@router.get("/traffic-patterns/temporal")
async def get_temporal_traffic(request: Request, state: AppState = Depends(get_state)):
    """Return traffic data with full temporal dimension for heatmap slider."""
    traffic = state.system.gan.generate_traffic_scenarios(n_samples=1)
    # Shape: (1, num_roads, 24) → return as grid
    return ok({
        "grid_size": state.system.config['grid_size'],
        "time_steps": 24,
        "traffic": traffic[0].tolist(),  # (num_roads, 24)
    })
```

Frontend renders the `num_roads × 1` slice at the selected time step as a colored grid.

### Anti-Patterns to Avoid

- **Polling AND SSE simultaneously:** The current Training.tsx uses `setInterval` polling. Phase 05 must remove that and use SSE exclusively, with polling only as a fallback.
- **Storing SSE data in component state:** Data should go into Zustand so any component (Training page, Dashboard, small status indicators) can access it.
- **Re-creating EventSource on every render:** The hook must use `useRef` for the EventSource instance.
- **Unbounded data arrays:** Cap loss_history at a reasonable size (e.g., 1000 points) to prevent memory issues on very long training runs.
- **Blocking the SSE generator:** The async generator must never do I/O — it only reads from in-memory AppState.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SSE client | Custom fetch+ReadableStream parser | Browser `EventSource` API | Handles reconnect, event parsing, `text/event-stream` content type automatically |
| Chart library | Canvas/SVG from scratch | `recharts` (already installed) | Declarative, React-native, handles axes/tooltips/legends |
| Exponential backoff | Manual retry logic | Simple `Math.min(base * 2^n, max)` formula | 3 lines of code, well-understood pattern |
| State management | React Context for training data | Zustand (already installed) | Zustand avoids re-render cascade; Context would re-render entire tree |
| Animation | Manual requestAnimationFrame | Framer Motion `animate` (already installed) | Consistent with existing animation system |

## Common Pitfalls

### Pitfall 1: EventSource Only Supports GET

**What goes wrong:** Developer tries to POST training config via EventSource.
**Why it happens:** `EventSource` API only supports GET requests, no custom headers, no body.
**How to avoid:** Use two separate flows: (1) `POST /api/start-training` via axios, (2) `GET /api/training/stream` via EventSource. This is already the pattern in the codebase.
**Warning signs:** Trying to pass training config as query params to the SSE endpoint.

### Pitfall 2: EventSource Named Events vs `onmessage`

**What goes wrong:** Events sent as `event: progress\ndata: {...}` but handled with `es.onmessage` which only fires for unnamed events.
**Why it happens:** The backend uses named events (`yield {"event": "progress", ...}`), but `onmessage` only catches events without an `event:` field.
**How to avoid:** Use `es.addEventListener('progress', handler)` for each named event type. The current backend sends `progress`, `complete`, `stopped`, `idle` events.
**Warning signs:** SSE connection opens but no data appears in the UI.

### Pitfall 3: Stale Closure in SSE Callbacks

**What goes wrong:** The `onmessage` callback captures an old Zustand `set` reference, causing state updates to overwrite each other.
**Why it happens:** React closures capture values at render time. If the callback is recreated on every render, it can cause the EventSource to be reconnected.
**How to avoid:** Use `useCallback` with stable Zustand selectors. Zustand's `set` function is stable across renders (reference equality), so `useCallback([set])` won't cause reconnects.

### Pitfall 4: Thread-Safety in AppState Updates

**What goes wrong:** The sync training thread writes to `training_status` dict while the async SSE generator reads it, potentially getting partial updates.
**Why it happens:** Python dicts are NOT thread-safe for concurrent read/write of the same key.
**How to avoid:** The current code is already acceptable because: (a) dict value assignment in CPython is atomic due to the GIL, (b) the SSE generator reads the entire dict reference, not individual keys. But for safety, consider using `training_status = {**new_dict}` atomic replacement rather than `training_status["key"] = value` mutations. For this project's scope, the current approach is fine.
**Warning signs:** Occasional malformed JSON in SSE events.

### Pitfall 5: Recharts Performance with Large Datasets

**What goes wrong:** Chart becomes sluggish when RL training streams 500+ episode rewards.
**Why it happens:** Recharts re-renders the entire SVG on each data update.
**How to avoid:** (a) Downsample: show every Nth point for large datasets. (b) Disable SVG animation for old points with `isAnimationActive={data.length < 100}`. (c) Use `useMemo` on the data array. (d) Set `animationDuration` to a small value (200-300ms).
**Warning signs:** Janky/dropped frames during RL training visualization.

### Pitfall 6: SSE Connection Not Closed on Unmount

**What goes wrong:** Navigating away from Training page leaves SSE connection open, wasting backend resources.
**Why it happens:** Missing cleanup in `useEffect`.
**How to avoid:** The `useSSE` hook MUST return a cleanup function that calls `es.close()`. The `useEffect` return must invoke this.

### Pitfall 7: Polling Fallback vs SSE — Race Condition

**What goes wrong:** Both SSE and polling fallback run simultaneously after a reconnect, causing duplicate updates.
**Why it happens:** SSE reconnects but the polling fallback timer from the error wasn't cleared.
**How to avoid:** Use a single state variable (`sseConnected`) to gate: if SSE is connected, disable polling. On SSE error, start polling. On SSE reconnect, stop polling.

## Code Examples

### Backend: Enriched SSE Event Data

The current SSE yields basic status. Enriched version:
```python
# In training.py event_generator():
async def event_generator():
    last_progress = -1
    last_loss_len = 0
    last_reward_len = 0
    while True:
        status = state.training_status
        progress = status["progress"]
        loss_history = status.get("loss_history", {})
        reward_history = status.get("reward_history", [])

        # Emit on progress change OR new loss/reward data
        current_loss_len = len(loss_history.get("g_loss", []))
        current_reward_len = len(reward_history)
        has_new_data = (
            progress != last_progress
            or current_loss_len != last_loss_len
            or current_reward_len != last_reward_len
        )

        if has_new_data:
            yield {
                "event": "progress",
                "data": json.dumps({
                    **status,
                    # Only send NEW loss/reward points (delta)
                    "new_loss_points": {
                        k: v[last_loss_len:] for k, v in loss_history.items()
                    } if current_loss_len > last_loss_len else None,
                    "new_reward_points": reward_history[last_reward_len:]
                        if current_reward_len > last_reward_len else None,
                }),
            }
            last_progress = progress
            last_loss_len = current_loss_len
            last_reward_len = current_reward_len

        # ... rest of completion checks
        await asyncio.sleep(0.5)
```

### Zustand Training Slice

```typescript
// Addition to store.ts
interface TrainingStreamState {
  // SSE connection state
  sseConnected: boolean;
  setSSEConnected: (connected: boolean) => void;

  // Training progress (from SSE)
  trainingProgress: {
    is_training: boolean;
    progress: number;
    current_step: string;
    metrics: Record<string, any>;
  };

  // Live chart data (appended from SSE)
  lossHistory: Array<{
    epoch: number;
    g_loss: number;
    d_loss_real: number;
    d_loss_fake: number;
  }>;
  rewardHistory: Array<{
    episode: number;
    reward: number;
  }>;

  // Actions
  updateTrainingFromSSE: (data: any) => void;
  resetTrainingData: () => void;
}
```

### Dashboard Auto-Refresh (LIVE-06)

```typescript
// Simple 30s polling hook
export function useAutoRefresh(callback: () => void, intervalMs = 30000) {
  useEffect(() => {
    const timer = setInterval(callback, intervalMs);
    return () => clearInterval(timer);
  }, [callback, intervalMs]);
}
```

## Existing Code Analysis

### Backend: What Exists and What Needs Changing

**`backend/app/routers/training.py`** — SSE endpoint EXISTS
- ✅ `EventSourceResponse` with async generator
- ✅ Named events: `progress`, `complete`, `stopped`, `idle`
- ✅ 500ms polling interval
- ❌ Only sends `{is_training, progress, current_step, metrics}` — no loss/reward arrays
- **MODIFY:** Enrich event data to include loss/reward deltas

**`backend/app/services/training_service.py`** — Pipeline EXISTS
- ✅ 7-step pipeline with progress percentages
- ✅ ThreadPoolExecutor for non-blocking training
- ✅ `_update()` method for progress
- ❌ No per-epoch/episode metric capture
- **MODIFY:** Add callbacks to GAN training + Q-learning, capture history arrays into AppState

**`backend/app/state.py`** — AppState EXISTS
- ✅ `training_status` dict with basic fields
- ❌ No `loss_history` or `reward_history` fields
- **MODIFY:** Extend initial dict to include `loss_history: {}` and `reward_history: []`

**`backend/app/routers/analytics.py`** — Traffic endpoint EXISTS
- ✅ `/api/traffic-patterns` returns generated traffic
- ❌ Returns flattened values, not grid-structured temporal data
- **MODIFY:** Add new `/api/traffic-patterns/temporal` endpoint for time-of-day slider

### Frontend: What Exists and What Needs Changing

**`frontend/src/pages/Training.tsx`** — Training UI EXISTS (245 lines)
- ✅ 7-step pipeline stepper (PIPELINE_STEPS array with thresholds)
- ✅ Config panel with all training parameters
- ✅ Progress bar with overall percentage
- ✅ Metrics display after completion
- ❌ Uses `setInterval` polling (2s) instead of SSE
- ❌ No loss/reward curve charts
- ❌ No time-of-day traffic slider
- **MODIFY:** Replace polling with SSE hook, add chart components

**`frontend/src/services/api.ts`** — API client EXISTS
- ✅ `getTrainingStatus()`, `startTraining()`, `stopTraining()`
- ✅ `getTrafficPatterns(timeStep)` — can be extended
- ❌ No SSE connection method (SSE bypasses axios — uses EventSource directly)
- **NO CHANGE NEEDED for SSE** — EventSource is browser-native

**`frontend/src/store/store.ts`** — Zustand store EXISTS
- ✅ Toast system, theme, navigation, EV state, routes
- ✅ Persisted preferences
- ✅ Granular selector hooks pattern
- ❌ No training stream state slice
- **MODIFY:** Add training stream slice with loss/reward arrays

**`frontend/src/hooks/`** — Hooks directory EXISTS
- ✅ `useApi.ts` — generic async hook
- ✅ `useAnimatedNumber.ts`, `useAnimatedRoute.ts`, etc.
- ❌ No SSE hook
- **CREATE:** `useSSE.ts` and `useTrainingStream.ts`

### ML Pipeline: What Data Is Available

**GAN Training (`src/traffic_generator.py`):**
- `SGGANTrafficGenerator.history` dict after training:
  - `g_loss: float[]` — generator loss per epoch
  - `d_loss_real: float[]` — discriminator real loss per epoch
  - `d_loss_fake: float[]` — discriminator fake loss per epoch
- Training loop is in `train()` method, currently has NO callback mechanism
- **MODIFY:** Add `epoch_callback` parameter to `train()` method

**Q-Learning Training (`src/q_learning_agent.py`):**
- `train_q_learning_agent()` returns `(episode_rewards: float[], episode_lengths: int[])`
- Per-episode data: reward, length, exploration_rate
- Currently has NO callback mechanism
- **MODIFY:** Add `episode_callback` parameter to `train_q_learning_agent()`

**Pipeline Steps (from `training_service.py`):**
| Step | Progress | Name | ML Component |
|------|----------|------|-------------|
| 1 | 10% | Creating road network | `step1_create_road_network()` |
| 2 | 25% | Generating traffic data | `step2_generate_traffic_data()` |
| 3 | 40% | Training traffic GAN | `step3_train_gan(traffic_data)` |
| 4 | 55% | Creating RL environment | `step4_create_environment()` |
| 5 | 75% | Training Q-Learning agent | `step5_train_agent()` |
| 6 | 85% | Creating route generator | `step6_create_route_generator()` |
| 7 | 95% | Evaluating system | `step7_evaluate_system()` |

**Key insight:** Steps 3 and 5 are the long-running ones with per-iteration metrics. Steps 1, 2, 4, 6, 7 complete quickly — no per-iteration data needed.

## State of the Art

| Old Approach | Current Approach | Impact |
|-------------|-----------------|--------|
| Polling with `setInterval` | SSE with `EventSource` | Real-time updates, less server load, better UX |
| Full dataset re-send on each SSE event | Delta-only: send only new data points since last event | Much smaller payloads, especially for 500-episode RL training |
| Loading charts after training completes | Streaming chart data during training | "Most impressive demo feature" — evaluators see ML happening live |
| Static traffic heatmap | Slider-based temporal visualization | Shows SG-GAN's ability to model time-of-day patterns |

## Implementation Strategy

### Wave 1: Backend Enrichment (Pre-requisite)
1. Extend `AppState.training_status` with `loss_history` and `reward_history` fields
2. Add `epoch_callback` to `SGGANTrafficGenerator.train()`
3. Add `episode_callback` to `train_q_learning_agent()`
4. Modify `TrainingService._run_pipeline()` to wire callbacks
5. Add `/api/traffic-patterns/temporal` endpoint

### Wave 2: Frontend SSE Infrastructure
1. Create `useSSE` hook with exponential backoff
2. Add training stream slice to Zustand store
3. Create `useTrainingStream` bridge hook
4. Implement polling fallback with SSE/polling toggle

### Wave 3: Frontend Visualization
1. Create `LossCurveChart` component (GAN losses)
2. Create `RewardCurveChart` component (Q-Learning rewards)
3. Extract `PipelineStepper` from Training.tsx (refactor)
4. Replace Training.tsx polling with SSE
5. Add dashboard auto-refresh (30s polling)

### Wave 4: Traffic Slider
1. Create `TrafficSlider` component with range input
2. Render traffic data as grid heatmap
3. Integrate into Dashboard or Training page

## Open Questions

1. **How granular should GAN loss streaming be?**
   - Every epoch? Every 5 epochs? The existing GAN prints every 10 epochs.
   - **Recommendation:** Every epoch for live chart building (it's the "wow" feature). With 100 epochs default, that's only 100 data points — trivial.

2. **Should RL reward streaming include running average?**
   - Raw per-episode rewards are noisy. A smoothed (moving average) line helps visualization.
   - **Recommendation:** Send raw data, compute moving average on frontend. Keeps backend stateless and lets frontend adjust window size.

3. **Where does the traffic slider live — Dashboard or Training page?**
   - The requirements say "Time-of-day traffic slider on dashboard."
   - **Recommendation:** Dashboard, as a new card below the map. Shows the system's AI capabilities even when not training.

4. **How to pass callbacks through `EVRoutingSystem.step3_train_gan()`?**
   - The pipeline methods (`step3`, `step5`) don't currently accept callbacks.
   - **Recommendation:** Modify `step3_train_gan()` and `step5_train_agent()` to accept optional callback parameters and forward them to the underlying training functions.

5. **Should SSE stream during ALL 7 steps or just steps 3 and 5?**
   - Steps 1, 2, 4, 6, 7 complete in seconds. Only 3 (GAN) and 5 (RL) have meaningful per-iteration data.
   - **Recommendation:** Stream progress for all 7 steps (current behavior), but add per-iteration metrics only for steps 3 and 5.

## Sources

### Primary (HIGH confidence)
- Direct codebase analysis of `backend/app/routers/training.py`, `backend/app/services/training_service.py`, `backend/app/state.py`
- Direct codebase analysis of `frontend/src/pages/Training.tsx`, `frontend/src/store/store.ts`, `frontend/src/services/api.ts`
- Direct codebase analysis of `src/traffic_generator.py` (GAN training loop), `src/q_learning_agent.py` (RL training loop)
- MDN Web Docs: EventSource API — native browser SSE client, supports named events + auto-reconnect
- Recharts ^2.10 documentation: LineChart, ResponsiveContainer, animation props

### Secondary (MEDIUM confidence)
- React 18 automatic batching: SSE `onmessage` handlers that call `setState` (or Zustand `set`) benefit from React 18's automatic batching — only one render per event
- `sse-starlette` >=2.0: Supports `event`, `data`, `id`, `retry` fields in yielded dicts

## Metadata

**Confidence breakdown:**
- Standard stack: **HIGH** — all libraries already installed, patterns observed in existing code
- Architecture: **HIGH** — SSE infrastructure already exists, patterns well-established
- Backend enrichment: **HIGH** — clear code path from training loops to AppState, just needs callbacks
- Pitfalls: **HIGH** — based on direct analysis of current code patterns and known EventSource/Recharts behaviors
- Traffic slider: **MEDIUM** — backend temporal data shape confirmed, but frontend heatmap rendering approach not yet validated

**Research date:** 2026-02-16
**Valid until:** 2026-03-16 (stable — no fast-moving dependencies)
