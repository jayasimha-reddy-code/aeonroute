---
phase: 07-ml-pipeline-upgrade
plan: 03
subsystem: [backend, ml]
tags: [demo-mode, training, checkpoints, fine-tuning]
key-files:
  - backend/app/models/requests.py
  - backend/app/services/training_service.py
  - src/main.py
key-decisions:
  - Demo mode overrides gan_epochs=5, rl_episodes=20, gnn_epochs=5, traffic_samples=50, historical_routes=30
  - Checkpoint loading in _run_pipeline happens after road network creation, before traffic generation
  - Failed checkpoint load silently falls through to train-from-scratch
---

# 07-03 SUMMARY — Demo-Mode Training

## Accomplishments

- Added `demo_mode: bool` field to `TrainingConfig` Pydantic model for API-level control
- Wired demo_mode through `start_training()` to override epoch/sample counts for fast training (~5-10 epochs)
- Added checkpoint loading step in `_run_pipeline()` that attempts to load pre-trained models when demo_mode is active
- Added `is_demo_mode` property to `EVRoutingSystem` for clean config access
- Added demo mode logging at `run_full_pipeline()` start showing reduced hyperparameters
- Verified `load_models()` already handles missing files gracefully (no changes needed)

## Task Commits

| # | Commit | Description |
|---|--------|-------------|
| 1 | `fb471f7` | feat(07-03): add demo_mode to TrainingConfig and training service |
| 2 | `32490c0` | feat(07-03): add demo support to EVRoutingSystem |

## Files Modified

- `backend/app/models/requests.py` — Added `demo_mode` field to `TrainingConfig`
- `backend/app/services/training_service.py` — Demo mode config overrides + checkpoint loading in pipeline
- `src/main.py` — `is_demo_mode` property + demo mode logging in `run_full_pipeline`
