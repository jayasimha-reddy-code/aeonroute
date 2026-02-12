# EV Routing System — Installation & Implementation Guide

> **AI-Powered Electric Vehicle Route Optimization** using SG-GAN traffic generation,
> GNN route planning, and Q-Learning reinforcement learning — with a full-stack
> React + FastAPI dashboard.

---

## Table of Contents

1. [Quick Start (5 Minutes)](#-quick-start-5-minutes)
2. [Prerequisites](#-prerequisites)
3. [Backend Setup](#-backend-setup)
4. [Frontend Setup](#-frontend-setup)
5. [Verification Checklist](#-verification-checklist)
6. [Architecture Overview](#-architecture-overview)
7. [API Reference](#-api-reference)
8. [Project Structure](#-project-structure)
9. [How the System Works](#-how-the-system-works)
10. [Configuration](#-configuration)
11. [Development Workflow](#-development-workflow)
12. [Deployment](#-deployment)
13. [Troubleshooting](#-troubleshooting)
14. [FAQ](#-faq)

---

## 🚀 Quick Start (5 Minutes)

### Option 1: Docker (Recommended)

```bash
cd EV_Routing
docker-compose -f docker-compose.ui.yml up
```

Open **http://localhost:5173** in your browser.

### Option 2: Manual Setup (Two Terminals)

**Terminal 1 — Backend:**

```bash
cd EV_Routing
pip install -r requirements.txt
python -m uvicorn backend_api:app --host 127.0.0.1 --port 8000
```

**Terminal 2 — Frontend:**

```bash
cd EV_Routing/frontend
npm install
npm run dev
```

Open **http://localhost:5173** in your browser.

---

## 📋 Prerequisites

| Tool      | Minimum Version | Check Command         |
| --------- | --------------- | --------------------- |
| Python    | 3.8+            | `python --version`    |
| pip       | 21+             | `pip --version`       |
| Node.js   | 18+             | `node --version`      |
| npm       | 9+              | `npm --version`       |

### Install Prerequisites

<details>
<summary><strong>Windows</strong></summary>

1. **Python** — Download from [python.org](https://www.python.org/downloads/).
   ✅ Check **"Add Python to PATH"** during installation.
2. **Node.js** — Download the LTS version from [nodejs.org](https://nodejs.org/).
   npm is bundled with Node.js.
</details>

<details>
<summary><strong>macOS</strong></summary>

```bash
brew install python node
```
</details>

<details>
<summary><strong>Linux (Ubuntu / Debian)</strong></summary>

```bash
sudo apt-get update
sudo apt-get install python3 python3-pip nodejs npm
```
</details>

---

## ⚙️ Backend Setup

### Step 1 — Create a Virtual Environment (Recommended)

```bash
cd EV_Routing

# Windows
python -m venv venv
venv\Scripts\activate

# macOS / Linux
python3 -m venv venv
source venv/bin/activate
```

### Step 2 — Install Python Dependencies

```bash
pip install -r requirements.txt
```

This installs all required packages:

| Package      | Purpose                              |
| ------------ | ------------------------------------ |
| `fastapi`    | REST API framework                   |
| `uvicorn`    | ASGI server                          |
| `tensorflow` | SG-GAN traffic generation & DQN      |
| `networkx`   | Road network graph                   |
| `gymnasium`  | Reinforcement learning environments  |
| `numpy`      | Numerical operations                 |
| `scipy`      | Scientific computing utilities       |
| `matplotlib` | Plot generation                      |
| `pydantic`   | Request/response validation          |

> **Tip:** If `pip install tensorflow` fails, try:
> ```bash
> pip install --upgrade pip setuptools wheel
> pip install tensorflow --user
> ```

### Step 3 — Start the Backend Server

```bash
python -m uvicorn backend_api:app --host 127.0.0.1 --port 8000
```

You should see output like:

```
INFO     EV Routing System initialized
INFO       → 100 nodes, 410 edges, 8 charging stations
INFO     Uvicorn running on http://127.0.0.1:8000
```

> **Important:** Use `python -m uvicorn` instead of just `uvicorn` to avoid
> "command not found" errors on Windows.

### Verify Backend is Running

Open **http://localhost:8000/health** in your browser or run:

```bash
curl http://localhost:8000/health
```

Expected response:

```json
{
  "ok": true,
  "message": "success",
  "data": { "status": "healthy", "version": "2.0.0" }
}
```

---

## 🎨 Frontend Setup

### Step 1 — Install Node Dependencies

```bash
cd EV_Routing/frontend
npm install
```

### Step 2 — Start the Development Server

```bash
npm run dev
```

Output:

```
VITE v5.4.x  ready in 300ms
➜  Local:   http://localhost:5173/
```

### Step 3 — Open the Dashboard

Navigate to **http://localhost:5173** in your browser.

The frontend automatically proxies all `/api/*` requests to the backend at
`http://localhost:8000` (configured in `vite.config.ts`).

---

## ✅ Verification Checklist

After both servers are running, verify each feature:

| # | Feature                      | How to Verify                                                        |
| - | ---------------------------- | -------------------------------------------------------------------- |
| 1 | Backend health               | Visit `http://localhost:8000/health` → `{"ok": true}`                |
| 2 | Frontend loads               | Visit `http://localhost:5173` → Dashboard page appears               |
| 3 | Road network visualization   | Dashboard tab → D3 force-directed graph renders with nodes & edges   |
| 4 | System statistics            | Dashboard tab → Stat cards show nodes, edges, charging stations      |
| 5 | Route planning               | Route Planner tab → Select source/destination → Generate route       |
| 6 | Route comparison             | Route Planner tab → Compare multiple generated routes                |
| 7 | Training controls            | Training tab → Start/stop training, view progress                    |
| 8 | Analytics charts             | Analytics tab → Recharts graphs display route metrics & performance  |
| 9 | Navigation                   | Sidebar → Click between Dashboard, Route Planner, Training, Analytics|
| 10| API connectivity             | Browser DevTools (F12) → Network tab → All API calls return 200     |

---

## 🏗 Architecture Overview

```
┌──────────────────────────────────────────────────────────┐
│                    BROWSER (localhost:5173)               │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────────────┐ │
│  │Dashboard │ │Route     │ │Training  │ │Analytics    │ │
│  │  Page    │ │ Planner  │ │  Page    │ │   Page      │ │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └──────┬──────┘ │
│       │             │            │               │        │
│  ┌────┴─────────────┴────────────┴───────────────┴──────┐ │
│  │  Zustand Store  +  Axios API Client  +  D3/Recharts │ │
│  └──────────────────────┬───────────────────────────────┘ │
└─────────────────────────┼────────────────────────────────┘
                          │  HTTP (Vite proxy /api → :8000)
┌─────────────────────────┼────────────────────────────────┐
│            BACKEND (localhost:8000)                       │
│  ┌──────────────────────┴───────────────────────────────┐ │
│  │              FastAPI  (backend_api.py)                │ │
│  └──┬──────────┬──────────────┬──────────────┬──────────┘ │
│     │          │              │              │             │
│  ┌──┴──┐  ┌───┴────┐  ┌─────┴──────┐  ┌───┴──────────┐  │
│  │Road │  │Route   │  │Traffic     │  │Q-Learning   │  │
│  │Graph│  │Generat.│  │Generator   │  │Agent        │  │
│  │     │  │(GNN)   │  │(SG-GAN)    │  │(RL)         │  │
│  └─────┘  └────────┘  └────────────┘  └─────────────┘  │
│                                                          │
│  Python Modules: src/road_graph.py, src/route_generator. │
│  py, src/traffic_generator.py, src/q_learning_agent.py   │
└──────────────────────────────────────────────────────────┘
```

### Technology Stack

| Layer     | Technology                                       |
| --------- | ------------------------------------------------ |
| Frontend  | React 18, TypeScript, Vite 5, Tailwind CSS 3     |
| Charts    | Recharts 2, D3.js 7                              |
| State     | Zustand                                           |
| HTTP      | Axios                                             |
| UI        | Lucide React icons, custom component library      |
| Backend   | FastAPI, Uvicorn (ASGI)                           |
| ML        | TensorFlow (SG-GAN, DQN), Gymnasium (RL env)     |
| Graph     | NetworkX (road network)                           |
| Data      | NumPy, SciPy                                      |

---

## 📡 API Reference

All responses follow the envelope pattern:

```json
{
  "ok": true,
  "message": "success",
  "data": { ... }
}
```

### Endpoints

| Method | Endpoint                 | Description                                  |
| ------ | -------------------------| -------------------------------------------- |
| GET    | `/health`                | Server health check                          |
| GET    | `/api/road-network`      | Full road network (nodes, edges, stations)   |
| GET    | `/api/system-stats`      | System statistics (counts, model info)       |
| GET    | `/api/route-metrics`     | Route performance metrics & history          |
| GET    | `/api/traffic-patterns`  | Current traffic pattern data                 |
| GET    | `/api/training-status`   | Training progress & status                   |
| POST   | `/api/generate-route`    | Generate an optimized EV route               |
| POST   | `/api/start-training`    | Start model training                         |
| POST   | `/api/stop-training`     | Stop model training                          |
| POST   | `/api/save-route`        | Save a route for later analysis              |

### Example: Generate a Route

```bash
curl -X POST http://localhost:8000/api/generate-route \
  -H "Content-Type: application/json" \
  -d '{"source": 0, "destination": 50, "battery_level": 80, "strategy": "balanced"}'
```

Response:

```json
{
  "ok": true,
  "message": "success",
  "data": {
    "route": [0, 12, 25, 37, 50],
    "total_distance": 42.5,
    "energy_consumed": 35.2,
    "charging_stops": 1,
    "estimated_time": 28.3
  }
}
```

---

## 📊 Project Structure

```
EV_Routing/
│
├── backend_api.py              # FastAPI application (all REST endpoints)
├── requirements.txt            # Python dependencies (core ML + API)
├── requirements-api.txt        # Python dependencies (API-specific pinned versions)
├── docker-compose.ui.yml       # Docker: full stack (frontend + backend)
├── docker-compose.yml          # Docker: backend only
├── pyproject.toml              # Python project metadata
├── Makefile                    # Build shortcuts
├── setup.sh                    # Auto setup script (Linux/Mac)
│
├── src/                        # Python ML & routing modules
│   ├── main.py                 #   System orchestrator (EVRoutingSystem)
│   ├── road_graph.py           #   Road network graph + EV state model
│   ├── route_generator.py      #   Route generation (A*, GNN-based)
│   ├── gnn_route_generator.py  #   Graph Neural Network route planner
│   ├── q_learning_agent.py     #   Q-Learning RL agent
│   ├── traffic_generator.py    #   SG-GAN traffic pattern generator
│   ├── environment.py          #   Gymnasium RL environment
│   ├── evaluate.py             #   Model evaluation & metrics
│   ├── test_environment.py     #   Environment tests
│   └── test_traffic_generation.py  # Traffic generation tests
│
├── frontend/                   # React + TypeScript application
│   ├── index.html              #   HTML entry point
│   ├── package.json            #   Node.js dependencies
│   ├── vite.config.ts          #   Vite config (dev server, proxy)
│   ├── tsconfig.json           #   TypeScript configuration
│   ├── tailwind.config.ts      #   Tailwind CSS configuration
│   ├── postcss.config.js       #   PostCSS configuration
│   └── src/
│       ├── main.tsx            #     React entry point
│       ├── App.tsx             #     Root component + routing
│       ├── index.css           #     Global styles (Tailwind)
│       ├── pages/
│       │   ├── Dashboard.tsx   #       Main dashboard page
│       │   ├── RoutePlanner.tsx#       Route planning interface
│       │   ├── Training.tsx    #       Training controls & progress
│       │   └── Analytics.tsx   #       Charts & performance analytics
│       ├── components/
│       │   ├── Header.tsx      #       Top navigation bar
│       │   ├── Sidebar.tsx     #       Side navigation menu
│       │   ├── PageHeader.tsx  #       Reusable page header component
│       │   ├── StatCard.tsx    #       Statistics display card
│       │   ├── RouteCard.tsx   #       Route result display
│       │   ├── RouteVisualization.tsx    # Route path SVG renderer
│       │   ├── RoadNetworkVisualization.tsx # D3 force graph
│       │   ├── ToastContainer.tsx       # Toast notifications
│       │   └── ui/             #       Reusable UI component library
│       │       ├── index.ts    #         Barrel exports
│       │       ├── Button.tsx  #         Button component
│       │       ├── Card.tsx    #         Card component
│       │       ├── Input.tsx   #         Input component
│       │       ├── Badge.tsx   #         Badge component
│       │       ├── Spinner.tsx #         Loading spinner
│       │       ├── Skeleton.tsx#         Skeleton loader
│       │       ├── ProgressBar.tsx #     Progress bar
│       │       └── EmptyState.tsx  #     Empty state placeholder
│       ├── services/
│       │   └── api.ts          #       Axios API client + interceptors
│       ├── store/
│       │   └── store.ts        #       Zustand global state store
│       ├── hooks/
│       │   └── useApi.ts       #       Custom API hook
│       └── lib/
│           └── utils.ts        #       Utility functions (cn, classNames)
│
├── models/                     # Trained model weights
│   ├── sg_gan/                 #   SG-GAN generator & discriminator
│   ├── gnn_gan/                #   GNN model weights
│   └── q_learning/             #   Q-table data
│
├── data/                       # Training & generated data
│   ├── training_data/          #   Raw training data
│   ├── generated_traffic/      #   GAN-generated traffic patterns
│   └── historical_routes/      #   Saved route history
│
└── results/                    # Evaluation results & plots
    ├── metrics/                #   JSON metrics & NPZ data
    └── plots/                  #   Generated visualization plots
```

---

## 🧠 How the System Works

### 1. Road Network (Graph)

The system models a city road network as a **weighted directed graph** using NetworkX:

- **Nodes** = Intersections (100 nodes in default configuration)
- **Edges** = Roads with attributes: distance, speed limit, traffic level
- **Charging Stations** = Special nodes where EVs can recharge (8 stations)

### 2. Traffic Generation (SG-GAN)

A **Spectral-Graph GAN** generates realistic traffic patterns:

1. **Generator** creates synthetic traffic matrices
2. **Discriminator** distinguishes real vs. synthetic traffic
3. Adversarial training produces realistic, diverse traffic scenarios
4. Generated patterns are used to simulate dynamic road conditions

### 3. Route Planning (GNN + A*)

Routes are generated using a hybrid approach:

1. **Graph Neural Network** learns edge weights from traffic patterns
2. **A\* search** finds optimal paths using learned weights
3. **EV constraints** are applied: battery capacity, charging station locations
4. Multiple strategies available: `fastest`, `shortest`, `energy_efficient`, `balanced`

### 4. Reinforcement Learning (Q-Learning)

A **Q-Learning agent** optimizes routing decisions over time:

1. **State** = (current node, battery level, traffic conditions)
2. **Action** = choose next road segment
3. **Reward** = negative of (energy cost + time penalty + detour penalty)
4. The agent learns optimal policies through episodes of exploration

### 5. Frontend Dashboard

The React dashboard provides:

- **Dashboard** — Real-time system overview with D3 network graph
- **Route Planner** — Interactive route generation with strategy selection
- **Training** — Start/stop ML training with live progress tracking
- **Analytics** — Performance metrics, charts, and route comparison

---

## 🔧 Configuration

### Backend Configuration

Edit `backend_api.py` to change:

```python
# Server settings (at the bottom of the file)
uvicorn.run(app, host="0.0.0.0", port=8000)  # Change port here

# EVRoutingSystem configuration (in startup event)
system = EVRoutingSystem()  # Uses default: grid_size=10 → 100 nodes
```

### Frontend Configuration

The Vite proxy is configured in `frontend/vite.config.ts`:

```typescript
server: {
  proxy: {
    '/api': 'http://localhost:8000',     // Backend API proxy
    '/health': 'http://localhost:8000',  // Health check proxy
  }
}
```

Create `frontend/.env.local` for custom environment variables:

```env
VITE_API_URL=http://localhost:8000
```

### Training Configuration

In `src/main.py`, the `EVRoutingSystem` class accepts configuration:

```python
system = EVRoutingSystem()
# Default parameters:
#   grid_size = 10       → 100-node road network
#   gan_epochs = 100     → SG-GAN training epochs
#   rl_episodes = 500    → Q-Learning training episodes
#   traffic_samples = 500 → Number of traffic patterns to generate
```

---

## 🔄 Development Workflow

### Running Both Servers

You need **two terminals** running simultaneously:

```bash
# Terminal 1: Backend
cd EV_Routing
python -m uvicorn backend_api:app --host 127.0.0.1 --port 8000 --reload

# Terminal 2: Frontend
cd EV_Routing/frontend
npm run dev
```

> The `--reload` flag on uvicorn enables hot-reload when you edit Python files.

### TypeScript Type Checking

```bash
cd frontend
npx tsc --noEmit
```

### Build Frontend for Production

```bash
cd frontend
npm run build
# Output in frontend/dist/
```

### Run Python Tests

```bash
cd EV_Routing
python -m pytest src/test_environment.py
python -m pytest src/test_traffic_generation.py
```

### Run Model Evaluation

```bash
cd EV_Routing
python src/evaluate.py
# Results saved to src/results/metrics/evaluation_results.json
```

---

## 🚀 Deployment

### Production Backend

```bash
# Install production ASGI server
pip install uvicorn[standard]

# Run with workers
uvicorn backend_api:app --host 0.0.0.0 --port 8000 --workers 4
```

### Production Frontend

```bash
cd frontend
npm run build
# Serve the dist/ folder with any static file server (nginx, serve, etc.)
npx serve dist -l 3000
```

### Docker Deployment

```bash
# Full stack
docker-compose -f docker-compose.ui.yml up -d

# Backend only
docker-compose up -d
```

---

## 🐛 Troubleshooting

### "uvicorn is not recognized" / "command not found"

**Cause:** `uvicorn` is not on your system PATH.

**Fix:** Use `python -m uvicorn` instead:

```bash
python -m uvicorn backend_api:app --host 127.0.0.1 --port 8000
```

### "Module not found" errors (Python)

```bash
# Install all dependencies
pip install -r requirements.txt

# If permission errors on Windows, use --user flag
pip install -r requirements.txt --user
```

### "Port 8000 already in use"

```bash
# Windows — find and kill the process
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# macOS / Linux
lsof -i :8000
kill -9 <PID>
```

### Frontend "Cannot find module" or "Failed to resolve import"

```bash
cd frontend
rm -rf node_modules
npm install
```

### Frontend can't reach backend (API errors)

1. Ensure the backend is running: `http://localhost:8000/health`
2. Both servers must be running simultaneously
3. The Vite proxy in `vite.config.ts` must point to `http://localhost:8000`
4. Check browser DevTools → Network tab for failed requests

### TensorFlow installation issues

```bash
# Upgrade pip first
pip install --upgrade pip setuptools wheel

# Install TensorFlow separately
pip install tensorflow --user

# On older systems, try a specific version
pip install tensorflow==2.14.0
```

### "npm: command not found"

- Reinstall Node.js from [nodejs.org](https://nodejs.org/)
- Restart your terminal after installation
- On Windows, ensure Node.js is in your PATH

---

## ❓ FAQ

**Q: Do I need a GPU?**
A: No. TensorFlow runs on CPU by default. GPU support is optional and requires
CUDA installation.

**Q: Can I change the server ports?**
A: Yes. Change the backend port in `backend_api.py` (bottom of file) and update
the proxy in `frontend/vite.config.ts` to match.

**Q: How do I train the models?**
A: Use the Training tab in the dashboard, or run `python src/main.py` from the
command line. Pre-trained model weights are included in `models/`.

**Q: What routing strategies are available?**
A: Four strategies — `fastest` (minimize time), `shortest` (minimize distance),
`energy_efficient` (minimize battery usage), and `balanced` (weighted combination).

**Q: Can I add more nodes to the road network?**
A: Yes. Change `grid_size` in `EVRoutingSystem`. A grid size of N produces
approximately N² nodes.

**Q: How does the API response format work?**
A: All endpoints wrap responses in `{ "ok": true, "message": "success", "data": ... }`.
The frontend Axios interceptor automatically unwraps the `.data` field.

---

## 🎉 You're All Set!

Once both servers are running and the dashboard loads, you can:

1. 📊 **Dashboard** — View the live road network graph and system statistics
2. 🗺️ **Route Planner** — Generate optimized EV routes between any two nodes
3. 🧠 **Training** — Train the SG-GAN and Q-Learning models
4. 📈 **Analytics** — Analyze route performance metrics and trends

Happy routing! 🚗⚡
