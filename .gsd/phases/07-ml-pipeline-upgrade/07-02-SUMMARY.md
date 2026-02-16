---
phase: 07-ml-pipeline-upgrade
plan: 02
subsystem: ml
tags: [gnn-config, keras-migration, reward-shaping, convergence-monitoring]
key-files:
  - src/config.py
  - src/gnn_route_generator.py
  - src/environment.py
  - src/q_learning_agent.py
key-decisions:
  - GNN hyperparameters (hidden_dim, num_layers, noise_dim, attention_heads, learning_rate) sourced from config.py
  - GNN Route GAN saves/loads full .keras models instead of .weights.h5
  - Potential-based reward shaping uses shortest-path distance to destination (gamma=0.95, scale=2.0)
  - Charging incentive (+10) when battery_soc < 30% at a charging station
  - Convergence detection via rolling average reward over window of 50 episodes
---

# 07-02 SUMMARY: GNN Config and RL Reward Shaping

## Accomplishments

Made GNN Route GAN hyperparameters configurable via `config.py` and migrated model persistence from `.weights.h5` to full `.keras` format. Added potential-based reward shaping to the RL environment using shortest-path distance-to-goal as potential function, plus a charging incentive for critically low battery. Added convergence monitoring to `QLearningAgent` via rolling average reward tracking.

## Task Commits

| # | Task | Commit | Type |
|---|------|--------|------|
| 1 | GNN configurable hyperparameters and .keras format migration | `3b4b236` | feat |
| 2 | Potential-based reward shaping and convergence monitoring | `4c3c65f` | feat |

## Files Modified

- `src/config.py` — Added `gnn_hidden_dim`, `gnn_num_layers`, `gnn_noise_dim`, `gnn_attention_heads`, `gnn_learning_rate` fields to `EVRoutingSettings`
- `src/gnn_route_generator.py` — Constructor reads config hyperparams; save/load uses `.keras` format
- `src/environment.py` — Added `_potential()` with cached shortest-path distance; potential-based reward shaping in `_step_execute()`; charging incentive (+10) when battery < 30%; cache cleared on reset
- `src/q_learning_agent.py` — Added `reward_history`, `convergence_window`, `convergence_threshold`, `converged` attrs; `update_convergence()` method for rolling average detection
- `models/gnn_gan/gnn_generator.weights.h5` — deleted (replaced by .keras)
- `models/gnn_gan/gnn_discriminator.weights.h5` — deleted (replaced by .keras)
