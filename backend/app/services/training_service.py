"""Training service — runs Q-Learning pipeline over real Hyderabad graph.

SSE events use multiplexed type discriminator (Architectural Override #3):
  - "metric"  → { type:"metric", episode, reward, loss, epsilon }
  - "log"     → { type:"log", timestamp, message }
  - "status"  → { type:"status", phase, progress }
"""

import asyncio
import logging
import os
import pickle
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from backend.app.state import AppState
from backend.app.models.requests import TrainingConfig
from backend.app.config import settings

logger = logging.getLogger("ev_routing")

_executor = ThreadPoolExecutor(max_workers=1, thread_name_prefix="ml-train")

_Q_TABLE_PATH = "models/q_learning/q_table_hyderabad.pkl"


class TrainingService:
    """Manages Q-Learning training lifecycle — runs pipeline in a thread, updates AppState."""

    def __init__(self, state: AppState):
        self.state = state

    async def start_training(self, config: TrainingConfig) -> None:
        if self.state.training_status["is_training"]:
            from fastapi import HTTPException
            raise HTTPException(409, detail={"ok": False, "message": "Training already in progress"})

        self.state.training_status.update({
            "is_training": True,
            "progress": 0,
            "current_step": "Queued",
            "metrics": {},
            "loss_history": [],
            "reward_history": [],
            "rl_episode": 0,
            "rl_total_episodes": 0,
            "sse_events": [],  # multiplexed SSE event buffer
        })

        loop = asyncio.get_running_loop()
        loop.run_in_executor(_executor, self._run_pipeline, config)
        logger.info("Q-Learning training dispatched with config: episodes=%d, lr=%f", config.episodes, config.learning_rate)

    def _emit_sse(self, event: dict) -> None:
        """Push a typed SSE event to the buffer for the stream endpoint to consume."""
        buf = self.state.training_status.get("sse_events")
        if buf is None:
            self.state.training_status["sse_events"] = []
            buf = self.state.training_status["sse_events"]
        buf.append(event)

    def _emit_log(self, message: str) -> None:
        self._emit_sse({
            "type": "log",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "message": message,
        })

    def _emit_status(self, phase: str, progress: float) -> None:
        self._emit_sse({
            "type": "status",
            "phase": phase,
            "progress": round(progress, 2),
        })

    def _emit_metric(self, episode: int, reward: float, loss: float, epsilon: float) -> None:
        self._emit_sse({
            "type": "metric",
            "episode": episode,
            "reward": round(reward, 4),
            "loss": round(loss, 4),
            "epsilon": round(epsilon, 4),
        })

    def _run_pipeline(self, config: TrainingConfig) -> None:
        """Synchronous — runs in ThreadPoolExecutor thread. NOT async."""
        try:
            self.state.training_status["loss_history"] = []
            self.state.training_status["reward_history"] = []

            # --- Step 1: Load graph ---
            self._update(10, "Loading Hyderabad graph")
            self._emit_log("Loading Hyderabad road graph...")
            self._emit_status("loading_graph", 0.10)
            from backend.app.services.graph_service import get_hyderabad_graph
            hgraph = get_hyderabad_graph()
            logger.info("Graph loaded: %d nodes, %d edges", hgraph.num_nodes, hgraph.num_edges)
            self._emit_log(f"Graph loaded: {hgraph.num_nodes} nodes, {hgraph.num_edges} edges")

            # --- Step 2: Load stations ---
            self._update(20, "Loading charging stations")
            self._emit_log("Loading charging stations...")
            self._emit_status("loading_stations", 0.20)
            from backend.app.services.station_service import get_charging_stations, snap_stations_to_graph
            stations = get_charging_stations(settings.OSMNX_CENTER_LAT, settings.OSMNX_CENTER_LON)
            snap_stations_to_graph(stations, hgraph)
            logger.info("Stations loaded: %d", len(stations))
            self._emit_log(f"Stations loaded: {len(stations)} charging stations snapped to graph")

            # --- Step 3: Create environment ---
            self._update(30, "Creating RL environment")
            self._emit_log("Creating Gymnasium RL environment...")
            self._emit_status("creating_env", 0.30)
            from src.hyderabad_environment import HyderabadRoutingEnvironment
            env = HyderabadRoutingEnvironment(
                graph=hgraph,
                max_steps=config.max_steps,
            )

            # --- Step 4: Train Q-Learning ---
            episodes = min(config.episodes, settings.MAX_TRAINING_EPISODES)
            if config.demo_mode:
                episodes = min(episodes, 50)
            self._update(40, f"Training Q-Learning agent ({episodes} episodes)")
            self._emit_log(f"Starting Q-Learning training: {episodes} episodes, lr={config.learning_rate}")
            self._emit_status("training", 0.40)
            self.state.training_status["rl_total_episodes"] = episodes

            from src.q_learning_agent import QLearningAgent
            agent = QLearningAgent(
                state_space=hgraph.num_nodes,
                action_space=env._max_degree,
                learning_rate=config.learning_rate,
                discount_factor=config.discount_factor,
            )

            for ep in range(episodes):
                if not self.state.training_status["is_training"]:
                    logger.info("Training stopped by user at episode %d", ep)
                    self._update(self.state.training_status["progress"], "Stopped by user")
                    self._emit_log(f"Training stopped by user at episode {ep}")
                    return

                state_obs, info = env.reset()
                episode_reward = 0.0
                td_errors = []

                if ep % 10 == 0:
                    self._emit_log(f"Episode {ep + 1}/{episodes}: exploring from node {env.current_node} → {env.destination}")

                for step in range(config.max_steps):
                    neighbors = hgraph.get_neighbors(env.current_node)
                    valid_actions = len(neighbors)

                    if valid_actions == 0:
                        break

                    action = agent.choose_action(state_obs, training=True)
                    action = action % valid_actions  # clamp to valid range

                    next_state, reward, terminated, truncated, step_info = env.step(action)
                    agent.learn(state_obs, action, reward, next_state, terminated or truncated)

                    td_error = abs(reward + config.discount_factor * max(
                        agent.q_table.get(agent._state_to_key(next_state), [0])[:]
                    ) - agent.q_table.get(agent._state_to_key(state_obs), [0])[action % len(agent.q_table.get(agent._state_to_key(state_obs), [0]))])
                    td_errors.append(td_error)

                    episode_reward += reward
                    state_obs = next_state

                    if terminated or truncated:
                        break

                agent.decay_exploration()

                avg_td = sum(td_errors) / max(len(td_errors), 1)
                self.state.training_status["reward_history"].append({
                    "episode": ep,
                    "reward": float(episode_reward),
                    "length": step + 1,
                })
                self.state.training_status["loss_history"].append({
                    "episode": ep,
                    "td_error": float(avg_td),
                })
                self.state.training_status["rl_episode"] = ep + 1

                # Emit multiplexed SSE metric event
                self._emit_metric(ep, float(episode_reward), float(avg_td), float(agent.exploration_rate))

                # Update progress (40% -> 90% during training)
                train_progress = 40 + int((ep / max(episodes, 1)) * 50)
                self._update(train_progress, f"Training: episode {ep + 1}/{episodes}")

                # Periodic status events
                if ep % 5 == 0:
                    self._emit_status("training", train_progress / 100.0)

            self._emit_log(f"Training loop complete: {episodes} episodes finished")

            # --- Step 5: Save Q-table ---
            self._update(95, "Saving Q-table")
            self._emit_log("Saving Q-table to disk...")
            self._emit_status("saving", 0.95)
            os.makedirs(os.path.dirname(_Q_TABLE_PATH), exist_ok=True)
            agent.save_model(_Q_TABLE_PATH)

            # Load Q-table into state for immediate use
            self.state.q_table = dict(agent.q_table)

            # Update graph + stations on state
            self.state.hyderabad_graph = hgraph
            self.state.charging_stations = stations

            # Invalidate caches
            self.state.road_network_cache.clear()
            self.state.system_stats_cache.clear()

            # --- Step 6: Complete ---
            final_rewards = [r["reward"] for r in self.state.training_status["reward_history"][-20:]]
            avg_final_reward = sum(final_rewards) / max(len(final_rewards), 1)

            self.state.training_status["metrics"] = {
                "total_episodes": episodes,
                "final_avg_reward": round(avg_final_reward, 2),
                "q_table_states": len(agent.q_table),
                "exploration_rate": round(agent.exploration_rate, 4),
            }
            self._update(100, "Complete")
            self._emit_log(f"Training complete! Q-table has {len(agent.q_table)} states, avg reward={avg_final_reward:.2f}")
            self._emit_status("complete", 1.0)
            self.state.training_status["is_training"] = False
            self.state.training_status["completed_at"] = datetime.now(timezone.utc).isoformat()

            logger.info("Q-Learning training completed: %d episodes, avg reward=%.2f", episodes, avg_final_reward)

        except Exception as e:
            self.state.training_status["is_training"] = False
            self.state.training_status["current_step"] = f"Error: {str(e)}"
            self._emit_log(f"Training failed: {str(e)}")
            self._emit_status("error", 0)
            logger.error("Training pipeline failed: %s", e, exc_info=True)

    def _update(self, progress: int, step: str) -> None:
        self.state.training_status["progress"] = progress
        self.state.training_status["current_step"] = step

    def stop_training(self) -> None:
        if not self.state.training_status["is_training"]:
            from fastapi import HTTPException
            raise HTTPException(409, detail={"ok": False, "message": "No training is currently running"})
        self.state.training_status["is_training"] = False
        logger.info("Training stop requested")
