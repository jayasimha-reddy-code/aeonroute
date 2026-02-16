"""Training service — runs ML pipeline in ThreadPoolExecutor."""

import asyncio
import logging
from concurrent.futures import ThreadPoolExecutor
from backend.app.state import AppState
from backend.app.models.requests import TrainingConfig
from src.main import EVRoutingSystem

logger = logging.getLogger("ev_routing")

_executor = ThreadPoolExecutor(max_workers=1, thread_name_prefix="ml-train")


class TrainingService:
    """Manages ML training lifecycle — runs pipeline in a thread, updates AppState."""

    def __init__(self, state: AppState):
        self.state = state

    async def start_training(self, config: TrainingConfig) -> None:
        if self.state.training_status["is_training"]:
            from fastapi import HTTPException
            raise HTTPException(409, detail={"ok": False, "message": "Training already in progress"})

        system_config = {
            "grid_size": config.grid_size,
            "max_battery": 100,
            "battery_capacity_kwh": 60,
            "gan_epochs": config.gan_epochs,
            "gan_batch_size": config.gan_batch_size,
            "gnn_epochs": 50,
            "gnn_batch_size": 16,
            "rl_episodes": config.rl_episodes,
            "rl_max_steps": config.rl_max_steps,
            "traffic_samples": config.traffic_samples,
            "historical_routes": 300,
            "seed": 42,
            "model_dir": "models",
            "results_dir": "results",
            "data_dir": "data",
            "use_gnn_gan": True,
        }

        system_config["demo_mode"] = config.demo_mode
        if config.demo_mode:
            system_config["gan_epochs"] = 5
            system_config["rl_episodes"] = 20
            system_config["gnn_epochs"] = 5
            system_config["traffic_samples"] = 50
            system_config["historical_routes"] = 30

        training_system = EVRoutingSystem(system_config)
        self.state.training_status.update({
            "is_training": True,
            "progress": 0,
            "current_step": "Queued",
            "metrics": {},
            "loss_history": [],
            "reward_history": [],
            "gan_epoch": 0,
            "gan_total_epochs": 0,
            "rl_episode": 0,
            "rl_total_episodes": 0,
        })

        loop = asyncio.get_running_loop()
        loop.run_in_executor(_executor, self._run_pipeline, training_system)
        logger.info("Training dispatched to ThreadPoolExecutor with config: %s", config.model_dump())

    def _run_pipeline(self, sys: EVRoutingSystem) -> None:
        """Synchronous — runs in ThreadPoolExecutor thread. NOT async."""
        try:
            # Reset history arrays at pipeline start
            self.state.training_status["loss_history"] = []
            self.state.training_status["reward_history"] = []

            self._update(10, "Creating road network")
            sys.step1_create_road_network()

            if sys.config.get("demo_mode"):
                self._update(15, "Loading model checkpoints (demo mode)")
                try:
                    sys.load_models()
                except Exception:
                    pass  # No checkpoints, train from scratch

            self._update(25, "Generating traffic data")
            traffic_data = sys.step2_generate_traffic_data()

            self._update(40, "Training traffic GAN")

            def on_gan_epoch(epoch, total, losses):
                self.state.training_status["loss_history"].append({
                    "epoch": epoch,
                    "g_loss": float(losses["g_loss"]),
                    "d_loss_real": float(losses["d_loss_real"]),
                    "d_loss_fake": float(losses["d_loss_fake"]),
                })
                self.state.training_status["gan_epoch"] = epoch
                self.state.training_status["gan_total_epochs"] = total

            sys.step3_train_gan(traffic_data, epoch_callback=on_gan_epoch)

            self._update(55, "Creating RL environment")
            sys.step4_create_environment()

            if not self.state.training_status["is_training"]:
                self._update(self.state.training_status["progress"], "Stopped by user")
                logger.info("Training stopped by user after environment creation")
                return

            self._update(75, "Training Q-Learning agent")

            def on_rl_episode(episode, total, reward, length):
                self.state.training_status["reward_history"].append({
                    "episode": episode,
                    "reward": float(reward),
                    "length": int(length),
                })
                self.state.training_status["rl_episode"] = episode
                self.state.training_status["rl_total_episodes"] = total

            sys.step5_train_agent(episode_callback=on_rl_episode)

            self._update(85, "Creating route generator")
            sys.step6_create_route_generator()

            self._update(95, "Evaluating system")
            results = sys.step7_evaluate_system()
            self.state.training_status["metrics"] = results

            self._update(100, "Complete")
            self.state.training_status["is_training"] = False

            # Atomic swap
            self.state.system = sys

            # Invalidate caches after training
            self.state.road_network_cache.clear()
            self.state.system_stats_cache.clear()

            logger.info("Training pipeline completed successfully")

        except Exception as e:
            self.state.training_status["is_training"] = False
            self.state.training_status["current_step"] = f"Error: {str(e)}"
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
