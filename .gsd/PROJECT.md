# EV Routing System

## What This Is

An AI-powered Electric Vehicle route optimization system combining SG-GAN traffic generation, GNN-based route planning, and Q-Learning reinforcement learning — with a full-stack React + FastAPI dashboard. Built as a university major/minor project, designed to be the most impressive demo in the room.

## Core Value

When an evaluator sees this app, they immediately understand this is production-grade AI engineering — the route planner works live, the ML training is visible, and every interaction feels polished and intentional.

## Requirements

### Validated

<!-- Shipped and confirmed valuable — inferred from existing codebase. -->

- ✓ Road network graph model with grid topology, edge costs, charging stations — existing
- ✓ SG-GAN traffic pattern generation (Generator + Discriminator) — existing
- ✓ GNN Route GAN for candidate route generation — existing
- ✓ Q-Learning + DQN reinforcement learning agent — existing
- ✓ Gymnasium-compatible RL environment (graph-based + legacy grid-based) — existing
- ✓ Classical route generation (shortest, energy-optimal, time-optimal, via-charging) — existing
- ✓ 7-step ML training pipeline orchestrator (CLI + API) — existing
- ✓ FastAPI REST API with 10 endpoints, CORS, rate limiting, structured logging — existing
- ✓ React SPA with Dashboard, Route Planner, Training, Analytics pages — existing
- ✓ Leaflet map visualization of road network — existing
- ✓ Zustand state management with persistence — existing
- ✓ Docker Compose setup for dev stack — existing

### Active

<!-- Current scope — building toward these for v1 presentation. -->

**Stability & Quality:**
- [ ] All Python tests pass reliably on Windows (fix asyncio crash)
- [ ] All TypeScript compiles with zero errors (strict mode)
- [ ] All Vitest unit tests pass
- [ ] All Playwright E2E tests pass
- [ ] Consolidate duplicate data/models/results directories
- [ ] Fix global mutable state in API (dependency injection)
- [ ] Proper input validation on all API endpoints
- [ ] CI-ready test suite (pytest + vitest + tsc)

**UI Overhaul — Glassmorphism + Apple-level Animations:**
- [ ] New design system: frosted glass cards, soft gradients, light/dark toggle
- [ ] Spring-physics page transitions (Framer Motion)
- [ ] Dashboard: animated stat cards, pulsing network nodes, live traffic heatmap
- [ ] Route Planner: click-to-select on map, animated route drawing, energy/time/charging breakdown
- [ ] Route comparison: 2-3 alternatives displayed side-by-side
- [ ] Training page: real-time animated charts during ML training, progress animations
- [ ] Analytics: rich interactive Recharts with smooth transitions, traffic pattern viz
- [ ] Responsive design: works on presentation projector + laptop
- [ ] Loading states, skeleton screens, micro-interactions on every control

**Backend Architecture:**
- [ ] Eliminate hardcoded paths, use configuration
- [ ] Proper error handling with meaningful error messages
- [ ] Request retry logic and offline detection on frontend
- [ ] API authentication (at minimum API key for training endpoints)
- [ ] Environment variable validation with .env.example

**ML Model Improvements:**
- [ ] Improve SG-GAN training stability and traffic pattern quality
- [ ] Better GNN route accuracy with hyperparameter tuning
- [ ] Improved Q-Learning convergence and reward shaping
- [ ] Comprehensive evaluation metrics with visual reports
- [ ] Model versioning (save/load different training runs)

**New Capabilities:**
- [ ] Multi-stop routing (waypoints)
- [ ] Charging station optimization (find optimal charging stops)
- [ ] Live simulation mode: animated EV moving along planned route
- [ ] Real-time traffic pattern switching (time-of-day simulation)
- [ ] Route export/sharing

### Out of Scope

- Real external traffic APIs (TOMTOM, HERE) — synthetic data is the point; this is an ML project
- User authentication/accounts — single-user demo application
- Mobile app — web-only, optimized for presentation on projector
- Payment/billing — not a commercial product
- Multi-vehicle fleet routing — single EV focus
- Production deployment (AWS/GCP) — runs locally or via Docker for demo

## Context

This is a **brownfield upgrade** of an existing working prototype. The codebase has:
- ~6,000 lines of Python ML code across 8 modules
- ~2,000 lines of React/TypeScript frontend
- ~660 lines FastAPI backend
- Existing trained models (SG-GAN, GNN, Q-Learning)
- Known issues: Windows test crashes, TypeScript errors, duplicate directories, global state

The project will be **presented and evaluated** by university professors. The demo needs to:
1. Look visually stunning (glassmorphism, animations)
2. Work flawlessly live (no errors, fast responses)
3. Show real ML happening (training visualization, model metrics)
4. Demonstrate engineering quality (clean architecture, tests passing)

Existing codebase map: `.gsd/codebase/` (7 documents, 1,471 lines of analysis)

## Constraints

- **Tech Stack**: Python + FastAPI backend, React + TypeScript + Tailwind frontend — already established, no framework changes
- **ML Frameworks**: TensorFlow/Keras for GANs, NetworkX for graphs, Gymnasium for RL — existing model code, not rewriting from scratch
- **Presentation**: Must demo live — needs to work on a single laptop, no cloud dependencies
- **Data**: Synthetic/generated data only — no external API keys required for core functionality
- **Browser**: Modern browsers (Chrome/Edge) — no IE/Safari legacy support needed

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Glassmorphism + spring animations for UI | University presentation needs visual impact; evaluators form impressions in first 10 seconds | — Pending |
| Framer Motion for animations | Industry standard React animation library, spring physics feel natural | — Pending |
| Fix architecture before adding features | Bugs and global state will compound if features are layered on top | — Pending |
| Keep synthetic data (no external APIs) | This is an ML project — the AI models *are* the product, not the data source | — Pending |
| Consolidate to root-level data/models dirs | Eliminate confusion from duplicate directories, single source of truth | — Pending |

---

_Last updated: 2026-02-16 after initialization_
