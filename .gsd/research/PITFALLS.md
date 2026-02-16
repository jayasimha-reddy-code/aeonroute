# Pitfall Research: ML + Full-Stack Upgrade for Live Demo

> **Context:** Python FastAPI + React EV route optimization app with TensorFlow/Keras GANs, Q-Learning RL, glassmorphism UI upgrade, live university demo.
>
> **Date:** 2026-02-16

---

## 1. ML Demo Pitfalls

### 1.1 GAN Training Instability (Mode Collapse, NaN Losses)

**What goes wrong:**
GANs are notoriously fragile. During a live demo, the generator can collapse to producing identical outputs regardless of input (mode collapse), or losses can explode to NaN within seconds. This happens because the discriminator "wins" too easily, gradients vanish for the generator, and the whole training loop diverges. Even a small change in data distribution, batch size, or learning rate between your dev machine and demo machine can trigger this.

**Warning signs:**
- Generator loss stays flat or oscillates wildly while discriminator loss drops to near-zero
- Generated samples look identical across different noise inputs
- Loss values suddenly jump to very large numbers or `inf`
- Discriminator accuracy hits 100% (it's perfectly separating real from fake — generator has stopped learning)

**Prevention strategy:**
- **Pre-train and checkpoint aggressively.** Never do full GAN training live. Have a pre-trained model ready and only show a few fine-tuning steps (5-10 epochs max) for the demo.
- **Use spectral normalization** on discriminator layers to stabilize training.
- **Add gradient clipping** (`clipnorm=1.0` or `clipvalue=0.5`) to both optimizers.
- **Use label smoothing** — real labels as 0.9 instead of 1.0, reduces discriminator overconfidence.
- **Log losses to a visible chart** during demo so evaluators see "training is progressing" even if it's slow.
- **Set a fixed random seed** (`tf.random.set_seed(42)`, `np.random.seed(42)`) so behavior is reproducible.
- **Test the exact training loop 5+ times** on the demo machine before presentation day.

**Recovery plan (during demo):**
- If NaN appears: "This is a known GAN instability issue — let me load our pre-trained checkpoint instead." Switch to pre-trained model immediately.
- If mode collapse is visible: "The generator is in early convergence — here's what the output looks like after full training." Show pre-saved results.
- **Always have a "skip to results" button** or script that loads the final trained model and shows outputs directly.

---

### 1.2 Model Loading Failures (TF Version Mismatches, Format Issues)

**What goes wrong:**
TensorFlow has broken backward compatibility multiple times. Models saved with TF 2.12 may not load in TF 2.15+. The `.h5` format is legacy and doesn't support custom layers well. The newer `.keras` format changed serialization behavior. Keras 3.x (standalone) vs `tf.keras` have different saving APIs. Moving between machines can also trigger `ModuleNotFoundError` for custom objects.

**Warning signs:**
- `ValueError: Unknown layer` or `TypeError: __init__() got an unexpected keyword argument` when loading
- `OSError: SavedModel file does not exist at ...` — path issues between OS environments
- Model loads but produces garbage outputs (silent version mismatch — weights misaligned with architecture)
- `AttributeError: module 'keras' has no attribute ...` — Keras 2 vs 3 API differences

**Prevention strategy:**
- **Pin exact TensorFlow version** in `requirements.txt`: `tensorflow==2.15.0` (not `>=2.15`).
- **Save models in both formats:** `.keras` (primary) and SavedModel directory (backup).
- **Always save and load with the same TF version.** Document the version in a comment next to model paths.
- **Test model loading in a clean virtual environment** that matches the demo machine.
- **Use `tf.saved_model.load()` for production** (most portable), `model.save()` + `tf.keras.models.load_model()` for development.
- **Include custom objects in a `custom_objects` dict** when loading:
  ```python
  model = tf.keras.models.load_model(
      "model.keras",
      custom_objects={"CustomLayer": CustomLayer}
  )
  ```
- **Ship the model file alongside the code** — never rely on downloading at demo time.

**Recovery plan (during demo):**
- Keep a `fallback_model/` directory with models saved in multiple formats.
- Have a script that rebuilds the architecture and loads just the weights (`.weights.h5`) — this is more resilient than loading the full model.
- If all loading fails: show pre-recorded model outputs while explaining the architecture on a slide.

---

### 1.3 Training Takes Too Long for Live Demo

**What goes wrong:**
Q-Learning for route optimization and GAN training can take minutes to hours. Demo machines are often slower (no GPU, shared resources, power-saving mode). Evaluators get restless after 30 seconds of watching a progress bar.

**Warning signs:**
- Training loop takes >60 seconds for even a small dataset
- No GPU detected (`tf.config.list_physical_devices('GPU')` returns empty)
- CPU is thermal-throttled on a laptop running on battery

**Prevention strategy:**
- **Pre-train everything.** Demo should show "resuming training" from epoch 90 to epoch 100, not from scratch.
- **Use a tiny demo dataset** (100-500 samples) specifically for live training demos.
- **Reduce model complexity for demo mode:** fewer layers, smaller hidden dims, simpler architectures.
- **Add a `--demo` flag** to training scripts that uses reduced hyperparameters:
  ```python
  if demo_mode:
      epochs = 5
      batch_size = 32
      dataset = dataset[:200]
  ```
- **Show a live-updating chart** (loss curve, reward graph) so evaluators see progress.
- **Pre-compute and cache all evaluation metrics.** Never compute BLEU, FID, or route quality scores live for the first time.
- **Ensure laptop is plugged in** and on high-performance power plan.

**Recovery plan (during demo):**
- Have a timer. If training isn't done in 45 seconds, say: "Training typically takes X minutes — let me show pre-computed results while this runs in the background."
- Use `asyncio` or background threads so the UI remains responsive during training.
- Have pre-baked training curves as images/data to overlay.

---

### 1.4 Evaluation Metrics That Look Bad When Model Works

**What goes wrong:**
GAN metrics like FID (Fréchet Inception Distance) can look terrible on small sample sizes. Q-Learning reward curves have natural variance. Route optimization accuracy depends heavily on the test set. Evaluators don't know what "good" looks like for your specific task.

**Warning signs:**
- FID scores >100 on small sample sizes (expected, but looks bad)
- Reward curves with high variance that look like the agent isn't learning
- Route quality scores that are hard to interpret without context

**Prevention strategy:**
- **Always show metrics WITH a baseline comparison.** "Our model achieves X, random baseline is Y, previous work is Z."
- **Use visual metrics** evaluators can understand: overlay optimized routes on a map vs. naive routes. Show energy savings as a percentage.
- **Pre-compute metrics on a large test set** and display those. Don't compute metrics on 10 samples live.
- **Add confidence intervals or error bars** so variance looks intentional, not buggy.
- **Prepare a "what good looks like" slide** that contextualizes your numbers.
- **For GANs:** show generated vs real samples side by side. Visual quality > numeric metrics for a demo.
- **For RL:** show the learning curve over the full training run, not just the last 5 episodes.

**Recovery plan (during demo):**
- If a metric looks bad: "This metric is computed on a small sample for speed — here are our full evaluation results." Switch to pre-computed dashboard.
- Always have 2-3 specific success examples ready to show manually.

---

## 2. UI / Animation Pitfalls

### 2.1 Glassmorphism Performance Issues

**What goes wrong:**
`backdrop-filter: blur()` is GPU-intensive. Applying it to large surfaces (full-width headers, modal overlays, map containers) causes frame drops, especially on integrated GPUs. Stacking multiple glassmorphic layers compounds the issue exponentially. Chrome's rendering pipeline struggles when blur radius is >20px on elements larger than ~500x500px.

**Warning signs:**
- FPS drops below 30 when scrolling or animating glassmorphic elements (check Chrome DevTools Performance tab)
- Visible "smearing" or delayed blur updates when content behind the glass changes
- High GPU memory usage in Task Manager
- `will-change: backdrop-filter` warnings in DevTools

**Prevention strategy:**
- **Limit blur radius to 10-12px.** Beyond 16px, diminishing visual returns, increasing performance cost.
- **Apply glassmorphism to small elements only:** cards, tooltips, small modals. NOT full-width headers or map overlays.
- **Use `will-change: transform`** on glassmorphic elements to promote them to their own compositing layer.
- **Avoid animating glassmorphic elements.** Apply blur to static containers; animate content inside them.
- **Use a solid fallback for complex backgrounds:**
  ```css
  .glass-card {
    background: rgba(255, 255, 255, 0.15);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    /* Fallback for weak GPUs */
    @supports not (backdrop-filter: blur(10px)) {
      background: rgba(30, 30, 60, 0.85);
    }
  }
  ```
- **Test on the actual demo machine** — your dev machine's discrete GPU hides performance problems.
- **Consider pre-rendered blur:** use a blurred background image instead of live `backdrop-filter` for hero sections.

**Recovery plan (during demo):**
- Have a CSS class toggle that switches from glassmorphism to solid semi-transparent backgrounds:
  ```css
  .perf-mode .glass-card {
    backdrop-filter: none;
    background: rgba(30, 30, 60, 0.9);
  }
  ```
- Bind to a keyboard shortcut (e.g., `Ctrl+Shift+P` for performance mode).

---

### 2.2 Animation Jank on Projectors

**What goes wrong:**
Projectors often run at 30Hz or have noticeable input lag. Animations designed for 60fps on a monitor look janky, stuttery, or lag behind interactions. Color calibration is different — subtle gradients and transparency effects can look washed out or invisible. Dark surfaces lose all detail.

**Warning signs:**
- Animations appear to "jump" instead of smoothly transitioning
- Hover effects have noticeable delay
- Subtle color differences (glassmorphism borders, shadows) disappear entirely
- Text on semi-transparent backgrounds becomes unreadable

**Prevention strategy:**
- **Design animations at 30fps mentality:** use shorter durations (200-300ms instead of 500ms+), simpler easing curves.
- **Increase contrast ratios.** If your glass card has a 1px subtle border, make it 2px and more opaque.
- **Add stronger text shadows** behind text on glassmorphic surfaces:
  ```css
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
  ```
- **Test with your monitor at 30Hz** (Display Settings → Advanced Display → Refresh Rate) to simulate projector.
- **Use `prefers-reduced-motion` media query** as a kill switch:
  ```css
  @media (prefers-reduced-motion: reduce) {
    * { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
  }
  ```
- **Avoid spring animations** (Framer Motion `type: "spring"`) for critical UI — they're beautiful at 60fps, stuttery at 30fps. Use `type: "tween"` with `ease: "easeOut"`.
- **Bring your own HDMI adapter** and test it beforehand.

**Recovery plan (during demo):**
- Keyboard shortcut to disable all animations: set Framer Motion's `MotionConfig` `reducedMotion="always"`.
- Have a "presentation mode" that bumps up font sizes, increases contrast, and simplifies animations.
- If projector colors are bad: switch browser to light mode (have it ready as a toggle).

---

### 2.3 Framer Motion + React.lazy Code Splitting

**What goes wrong:**
When routes are code-split with `React.lazy()`, components mount after an async chunk loads. Framer Motion `AnimatePresence` expects children to be present synchronously. This causes:
- Exit animations never playing (old component is already suspended)
- Entry animations firing before the component is visually ready (flash of loading state)
- Layout animations breaking because the DOM structure changes during Suspense resolution

**Warning signs:**
- Page transitions show a flash of the fallback/skeleton before the animation
- `AnimatePresence` `exitBeforeEnter`/`mode="wait"` doesn't work — pages just pop in
- Console warning: "Framer Motion: No valid children were found"
- Route transitions feel instant (no animation) or have a double-render flicker

**Prevention strategy:**
- **Don't code-split for the demo.** Bundle everything together. The total bundle for an EV routing app is likely <2MB — acceptable for a local demo.
- If you must code-split, **preload critical routes:**
  ```js
  const Dashboard = React.lazy(() => import('./Dashboard'));
  // Preload on hover or on app mount
  const preloadDashboard = () => import('./Dashboard');
  ```
- **Wrap lazy components in a motion-aware Suspense:**
  ```jsx
  <AnimatePresence mode="wait">
    <Suspense fallback={<SkeletonWithMotion />}>
      <motion.div key={location.pathname} initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
        <Outlet />
      </motion.div>
    </Suspense>
  </AnimatePresence>
  ```
- **Use `startTransition`** from React 18+ for route changes so Suspense doesn't show the fallback for already-cached routes.

**Recovery plan (during demo):**
- If animations break: navigate directly (full page reload to each route) rather than trying client-side transitions.
- Have all routes pre-visited (warmed up) before the demo starts — open each page once during setup.

---

### 2.4 Dark Mode on Projector Screens

**What goes wrong:**
Projectors in lecture halls have poor black levels. "Black" appears as washed-out dark gray. Your carefully designed dark theme loses all depth, contrast, and hierarchy. Glassmorphism effects that rely on dark backgrounds become invisible. Text on dark surfaces becomes hard to read from the back of the room.

**Warning signs:**
- Dark surfaces all look the same shade of gray when projected
- Glassmorphic card borders and shadows are invisible
- Syntax highlighting in code blocks is unreadable
- Charts and graphs lose color distinction

**Prevention strategy:**
- **Build a "presentation" / "projector" theme** as a third option alongside dark/light:
  - Background: dark navy (`#1a1a3e`) instead of pure black (`#000`)
  - Cards: slightly lighter (`#2a2a5e`) with visible borders (`1px solid rgba(255,255,255,0.3)`)
  - Increase all text to minimum 16px, headings 24px+
  - Boost color saturation by 20-30%
- **Use high-contrast accent colors:** bright cyan, vivid green, electric blue — avoid subtle pastels.
- **Add visible borders to all cards and containers.** Don't rely on shadow alone for elevation.
- **Test with a projector** or, at minimum, reduce monitor brightness to 20% and add a gray overlay to simulate projector wash-out.
- **Map visualizations:** use thick route lines (4px+), large markers, strong colors against map tiles.

**Recovery plan (during demo):**
- Toggle to light mode instantly (prepare the toggle in advance).
- Increase browser zoom to 125-150% (Ctrl + +).
- If colors are washed out, narrate what should be visible: "The blue line shows the optimized route, the red shows baseline."

---

## 3. Full-Stack Integration Pitfalls

### 3.1 FastAPI Background Tasks Not Reporting Status

**What goes wrong:**
FastAPI's `BackgroundTasks` are fire-and-forget. Training a model as a background task gives you no way to report progress, handle errors, or cancel. The frontend shows "Training started" and then has no idea what's happening. If the task crashes, the user never knows.

**Warning signs:**
- No progress updates in the UI during long operations
- Frontend polling an endpoint that always returns "in progress"
- Background task silently fails — no error log, no notification
- Multiple training tasks started accidentally (user clicks button twice)

**Prevention strategy:**
- **Don't use `BackgroundTasks` for ML training.** Use a proper task tracking pattern:
  ```python
  # In-memory task store (fine for demo)
  from dataclasses import dataclass, field
  from enum import Enum
  import uuid, asyncio

  class TaskStatus(Enum):
      PENDING = "pending"
      RUNNING = "running"
      COMPLETED = "completed"
      FAILED = "failed"

  tasks: dict[str, dict] = {}

  @app.post("/train")
  async def start_training(config: TrainConfig):
      task_id = str(uuid.uuid4())
      tasks[task_id] = {"status": "running", "progress": 0, "result": None, "error": None}
      asyncio.create_task(run_training(task_id, config))
      return {"task_id": task_id}

  @app.get("/train/{task_id}/status")
  async def get_status(task_id: str):
      return tasks.get(task_id, {"status": "not_found"})
  ```
- **Update progress inside the training loop:**
  ```python
  async def run_training(task_id, config):
      try:
          for epoch in range(config.epochs):
              # ... training step ...
              tasks[task_id]["progress"] = (epoch + 1) / config.epochs * 100
          tasks[task_id]["status"] = "completed"
      except Exception as e:
          tasks[task_id]["status"] = "failed"
          tasks[task_id]["error"] = str(e)
  ```
- **Add a cancel endpoint** that sets a flag the training loop checks.
- **Debounce the train button** — disable it while a task is running.

**Recovery plan (during demo):**
- If status is stuck: check the terminal running FastAPI for stack traces.
- Have a "reset" endpoint that clears all tasks and returns to a known state.
- Pre-trained model as fallback — show results while "the model finishes in the background."

---

### 3.2 CORS Issues Running Frontend/Backend Separately

**What goes wrong:**
React dev server runs on `localhost:3000`, FastAPI on `localhost:8000`. Browsers block cross-origin requests unless CORS headers are correct. Common mistakes: forgetting to allow the frontend origin, not allowing credentials, preflight OPTIONS requests failing, WebSocket connections being blocked by CORS.

**Warning signs:**
- Console errors: `Access to fetch at 'http://localhost:8000/...' from origin 'http://localhost:3000' has been blocked by CORS policy`
- API calls work in Postman but fail in the browser
- Cookies/auth tokens not being sent (credentials mode issue)
- WebSocket connection immediately closes

**Prevention strategy:**
- **Configure CORS explicitly in FastAPI:**
  ```python
  from fastapi.middleware.cors import CORSMiddleware

  app.add_middleware(
      CORSMiddleware,
      allow_origins=["http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:3000"],
      allow_credentials=True,
      allow_methods=["*"],
      allow_headers=["*"],
  )
  ```
- **Include `127.0.0.1` AND `localhost`** — they are different origins!
- **For production/demo:** serve the React build from FastAPI's static files. Eliminates CORS entirely:
  ```python
  from fastapi.staticfiles import StaticFiles
  app.mount("/", StaticFiles(directory="frontend/build", html=True))
  ```
- **For WebSockets:** CORS middleware doesn't cover WebSocket upgrades. Handle manually or use the same origin.
- **Test with browser DevTools Network tab** — look for failed preflight (OPTIONS) requests.

**Recovery plan (during demo):**
- If CORS breaks: open browser with CORS disabled (emergency only):
  ```bash
  chrome.exe --disable-web-security --user-data-dir=C:\temp\chrome-dev
  ```
- Or quickly switch to serving frontend from FastAPI static mount.
- Have the app running in a single Docker container where everything is same-origin.

---

### 3.3 WebSocket/SSE Connection Drops During Long Training

**What goes wrong:**
WebSocket connections drop after 60-120 seconds of inactivity (proxy/firewall timeout). SSE connections are killed by browsers if no data is sent for ~45 seconds. During long ML training, if you only send updates per-epoch and epochs take >60 seconds, the connection dies silently. The frontend shows stale progress or freezes.

**Warning signs:**
- Progress bar freezes at some percentage and never updates
- Browser DevTools shows WebSocket connection as "closed"
- SSE EventSource fires `onerror` and reconnects repeatedly
- "Training complete" notification never arrives

**Prevention strategy:**
- **Send heartbeat messages every 15-30 seconds:**
  ```python
  # SSE endpoint
  async def training_stream(task_id: str):
      while tasks[task_id]["status"] == "running":
          yield f"data: {json.dumps(tasks[task_id])}\n\n"
          await asyncio.sleep(2)  # Send update every 2 seconds
      yield f"data: {json.dumps(tasks[task_id])}\n\n"
  ```
- **For WebSockets, implement ping/pong:**
  ```python
  @app.websocket("/ws/training/{task_id}")
  async def ws_training(websocket: WebSocket, task_id: str):
      await websocket.accept()
      while True:
          if tasks[task_id]["status"] != "running":
              await websocket.send_json(tasks[task_id])
              break
          await websocket.send_json(tasks[task_id])
          await asyncio.sleep(2)
  ```
- **Implement reconnection logic on the frontend:**
  ```js
  const connectSSE = (taskId) => {
    const es = new EventSource(`/api/train/${taskId}/stream`);
    es.onmessage = (e) => updateProgress(JSON.parse(e.data));
    es.onerror = () => {
      es.close();
      setTimeout(() => connectSSE(taskId), 3000); // Reconnect after 3s
    };
  };
  ```
- **Use polling as a fallback.** Poll `/train/{task_id}/status` every 3 seconds. Less elegant but more reliable.

**Recovery plan (during demo):**
- If the stream dies: refresh the page and hit the status endpoint manually.
- Have a "Check Status" button that does a one-shot fetch, independent of streaming.
- If all else fails: check the terminal output for training progress and narrate it.

---

### 3.4 Race Conditions with Concurrent API Requests

**What goes wrong:**
User clicks "Optimize Route" twice quickly. Two training jobs start simultaneously, competing for GPU memory. Or: frontend fires multiple API calls on mount (fetch user, fetch routes, fetch model status), and one of them fails, putting the app in an inconsistent state. FastAPI's async handlers can interleave, causing shared state corruption.

**Warning signs:**
- `CUDA out of memory` errors
- App shows data from two different states (stale + fresh mixed)
- Duplicate entries in results
- Buttons that seem to do nothing (request is queued behind another)

**Prevention strategy:**
- **Debounce all user-triggered API calls** (300ms minimum):
  ```js
  const debouncedOptimize = useMemo(
    () => debounce(() => optimizeRoute(), 300),
    []
  );
  ```
- **Disable buttons during API calls.** Show a loading spinner. Re-enable on response.
- **Use a mutex/lock on the backend for training:**
  ```python
  training_lock = asyncio.Lock()

  @app.post("/train")
  async def start_training(config: TrainConfig):
      if training_lock.locked():
          raise HTTPException(409, "Training already in progress")
      async with training_lock:
          # ... training logic ...
  ```
- **Use React Query / TanStack Query** for API calls — built-in deduplication, caching, and stale-while-revalidate.
- **Make API responses idempotent** where possible.

**Recovery plan (during demo):**
- If app is in a broken state: restart the FastAPI server (takes 2-3 seconds).
- Have a `/reset` endpoint that clears all in-memory state.
- Refresh the browser (Ctrl+Shift+R to bypass cache).

---

## 4. Presentation-Day Pitfalls

### 4.1 WiFi Network Changes

**What goes wrong:**
Your app uses `localhost`, but some university WiFi networks have captive portals, firewall rules blocking local ports, or DNS that interferes with localhost resolution. If your app fetches external data (map tiles, API keys, geocoding), those requests may fail on the university network.

**Warning signs:**
- App works on home WiFi, fails on university WiFi
- External API calls (Google Maps, OpenStreetMap tiles) timeout
- `ERR_CONNECTION_REFUSED` despite backend running
- Captive portal intercepts HTTP requests

**Prevention strategy:**
- **Use `127.0.0.1` instead of `localhost`** everywhere — avoids DNS resolution issues.
- **Cache all external data locally:**
  - Download map tiles for your demo area and serve them locally
  - Cache geocoding results
  - Bundle any external API responses as JSON files
  - Use a local tile server (e.g., `mbtiles`) or pre-rendered static map images
- **Don't rely on internet at all.** Run everything locally. If you need map tiles, use offline tiles or a screenshot fallback.
- **Test with WiFi disabled.** Everything that matters should work offline.
- **If you must use internet:** have a mobile hotspot as backup.

**Recovery plan (during demo):**
- Switch to mobile hotspot immediately.
- If no internet: "We designed this to work offline for reliability." Show cached data.
- Have static screenshots of map-dependent features as absolute last resort.

---

### 4.2 Different Machine Issues (Paths, Ports, Dependencies)

**What goes wrong:**
Hardcoded paths (`C:\Users\yourname\...`), ports already in use on the demo machine, different Python version, missing system libraries (CUDA, GDAL, etc.), different Node.js version, missing environment variables.

**Warning signs:**
- `FileNotFoundError` with an absolute path from your dev machine
- `Address already in use` — port 8000 or 3000 taken by another app
- `ModuleNotFoundError` — package installed on your machine but not in venv
- Model loads but produces wrong results (different NumPy/TF version)

**Prevention strategy:**
- **Use relative paths everywhere.** Audit with:
  ```bash
  grep -r "C:\\\\Users" . --include="*.py" --include="*.ts" --include="*.js"
  grep -r "/home/" . --include="*.py" --include="*.ts" --include="*.js"
  ```
- **Use environment variables for all configurable paths:**
  ```python
  import os
  MODEL_PATH = os.getenv("MODEL_PATH", "./models/gan_model.keras")
  ```
- **Pin ALL dependency versions.** Use `pip freeze > requirements.txt` and `npm ci` (not `npm install`).
- **Use Docker.** One `docker-compose up` and everything works:
  ```yaml
  services:
    backend:
      build: ./backend
      ports: ["8000:8000"]
    frontend:
      build: ./frontend
      ports: ["3000:3000"]
  ```
- **Test on a clean machine** or VM before demo day. At minimum, test in a fresh virtual environment.
- **Make ports configurable:**
  ```python
  PORT = int(os.getenv("PORT", 8000))
  uvicorn.run(app, host="0.0.0.0", port=PORT)
  ```
- **Bring your own laptop.** Don't rely on lab machines.

**Recovery plan (during demo):**
- If port conflict: kill the process using the port or change to an alternate:
  ```bash
  # Windows
  netstat -ano | findstr :8000
  taskkill /PID <pid> /F
  ```
- If dependency issues: have a Docker image pre-built and ready.
- Bring a USB drive with the entire project, venv, and Docker images exported.

---

### 4.3 Browser Cache Showing Stale UI

**What goes wrong:**
You fixed a critical UI bug the night before. Demo day: browser shows the old cached version. Service workers aggressively cache everything. The React build hash didn't change because of a CSS-only fix. You see the old layout and panic.

**Warning signs:**
- UI doesn't match your latest code changes
- Network tab shows `(from disk cache)` or `(from service worker)` for JS/CSS files
- Console shows old console.log messages you already removed
- API responses are cached (stale data)

**Prevention strategy:**
- **Disable service workers for the demo build** or ensure proper cache invalidation.
- **Add build hashes to all assets** (Create React App does this by default, Vite does too).
- **Always use hard refresh before demo:** `Ctrl+Shift+R` (bypass cache).
- **Clear all browser data before demo:**
  ```
  Chrome → Settings → Privacy → Clear browsing data → All time → Clear data
  ```
- **Use incognito/private mode** for the demo — no cache, no extensions, no saved state.
- **Set appropriate cache headers on FastAPI:**
  ```python
  @app.middleware("http")
  async def add_no_cache_headers(request, call_next):
      response = await call_next(request)
      if request.url.path.startswith("/api"):
          response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
      return response
  ```

**Recovery plan (during demo):**
- Hard refresh: `Ctrl+Shift+R`.
- Open in incognito window.
- If still stale: open DevTools → Application → Clear storage → Clear site data.
- Nuclear option: `Ctrl+Shift+Delete` → Clear everything → Reload.

---

### 4.4 Docker Not Starting Fast Enough

**What goes wrong:**
Docker Desktop on Windows takes 30-90 seconds to start. Docker images need to be pulled (5-10 minutes on slow WiFi). Container builds take minutes if layers aren't cached. WSL2 backend sometimes crashes and needs restart. You're standing in front of evaluators waiting for Docker to boot.

**Warning signs:**
- `docker: Cannot connect to the Docker daemon` — Docker Desktop isn't running
- `docker-compose up` hangs on "Pulling..." — images not pre-pulled
- Container starts but app takes additional 30s to be ready (TF model loading)
- WSL2 errors or "Docker Desktop is starting..." for over 60 seconds

**Prevention strategy:**
- **Start Docker Desktop 10 minutes before your demo slot.**
- **Pre-pull and pre-build ALL images** the night before:
  ```bash
  docker-compose build
  docker-compose pull
  docker-compose up  # Verify it works, then Ctrl+C
  ```
- **Use `docker-compose up` health checks** so you know when the app is actually ready:
  ```yaml
  services:
    backend:
      healthcheck:
        test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
        interval: 5s
        timeout: 3s
        retries: 5
  ```
- **Add a `/health` endpoint to FastAPI:**
  ```python
  @app.get("/health")
  async def health():
      return {"status": "healthy", "model_loaded": model is not None}
  ```
- **Have a non-Docker fallback.** Run frontend and backend directly with `npm start` and `uvicorn`:
  ```bash
  # Terminal 1
  cd backend && python -m uvicorn main:app --reload
  # Terminal 2
  cd frontend && npm start
  ```
- **Use multi-stage Docker builds** to keep images small (<500MB).

**Recovery plan (during demo):**
- If Docker won't start: switch to running directly (have the commands ready in a script).
- Pre-open the browser with the app URL. If Docker takes long: "Let me walk through the architecture while the environment initializes."
- Have a `start.ps1` / `start.sh` script that does everything in one click.

---

## 5. Architecture Pitfalls

### 5.1 Over-Refactoring Stable Code

**What goes wrong:**
You decide to "clean up" the codebase before the demo. You refactor the route optimization module, change the data pipeline, restructure the API. Now 3 things that worked before are broken, and you've introduced new bugs the night before the presentation.

**Warning signs:**
- Changing files that haven't been touched in weeks "just to clean them up"
- Refactoring without tests to catch regressions
- "While I'm in here, I might as well..." thinking
- git diff shows changes in >20 files for what should be a simple fix

**Prevention strategy:**
- **RULE: Do NOT refactor anything that already works within 72 hours of the demo.**
- **Establish a "code freeze" date** (3 days before demo):
  - Before freeze: feature work, refactoring, experiments OK
  - After freeze: bug fixes only, no structural changes
  - Day before demo: ONLY critical bug fixes, nothing else
- **If you must change something, have tests:**
  - No tests for it? Don't touch it.
  - Have tests? Run them before AND after EVERY change.
- **Use feature flags** for new capabilities so you can disable them if they break:
  ```python
  FEATURES = {
      "new_gan_model": os.getenv("ENABLE_NEW_GAN", "false") == "true",
      "glassmorphism": True,
      "advanced_routing": os.getenv("ENABLE_ADV_ROUTING", "true") == "true",
  }
  ```
- **Keep the old version working.** Branch before major changes. If the new version breaks, you can demo the old one.

**Recovery plan (during demo):**
- `git stash` or `git checkout main` to revert to last known working state.
- Feature flags: disable the broken feature and demo the rest.
- "We implemented X but encountered a compatibility issue — here's the working version of the system with Y and Z features."

---

### 5.2 TensorFlow/Keras Version Mismatch After Upgrade

**What goes wrong:**
You upgrade TensorFlow to fix one bug, and it breaks 5 other things. TF 2.x versions are not fully backward compatible. `tf.keras` vs standalone `keras` imports behave differently. Keras 3 changed APIs (`model.predict()` returns differently, custom training loops changed). NumPy 2.0 broke TensorFlow compatibility.

**Warning signs:**
- `AttributeError: module 'tensorflow' has no attribute 'xxx'`
- `FutureWarning: ... will be removed in a future version`
- Model training produces different results after upgrade (silent behavior change)
- `ImportError: cannot import name 'xxx' from 'keras'`
- NumPy deprecation warnings flooding the console

**Prevention strategy:**
- **Pin the EXACT versions that work together:**
  ```txt
  tensorflow==2.15.0
  keras==2.15.0
  numpy==1.26.4
  scipy==1.12.0
  ```
- **Do NOT upgrade TensorFlow within 2 weeks of the demo** unless absolutely necessary.
- **If you must upgrade, test in a separate branch:**
  ```bash
  git checkout -b test-tf-upgrade
  pip install tensorflow==2.16.0
  python -m pytest tests/
  # Run ALL model training and inference scripts
  # If anything fails, abandon the branch
  ```
- **Use a virtual environment per project.** Never use system Python.
- **Document the working environment:**
  ```bash
  pip freeze > requirements-lock.txt
  python --version > .python-version
  ```
- **Test model loading and inference after any dependency change.** Don't just test imports.

**Recovery plan (during demo):**
- Have the `requirements-lock.txt` from the last working state.
- `pip install -r requirements-lock.txt` — nuclear rollback.
- Have a separate venv with the known-good versions as backup.

---

### 5.3 Breaking Model Artifacts When Changing Serialization

**What goes wrong:**
You change how models are saved (`.h5` → `.keras`, or add custom serialization). Existing saved model files become unloadable. You retrain, but the new model isn't as good as the one you spent 12 hours training last week. Or worse: you change the model architecture slightly and forget to retrain, so the old weights don't align with the new layers.

**Warning signs:**
- `ValueError: Layer weight shape (64, 128) not compatible with provided weight shape (64, 256)`
- Model loads but outputs nan or constant values
- `KeyError` when loading model config — layer names changed
- Model file size is drastically different from expected (incomplete save)

**Prevention strategy:**
- **NEVER delete old model files.** Keep them in a `models/archive/` directory.
- **Version your models:**
  ```
  models/
    gan_v1.keras          # Original
    gan_v2.keras          # After architecture change
    gan_v2_20260215.keras # Date-stamped backup
    rl_agent_v1.weights.h5
  ```
- **Save architecture and weights separately** as an additional backup:
  ```python
  # Save architecture
  with open("model_architecture.json", "w") as f:
      f.write(model.to_json())
  # Save weights
  model.save_weights("model_weights.weights.h5")
  # Save full model
  model.save("model_full.keras")
  ```
- **Verify model after saving:**
  ```python
  # Immediately after saving, load and test
  loaded = tf.keras.models.load_model("model.keras")
  assert np.allclose(model.predict(test_input), loaded.predict(test_input), atol=1e-5)
  ```
- **Use git-lfs or DVC for model files** so you can roll back to previous versions.
- **Checksum your model files:**
  ```python
  import hashlib
  def model_hash(path):
      return hashlib.md5(open(path, 'rb').read()).hexdigest()
  ```
- **If changing architecture: retrain immediately and verify metrics match or exceed the original.**

**Recovery plan (during demo):**
- Load from the archived version: `model = load_model("models/archive/gan_v1.keras")`
- If all model files are broken: rebuild architecture from code and load just the weights.
- Have evaluation results from the working model saved as images/data to show regardless.

---

## Quick Reference: Demo Day Checklist

### 24 Hours Before:
- [ ] Full clean run of the application on the demo machine
- [ ] All models load and produce expected outputs
- [ ] All API endpoints tested (use a test script, not manual clicking)
- [ ] UI renders correctly at 30Hz / low brightness (simulate projector)
- [ ] App works with WiFi disabled (all external data cached)
- [ ] Docker images built and tested (or non-Docker startup verified)
- [ ] Browser cache cleared
- [ ] `requirements-lock.txt` and `package-lock.json` committed
- [ ] Code freeze in effect — NO MORE CHANGES

### 1 Hour Before:
- [ ] Start Docker Desktop (if using Docker)
- [ ] Launch the app and verify all pages load
- [ ] Run through the demo script once, end to end
- [ ] Load pre-trained models and verify outputs
- [ ] Open browser in incognito mode
- [ ] Connect to projector/external display and verify colors/readability
- [ ] Have mobile hotspot ready (charged, with data)
- [ ] Terminal windows arranged and ready

### Emergency Kit:
- [ ] USB drive with full project + dependencies
- [ ] Pre-recorded 3-minute video of the demo (absolute last resort)
- [ ] Screenshots of all key features
- [ ] Backup laptop (if available)
- [ ] Phone hotspot
- [ ] HDMI adapter (own, tested)
- [ ] Power adapter + extension cord

### Recovery Commands Cheat Sheet:
```bash
# Kill port conflict
netstat -ano | findstr :8000
taskkill /PID <pid> /F

# Hard restart backend
cd backend && python -m uvicorn main:app --host 0.0.0.0 --port 8000

# Hard restart frontend
cd frontend && npm start

# Clear browser (in address bar)
chrome://settings/clearBrowserData

# Git rollback to last working state
git stash
git checkout main

# Rebuild and restart Docker
docker-compose down && docker-compose up --build -d

# Check if model loads
python -c "import tensorflow as tf; m = tf.keras.models.load_model('models/gan.keras'); print('OK')"
```

---

*Research compiled for EV Routing project upgrade — focus on practical prevention over theoretical perfection.*
